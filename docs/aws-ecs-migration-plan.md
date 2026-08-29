# Migrate backend from GCP Cloud Run to AWS Lambda + API Gateway

## Context

The backend (`backend/`, Spring Boot 3 / Java 21) currently deploys to Cloud Run with no `--min-instances` flag, so it scales to zero when idle. Every cold start pays for both a new Cloud Run instance spinning up and the JVM/Spring context bootstrapping, which the frontend already works around with dedicated UX (`useServerWarmup.ts`, `ServerWarmupGate.tsx`, `health.service.ts` — a "waking up the server" spinner). The goal of this migration is to move compute onto AWS (ahead of/alongside the separate database migration) at the lowest sustainable cost — for a personal finance app with 2 low-traffic users and a strict budget, cost dominates every decision below.

**Confirmed decisions:**
- Compute only; Firestore stays on GCP for now, migrating separately later (see `aws-sql-migration-plan.md`).
- Firestore auth from AWS: a scoped GCP service account JSON key stored in AWS Secrets Manager, decoded at runtime via `spring.cloud.gcp.credentials.encoded-key`. Not building WIF since this bridge is short-lived.
- **API Gateway HTTP API** (v2), not REST API (v1) — ~70% cheaper per request ($1.00/million vs $3.50/million) and has everything needed here (Lambda proxy integration, custom domain, ACM cert); REST API's extra features (usage plans, API keys, request validation, WAF integration) aren't needed for a single-owner personal API.
- **Lambda's managed Java 21 runtime with SnapStart**, not a container image — SnapStart (which snapshots the JVM/Spring context after init and restores from it on cold start, cutting a multi-second Spring Boot cold start to roughly 0.5-2s) only applies to the managed runtime's published versions, not container-image-packaged functions. This means the existing `Dockerfile`/Alpine multi-stage build goes away for this path; the build instead produces a deployable jar.
- **One Lambda function fronting the whole existing Spring MVC app** (a "Lambdalith"), via `aws-serverless-java-container-springboot3`, not one function per endpoint. See "Architecture note" below for why per-endpoint decomposition doesn't pay for itself here.
- **No Provisioned Concurrency.** It would keep an instance warm 24/7 for a steady fee (~$5-10/mo), eroding most of the cost advantage. Cold starts are reduced (not eliminated) by SnapStart, and the frontend's existing warmup UX already tolerates them gracefully — it was built for exactly this situation, just against Cloud Run's cold starts instead of Lambda's.

### Rejected compute alternatives

