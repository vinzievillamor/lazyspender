# Migrate backend from GCP Cloud Run to AWS API Gateway + Lambda

## Context

The backend (`backend/`, Spring Boot 3 / Java 21) currently deploys to Cloud Run with no `--min-instances` flag, so it scales to zero when idle. Every cold start pays for both a new Cloud Run instance spinning up and the JVM/Spring context bootstrapping, which the frontend already works around with dedicated UX (`useServerWarmup.ts`, `ServerWarmupGate.tsx`, `health.service.ts` — a "waking up the server" spinner). The goal of this migration is to move compute onto AWS (ahead of/alongside the separate database migration) at the lowest sustainable cost — for a personal finance app with 2 low-traffic users and a strict budget, cost dominates every decision below.

**This plan supersedes the earlier ECS EC2 plan** (previously `docs/aws-ecs-migration-plan.md`, this file). That plan chose an always-on EC2 instance specifically to eliminate cold starts, at a cost of ~$8-10/mo plus owning OS patching on a self-managed box. Revisiting it against actual traffic (2 users, sporadic use) shows that tradeoff doesn't pay for itself: the app already tolerates Cloud Run's cold starts today, so paying ~$8-10/mo to remove a cost the users already live with isn't worth it. **API Gateway + Lambda** reintroduces cold starts (mitigated, not eliminated, via SnapStart) but drops compute cost to effectively $0 via Lambda's perpetual free tier, and removes the self-managed-EC2 patching burden entirely.

**Confirmed decisions:**
- Compute only; Firestore stays on GCP for now, migrating separately later (see `aws-sql-migration-plan.md`).
- Firestore auth from AWS: a scoped GCP service account JSON key, decoded at runtime via `spring.cloud.gcp.credentials.encoded-key`. Not building WIF since this bridge is short-lived.
- Accept reintroducing cold starts (same category the app already has on Cloud Run today) in exchange for near-$0 compute cost — the opposite tradeoff from the superseded ECS plan.

### Rejected compute alternatives

