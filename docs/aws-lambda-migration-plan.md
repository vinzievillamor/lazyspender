# Migrate backend from GCP Cloud Run to AWS API Gateway + Lambda

## Context

The backend (`backend/`, Spring Boot 3 / Java 21) currently deploys to Cloud Run with no `--min-instances`, so it scales to zero when idle — the frontend already works around the resulting cold starts with dedicated UX (`useServerWarmup.ts`, `ServerWarmupGate.tsx`, `health.service.ts`). This migration moves compute onto AWS at the lowest sustainable cost — for a personal finance app with 2 low-traffic users, cost dominates every decision below.

**This plan supersedes an earlier ECS EC2 plan**, which chose an always-on instance specifically to eliminate cold starts (~$8-10/mo, plus owning OS patching). Revisited against actual traffic, that tradeoff doesn't pay for itself: the app already tolerates Cloud Run's cold starts today. **API Gateway + Lambda** reintroduces cold starts (mitigated via SnapStart, not eliminated) but drops compute cost to near-$0 via Lambda's perpetual free tier, and removes the patching burden entirely.

**Confirmed decisions:**
- Compute only; Firestore stays on GCP for now, migrating separately (see `aws-sql-migration-plan.md`).
- Firestore auth from AWS: a scoped GCP service-account key stored in AWS Systems Manager Parameter Store (SecureString, free tier — not Secrets Manager, which charges per secret) and decoded via `spring.cloud.gcp.credentials.encoded-key`. Not building Workload Identity Federation since this bridge is short-lived — it goes away once the DB migration lands.
- Accept reintroducing cold starts (same category the app already has on Cloud Run) in exchange for near-$0 compute cost.

## Rejected compute alternatives

- **ECS Express Mode**: the auto-provisioned ALB alone runs ~$17-19/mo of an ~$28-32/mo total. Rejected on cost.
- **AWS App Runner**: avoids the ALB but rejected on roadmap/deprecation concerns.
- **ECS Managed Instances**: flat $14.60/mo management fee per instance regardless of size, and likely still needs an ALB for a stable endpoint. Rejected.
- **ECS EC2, self-managed** (the superseded plan): cheapest ECS option (~$8-10/mo) and does eliminate cold starts, but that always-on cost isn't worth it for a 2-user app that already tolerates Cloud Run's cold starts, plus it carries an ongoing OS-patching chore Lambda removes entirely.
- **Lambda with a container image**: rejected because SnapStart — needed to keep JVM/Spring cold starts tolerable — only works with the zip-based managed Java runtime, not container-image Lambdas.
- **Lambda with provisioned concurrency**: eliminates cold starts outright but is billed for reserved capacity whether invoked or not, reintroducing an always-on-shaped cost. Kept as a fallback only if measured SnapStart latency proves unacceptable.
- **Chosen**: API Gateway (HTTP API) + Lambda, Java 21 managed runtime (arm64/Graviton2), zip-packaged (not container image, so SnapStart applies), with the existing Spring MVC app adapted via `aws-serverless-java-container-springboot3`.

## Target AWS setup

- **Application**: a thin `LambdaHandler` adapter wraps the existing Spring app via `aws-serverless-java-container-springboot3` — no changes to controllers/services/`SecurityConfig`. A SnapStart hook drives one throwaway request during snapshot build so lazy Spring init happens then, not on the first real request. Packaged as a shaded/fat jar (Lambda's managed runtime needs a plain jar, not the Spring Boot executable-jar launcher).
- **IAM**: one Lambda execution role (`AWSLambdaBasicExecutionRole` + inline policy scoped to the two secret/parameter ARNs) — no execution/task-role split like ECS.
- **Lambda function**: Java 21 managed runtime, arm64/Graviton2, 1024 MB starting memory (more memory ⇒ more CPU ⇒ often net-cheaper/faster cold starts for JVM — tune after measuring), 29s timeout (API Gateway's HTTP API integration cap), SnapStart enabled on published versions (never `$LATEST`, which shapes the deploy flow).
- **API Gateway**: HTTP API (cheaper than REST API; no need for request validators/API keys/usage plans), single catch-all proxy route to the function's `live` alias. CORS stays in Spring's `WebConfig` only, not duplicated at the gateway. **Custom domain**: `api.zirchel.com`, a regional API Gateway custom domain mapping backed by a regional ACM certificate in `us-east-1` (matching the API's own deployment region — a coincidental match with the frontend plan's CloudFront cert, which is pinned to `us-east-1` for an unrelated reason). DNS-validated the same way as the frontend's cert: the validation CNAME and the domain-mapping CNAME are added by hand at the existing registrar rather than migrating the zone to Route 53 — see `aws-static-hosting-migration-plan.md`'s "Custom domain"/"Rejected alternatives," which applies identically here. This still drops the superseded ECS plan's Elastic IP + Caddy sidecar entirely — the regional ACM cert here is lightweight, not a replacement for that.

### Interim Firestore credential

A Datastore-only-scoped GCP service-account key, stored as an SSM Parameter Store SecureString alongside `JWT_SECRET`, fetched once on cold start and cached in static fields (SnapStart restores resume from the post-init snapshot, so no per-invocation refetch). Throwaway plumbing — removed once the DB migration lands.

### CI/CD

GitHub OIDC (no static AWS keys), build the shaded jar, publish a new Lambda version, then shift the `live` alias to it — mirrors the existing WIF-style, no-static-keys pattern.

## Cold starts (the key tradeoff vs. the superseded ECS plan)

This is the one regression relative to the superseded always-on ECS plan. **The frontend's cold-start UX stays load-bearing** — `useServerWarmup.ts`, `ServerWarmupGate.tsx`, `health.service.ts` are not a cleanup candidate here, the opposite conclusion from the superseded plan. SnapStart shortens cold starts (resuming from a post-init checkpoint) but doesn't eliminate them; measure actual latency after implementation, and only reach for provisioned concurrency if that proves unacceptable.

**Patching tradeoff**: none — fully-managed runtime, no EC2/OS/ECS-agent patching, a strict improvement over the superseded ECS plan.

## Cutover

Stand up and verify the AWS service independently (health check, Firestore read/write cross-cloud) first using API Gateway's default `execute-api` URL, then add the custom domain mapping and confirm `https://api.zirchel.com` serves identically. Point `frontend/.env`'s `API_BASE_URL` at `https://api.zirchel.com`, leaving Cloud Run running for a rollback window before decommissioning it and the Artifact Registry repo.

## Rough monthly cost estimate (us-east-1, personal-scale traffic)

| Item | Estimate |
|---|---|
| Lambda compute | $0 (within perpetual free tier) |
| API Gateway (HTTP API) | $0 for 12 months, then negligible at this traffic |
| CloudWatch Logs | ~$1/mo |
| Secrets (SSM Parameter Store) | $0 |
| ACM certificate | $0 (DNS-validated regional cert for `api.zirchel.com`) |
| Data transfer out | ~$0-1/mo |
| **Total** | **~$1-2/mo** |

Meaningfully cheaper than the superseded ECS plan's ~$8-10/mo, at the cost of reintroducing (mitigated) cold starts.