- **ECS Express Mode** (Fargate with an auto-provisioned Application Load Balancer): the ALB alone runs ~$17-19/mo of an ~$28-32/mo total — Fargate compute itself is only ~$9/mo. Rejected purely on cost; the ALB isn't optional in Express Mode.
- **AWS App Runner**: avoids the ALB (~$4-8/mo) but rejected due to roadmap/deprecation concerns.
- **AWS Lambda without SnapStart / on a container image**: was the original framing this plan rejected — multi-second cold starts on every invocation for a low-traffic app is a worse regression than Cloud Run's own cold starts. SnapStart on the managed runtime resolves this; see above.
- **ECS EC2 launch type, self-managed capacity** (previously the chosen direction in this doc): one small EC2 instance registered as ECS capacity, a Caddy sidecar for TLS, an Elastic IP for a stable address — no ALB required, ~$8-10/mo. Rejected on reflection: the doc's own numbers showed this landed in the same cost ballpark as a trivial `--min-instances=1` tweak to Cloud Run, while adding real, ongoing operational weight — OS patching, ECS agent/systemd upkeep, a hand-rolled TLS sidecar, and manual single-instance recovery. That complexity bought cloud consolidation, not a materially better price, so it didn't hold up once cheaper *and* lower-effort options were on the table.
- **ECS Fargate Spot + ALB**: Spot pricing cuts compute to ~$5-6/mo, but the ALB's flat ~$16-19/mo hourly reservation fee is unrelated to traffic and has no free tier or reserved-pricing discount — total still lands at ~$24-27/mo. Rejected on cost; Spot only ever discounted the smaller half of that bill.
- **ECS Fargate Spot + directly-assigned public IP + Elastic IP auto-reattachment** (EventBridge rule + Lambda re-associating a persistent EIP onto the task's ENI on every replacement, avoiding the ALB): got cost down to ~$7-9/mo, comparable to plain Lambda, but added a standing piece of infrastructure (the reattachment Lambda + EventBridge rule) purely to work around Fargate's ephemeral task IPs — rejected as unnecessary operational overhead once Lambda + API Gateway (which needs no such glue at all) was on the table.
- **Chosen: AWS Lambda (Java 21 managed runtime, SnapStart) + API Gateway (HTTP API).** Cost is ~$1-3/mo thanks to Lambda's perpetual free tier (1M requests + 400K GB-seconds/month, not a 12-month intro offer) and API Gateway HTTP API's negligible per-request cost at this traffic volume — an order of magnitude cheaper than every alternative above, with less operational surface than any of them (no host, no container orchestration, no load balancer, no sidecar, nothing to patch).

## Current Cloud Run setup (from `.github/workflows/backend-deploy.yml`)

```
--memory=512Mi --cpu=1 --concurrency=80 --timeout=300 --max-instances=3 --allow-unauthenticated
```
No `--min-instances` (defaults to 0). Deploys via Workload Identity Federation (no static GCP key in CI). Runtime identity is the default Compute Engine service account (ADC) — this is what currently grants Firestore access for free, and is exactly what breaks once compute leaves GCP.

Key facts that shape the target setup:
- Health check: default Spring Boot Actuator, `/actuator/health`, publicly permitted in `SecurityConfig`. Frontend's `health.service.ts` polls this same path — reuse it as the post-deploy verification check (Lambda has no container-level health check the way ECS does; API Gateway simply routes to it like any other path).
- No JVM heap flags (`java -jar app.jar` only) today — under Lambda, memory (and proportional CPU) come from the function's configured memory size instead of a container memory limit; no code change needed here.
- Secrets today (`JWT_SECRET`, `GOOGLE_CLIENT_ID`) are written to a plaintext YAML file and passed via `--env-vars-file`. This migration is a natural point to move `JWT_SECRET` (and the new GCP key) into AWS Secrets Manager instead of continuing the plaintext-file pattern.
- The `Dockerfile` (multi-stage Alpine build) and the arm64/Graviton platform question from the earlier ECS-based drafts of this plan are no longer relevant — Lambda's managed Java runtime needs a deployable jar, not a container image, so the Dockerfile is retired for this path (Cloud Run keeps using it until cutover/decommission).

## Target AWS setup

### 1. Application changes (the adapter layer)
- Add the `aws-serverless-java-container-springboot3` dependency.
- Add one new class: a `RequestStreamHandler` implementation wrapping `SpringBootLambdaContainerHandler`, which forwards API Gateway proxy events into the existing Spring app's `DispatcherServlet`. This is the only new production code — every existing controller, service, repository, and mapper is untouched.
- Change the Gradle build to produce a Lambda-deployable (shaded/fat) jar instead of building the Docker image.

### 2. IAM roles
- **Lambda execution role**: write to CloudWatch Logs, read the two Secrets Manager secrets (scoped to their specific ARNs). Nothing else — no ECR, no ECS task/execution role split needed.

### 3. Interim Firestore credential
- Same as every prior draft of this plan: a new GCP service account scoped to Datastore-only access, JSON key stored as an AWS Secrets Manager secret (e.g. `lazyspender/gcp-datastore-credentials`), decoded via `spring.cloud.gcp.credentials.encoded-key=${GCP_CREDENTIALS_ENCODED_KEY}`.
- Fetch secrets at cold start via the AWS SDK; consider the Secrets Manager Lambda extension (a local caching layer) if repeated fetches become a latency/cost concern — unlikely to matter at this traffic volume.
- Same throwaway-plumbing caveat as before: once the separate DB migration to AWS lands, this credential and the `spring-cloud-gcp-starter-data-datastore` dependency go away entirely.

### 4. Lambda function configuration
- Runtime: `java21` managed runtime.
- Memory: start at 1024MB (affects both RAM and proportional CPU allocation — a bigger function is often *cheaper* than a smaller one for spiky workloads because it finishes faster per invocation); tune down after measuring actual cold/warm invocation duration.
- **SnapStart: `PublishedVersions` mode.** SnapStart only takes effect on published versions, not `$LATEST` — the deploy step must publish a version and update the alias/integration to point at it.
- Timeout: 30s, matching API Gateway's hard integration timeout ceiling (no benefit to configuring Lambda higher).
- No VPC attachment — Firestore is reached over its public HTTPS API, so there's no need to pay the ENI-attachment cold-start tax that VPC-attached Lambdas incur for no benefit here.
- Env vars: `GOOGLE_CLIENT_ID` (plaintext, matches current); `JWT_SECRET` and `GCP_CREDENTIALS_ENCODED_KEY` sourced from Secrets Manager.

### 5. API Gateway
- **HTTP API** (v2) with a single `{proxy+}` catch-all route → the one Lambda function, so all existing Spring MVC routes (`/api/transactions`, `/api/planned-payments`, etc.) keep working unchanged.
- **Custom domain name + a regional ACM certificate** for a stable public hostname — API Gateway manages certificate renewal; no Caddy sidecar or manual cert handling needed anywhere in this design.
- Route 53 (or whatever DNS provider is in use): a single record pointing at the API Gateway custom domain's regional endpoint.

### 6. CI/CD (`.github/workflows/backend-deploy.yml`)
Replace the GCP-auth-and-deploy job with:
- `aws-actions/configure-aws-credentials` using GitHub OIDC (mirrors the existing WIF pattern — no static AWS keys in CI).
- `./gradlew bootJar` (or a shadow/shaded jar target including `aws-serverless-java-container-springboot3`) instead of `docker build`.
- Upload the jar and run `aws lambda update-function-code` (or a SAM/CDK/Terraform deploy, if one of those is adopted for this), then publish a new version so SnapStart applies to it.
- Keep the existing `build-test` job (`./gradlew build`) as-is — it's cloud-agnostic.

### Patching / maintenance tradeoff
None — this is the one meaningful advantage over every EC2- or Fargate-based draft of this plan: Lambda is fully managed, so there's no OS, container runtime, or orchestration agent for the operator to patch or babysit at any point.

## Architecture note: why one Lambda (a "Lambdalith"), not one function per endpoint

The common serverless guideline of "one function per capability" is aimed at systems where independent scaling, independent deployment/rollback, and independent least-privilege IAM *per business capability* pay for themselves — e.g., splitting a notifications function (needs SES access) from an order-processing function (needs a different data store's write access) so a bug or a permission change in one can't touch the other.

None of that applies here: this is one owner, one Spring Boot app, one deployment cadence, and every endpoint needs the same permission (owner-scoped Firestore access via the same interim credential). There's no security boundary or independent-scaling need to gain by splitting `TransactionController` from `PlannedPaymentController` into separate functions — they'd deploy together anyway (same repo, same PR) and see the same low, uniform traffic.

Fronting the whole existing app with one Lambda via `aws-serverless-java-container-springboot3` is AWS's own recognized pattern for lifting an existing framework-based monolith onto Lambda without a full serverless rewrite (the same shape as `aws-lambda-web-adapter` for other frameworks). The honest cost of this choice: a cold start initializes the *entire* Spring context, even though a given request only touches one endpoint. True per-endpoint decomposition would shrink that, but only by either extracting each controller's dependency graph into a separate deployable unit (giving up the shared DI container) or rewriting the web layer around Spring Cloud Function's `Function<In,Out>` beans instead of `@RestController`s — both disproportionate rewrites for a handful of REST resources behind one domain model at this traffic level.

## Cutover
- Stand up the Lambda function + API Gateway fully and verify independently (hit the custom domain's `/actuator/health`, confirm Firestore reads/writes work cross-cloud) **before** touching the frontend or deleting anything on GCP.
- Update `frontend/.env`: `API_BASE_URL` from `https://lazyspender-api-272563214847.us-east1.run.app` to the new API Gateway custom domain.
- Leave the Cloud Run service running (don't delete) for a rollback window — reverting is just reverting the `API_BASE_URL` env var and redeploying the frontend.
- The frontend's cold-start UX (`ServerWarmupGate`, `useServerWarmup`, `health.service.ts`) stays in place and keeps doing real work here — Lambda cold starts (reduced, not eliminated, by SnapStart) still occur for a low, sporadic traffic pattern, so this UX isn't dead code the way it would have been under an always-on ECS/EC2 design.
- Once confidence is established, decommission the Cloud Run service, Artifact Registry repo, and the backend's `Dockerfile`.

## Rough monthly cost estimate (1M+ perpetual free tier covers this app's volume)

| Item | Estimate |
|---|---|
| Lambda compute (requests + GB-seconds, perpetual free tier) | ~$0 |
| API Gateway HTTP API (well under 1M requests/mo) | ~$0-0.10/mo |
| SnapStart restore charges | ~$0.10-1/mo |
| CloudWatch Logs (ingestion + storage, low volume) | ~$0.50-1/mo |
| Secrets Manager (2 secrets) | ~$0.80/mo |
| Route 53 hosted zone (if not already owned for this domain) | ~$0.50/mo |
| **Total** | **~$1-3/mo** |

No EC2 instance, no ALB/NLB, no container registry, no sidecar, no Elastic IP — every cost line item here is fully managed and usage-metered.

## Verification
- After the function + API Gateway are up: `curl` the custom domain's `/actuator/health` and confirm `{"status":"UP"}`, and confirm the ACM certificate is valid (no browser TLS warning).
- Exercise a couple of real endpoints (e.g. list transactions for the hardcoded owner `villamorvinzie`) to confirm the interim Firestore credential works cross-cloud.
- Check CloudWatch Logs for the function to confirm no startup errors (particularly around GCP credential loading) and to observe actual cold-start duration with SnapStart enabled.
- Deliberately hit the API after an idle period to confirm the frontend's warmup UX still triggers sensibly against Lambda's cold-start behavior (timing will differ from Cloud Run's).
- Only after the above, switch `frontend/.env` `API_BASE_URL` and verify the deployed frontend against the new backend end-to-end (login, load dashboard, create a transaction) before decommissioning Cloud Run.