- **ECS Express Mode** (Fargate with an auto-provisioned Application Load Balancer): the ALB alone runs ~$17-19/mo of an ~$28-32/mo total — Fargate compute itself is only ~$9/mo. Rejected purely on cost; the ALB isn't optional in Express Mode.
- **AWS App Runner**: avoids the ALB (~$4-8/mo) but rejected due to roadmap/deprecation concerns.
- **ECS Managed Instances** (AWS's Sept 2025 feature): charges a flat $0.02/hr ($14.60/mo) management fee per instance on top of EC2 cost, regardless of instance size, and doesn't clearly support attaching a stable Elastic IP directly to a managed instance (AWS can replace it for patching) — so it likely still needs an ALB for a stable endpoint, largely canceling the fee's supposed savings. Rejected.
- **ECS EC2 launch type, self-managed capacity** (the previously-chosen approach in the superseded plan): genuinely the cheapest ECS option (~$8-10/mo, no ALB, Elastic IP + Caddy sidecar for TLS) and does eliminate cold starts entirely. Superseded, not because it doesn't work, but because ~$8-10/mo for always-on availability isn't worth it against Lambda's ~$0 for a 2-user personal app that already tolerates cold starts today. Also carries an ongoing OS-patching chore that Lambda's fully-managed runtime removes entirely.
- **Lambda with a container image**: Lambda supports deploying from a container image instead of a zip, which would have let the existing Dockerfile carry over more directly. Rejected because SnapStart — needed to keep cold starts tolerable for a JVM/Spring app — only works with the zip-based managed Java runtime, not container-image Lambdas.
- **Lambda with provisioned concurrency**: keeps one execution environment permanently warm, eliminating cold starts outright. Rejected: it's billed for the reserved capacity whether invoked or not, which reintroduces an always-on-shaped cost and defeats the reason for choosing Lambda over ECS in the first place. Kept as a fallback (see "Cold starts" below) only if SnapStart's measured latency proves unacceptable.
- **Chosen: API Gateway (HTTP API) + AWS Lambda**, Java 21 managed runtime (arm64/Graviton2), packaged as a zip rather than a container image so SnapStart applies, with the existing Spring MVC app adapted via `aws-serverless-java-container-springboot3` instead of embedded Tomcat.

## Current Cloud Run setup (from `.github/workflows/backend-deploy.yml`)

```
--memory=512Mi --cpu=1 --concurrency=80 --timeout=300 --max-instances=3 --allow-unauthenticated
```
No `--min-instances` (defaults to 0). Deploys via Workload Identity Federation (no static GCP key in CI). Runtime identity is the default Compute Engine service account (ADC) — this is what currently grants Firestore access for free, and is exactly what breaks once compute leaves GCP.

Key facts that shape the target setup:
- No `server.port`/`PORT` env var reliance carries over — Lambda doesn't bind a port at all. `aws-serverless-java-container` runs the Spring `DispatcherServlet` in-process per invocation, translating API Gateway's event JSON into a servlet request/response; no embedded Tomcat ever listens on a socket.
- Health check: default Spring Boot Actuator, `/actuator/health`, publicly permitted in `SecurityConfig`. API Gateway just proxies to it like any other route — the frontend's `health.service.ts` keeps polling this same path unchanged.
- No JVM heap flags (`java -jar app.jar` only) today — under Lambda, the function's configured memory setting (see below) controls both available heap and proportional CPU, so memory sizing doubles as the main cold-start tuning lever.
- Dockerfile (`eclipse-temurin:21-jre-alpine`, multi-stage, non-root user) and `build-and-push.sh` are **retired for the backend** — Lambda's managed Java runtime takes a plain zip/jar, not a container image (see "Rejected" above on why a container-image Lambda was ruled out). A new Gradle packaging step replaces the Docker build.
- Secrets today (`JWT_SECRET`, `GOOGLE_CLIENT_ID`) are written to a plaintext YAML file and passed via `--env-vars-file`. This migration is a natural point to move `JWT_SECRET` (and the new GCP key) into a proper secret store — see "Interim Firestore credential" below for the store choice, which is more cost-sensitive here than it was under ECS.

## Target AWS setup

### 1. Application changes

Unlike the ECS plan (which reused the existing container unmodified), Lambda requires a small adapter layer:
- Add `com.amazonaws.serverless:aws-serverless-java-container-springboot3` and `com.amazonaws:aws-lambda-java-core` to `backend/build.gradle`.
- Add a `LambdaHandler implements RequestStreamHandler` class that lazily builds a `SpringBootLambdaContainerHandler` around the existing `BackendApplication` and delegates `handleRequest` to it. This is the only new backend code — existing controllers, services, `SecurityConfig`, etc. are untouched.
- Implement the SnapStart hook (`org.crac.Resource.beforeCheckpoint`) to drive one throwaway request through the handler before the snapshot is taken, so lazy Spring initialization happens during the snapshot build, not on the first real request after a restore.
- Package as a shaded/fat jar via the `com.gradleup.shadow` Gradle plugin — Lambda's managed Java runtime expects a plain jar with `LambdaHandler` on the classpath, not the Spring Boot executable jar's special launcher manifest.

### 2. IAM

- **Lambda execution role**: `AWSLambdaBasicExecutionRole` (CloudWatch Logs write) plus an inline policy scoped to the two specific secret/parameter ARNs. Lambda has only this one role — no execution-role/task-role split like ECS, since there's no separate "pull image, decrypt secrets" bootstrap phase distinct from the running app.

### 3. Interim Firestore credential

- In GCP, create a new service account scoped to Datastore-only access (least privilege — don't reuse a broader existing account), generate a JSON key.
- **Store it in AWS Systems Manager Parameter Store as a `SecureString`, not Secrets Manager.** Parameter Store's standard tier is free; Secrets Manager charges ~$0.40/secret/month, which is a meaningful fraction of an otherwise near-$0 bill for this migration specifically (unlike the ECS plan, where it was a rounding error against an $8-10/mo base). Store `JWT_SECRET` the same way.
- In the Spring app, set `spring.cloud.gcp.credentials.encoded-key=${GCP_CREDENTIALS_ENCODED_KEY}` (base64 of the key JSON) — unchanged from the ECS plan, no code change. The `LambdaHandler`'s cold-start init path fetches both parameters via the SSM SDK once and caches them in static fields so warm invocations (and SnapStart restores, which resume from the post-init snapshot) don't refetch per-request.
- Explicitly flag this as throwaway plumbing: once the separate DB migration to AWS lands, this credential and the `spring-cloud-gcp-starter-data-datastore` dependency go away entirely — don't invest in anything more durable (e.g. WIF) than this.

### 4. Lambda function

- **Runtime**: Java 21 managed runtime (`java21`), **arm64** architecture — Graviton2 is both cheaper per GB-second and per-ms than x86 for the managed Java runtime, mirroring the ECS plan's Graviton choice.
- **Memory**: start at 1024 MB. More memory means proportionally more CPU, which for a JVM/Spring cold start often shortens init duration enough to be net cheaper (or the same) despite the higher per-ms rate than a smaller, slower-starting size — confirm by measuring actual init duration once deployed, and only size down if it doesn't regress cold-start latency.
- **Timeout**: 29s — API Gateway's HTTP API integration has a hard 29s cap regardless of what the Lambda function's own timeout allows, so there's no benefit to setting the function timeout higher.
- **SnapStart**: enabled (`PublishedVersions` mode). SnapStart only applies to published numbered versions with an alias pointing at them, never `$LATEST` — this shapes the deploy flow (see CI/CD below).
- **Env vars**: `GOOGLE_CLIENT_ID` (plaintext, matches current). `JWT_SECRET` and `GCP_CREDENTIALS_ENCODED_KEY` are **not** plain Lambda env vars — Lambda has no ECS-style native "inject from secret store" wiring, so the handler's init path fetches them explicitly from Parameter Store on cold start/SnapStart-init and caches them.

### 5. API Gateway

- **HTTP API** (not REST API) — cheaper and simpler; this app needs no REST-API-only features (request validators, API keys, usage plans).
- A single catch-all route (`ANY /{proxy+}`) with a Lambda proxy integration targeting the function's `live` alias — same "let Spring's own router handle everything" shape the app already has, just moved one layer out.
- **CORS**: leave this in Spring's existing `WebConfig` as today rather than also configuring it at the API Gateway level — the Spring container still runs and handles every request inside Lambda, so configuring CORS in both places risks duplicate/conflicting headers.
- **Custom domain**: an API Gateway custom domain backed by a free ACM certificate, mapped to the HTTP API's default stage. This replaces the ECS plan's Elastic IP + Caddy sidecar entirely — ACM/API Gateway terminates TLS and auto-renews the cert, no sidecar container or cert management needed.

### 6. DNS

- Route 53 — an **alias record** (not a plain A record; API Gateway's regional endpoint has no static IP) pointing at the custom domain's API Gateway target.

### 7. CI/CD (`.github/workflows/backend-deploy.yml`)

Replace the GCP-auth-and-deploy job with:
- `aws-actions/configure-aws-credentials` using GitHub OIDC (mirrors the existing WIF pattern — no static AWS keys in CI, matching current security posture).
- `./gradlew shadowJar` to produce the fat jar, zip it.
- `aws lambda update-function-code` to upload the new code to `$LATEST`.
- `aws lambda publish-version` to create a new immutable, SnapStart-eligible version from that code.
- `aws lambda update-alias --name live --function-version <new-version>` to shift the `live` alias (the one API Gateway's integration targets) onto the new version — this is what actually rolls out the deploy.
- Keep the existing `build-test` job (`./gradlew build`) as-is — it's cloud-agnostic.

### Cold starts (the key tradeoff vs. the superseded ECS plan)

- This is the one place this plan is a **regression** relative to the ECS plan, not an improvement: ECS's whole point was eliminating cold starts by staying always-on; Lambda reintroduces them whenever the function has been idle. This is the same category of cold start the app already lives with today on Cloud Run — just AWS-hosted, and mitigated rather than unmitigated.
- **The frontend's cold-start UX stays load-bearing.** `useServerWarmup.ts`, `ServerWarmupGate.tsx`, and `health.service.ts` are NOT a dead-code cleanup candidate under this plan — the opposite conclusion from the superseded ECS plan, which expected to retire them once compute went always-on.
- SnapStart shortens cold starts (by resuming from a post-init checkpoint instead of re-running JVM startup and class loading) but does not eliminate them — actual latency needs to be measured after implementation.
- If measured SnapStart latency is still unacceptable for real usage, the fallback is provisioned concurrency (rejected above as the default because it reintroduces an always-on-shaped cost) — treat that as a follow-up decision to make with real numbers, not something to pre-provision speculatively.

### Patching tradeoff

None — this is a fully-managed runtime. No EC2 instance, no OS packages to patch, no ECS agent to keep running. This is a strict improvement over the superseded ECS plan's "operator owns basic OS patching" tradeoff.

## Cutover

- Stand up the AWS service fully and verify independently (hit the custom domain's `/actuator/health`, confirm Firestore reads/writes work cross-cloud) **before** touching the frontend or deleting anything on GCP.
- Update `frontend/.env`: `API_BASE_URL` from `https://lazyspender-api-272563214847.us-east1.run.app` to the new API Gateway custom domain.
- Leave the Cloud Run service running (don't delete) for a rollback window — reverting is just reverting the `API_BASE_URL` env var and redeploying the frontend.
- Once confidence is established, decommission the Cloud Run service and Artifact Registry repo.

## Rough monthly cost estimate (us-east-1, personal-scale traffic)

| Item | Estimate |
|---|---|
| Lambda compute (2 users, sporadic use) | $0 (well within the perpetual free tier: 1M requests + 400K GB-seconds/month) |
| API Gateway (HTTP API) | $0 for the first 12 months (AWS account-level free tier: 1M calls/mo); after that, ~$1/million requests — negligible at this traffic |
| CloudWatch Logs (ingestion + storage, low volume) | ~$1/mo |
| Secrets (SSM Parameter Store, standard tier, 2 SecureStrings) | $0 |
| ACM certificate | $0 |
| Data transfer out | ~$0-1/mo (personal-scale traffic) |
| **Total** | **~$1-2/mo** |

No EC2 instance, no ALB, no NAT Gateway, no Elastic IP, no per-instance management fee — this is meaningfully cheaper than the superseded ECS plan's ~$8-10/mo, at the cost of reintroducing (mitigated) cold starts.

## Verification

- After the service is up: `curl` the custom domain's `/actuator/health` and confirm `{"status":"UP"}`, and confirm the ACM-issued certificate is valid (no browser TLS warning).
- Exercise a couple of real endpoints (e.g. list transactions for the hardcoded owner `villamorvinzie`) to confirm the interim Firestore credential works cross-cloud.
- Check CloudWatch Logs for the function to confirm no startup errors (particularly around GCP credential loading from Parameter Store).
- Invoke the function cold (after 15+ minutes idle) and warm, and compare latency with and without SnapStart enabled, to confirm SnapStart is actually helping and to get real numbers for whether provisioned concurrency is ever needed.
- Confirm a SnapStart-restored execution environment still has valid, non-stale Firestore/JWT credentials (the static-field caching from cold-start init must survive the restore correctly).
- Only after the above, switch `frontend/.env` `API_BASE_URL` and verify the deployed frontend against the new backend end-to-end (login, load dashboard, create a transaction) before decommissioning Cloud Run.
