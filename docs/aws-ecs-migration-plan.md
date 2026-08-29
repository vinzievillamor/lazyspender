# Migrate backend from GCP Cloud Run to AWS ECS (EC2 launch type)

## Context

The backend (`backend/`, Spring Boot 3 / Java 21) currently deploys to Cloud Run with no `--min-instances` flag, so it scales to zero when idle. Every cold start pays for both a new Cloud Run instance spinning up and the JVM/Spring context bootstrapping, which the frontend already works around with dedicated UX (`useServerWarmup.ts`, `ServerWarmupGate.tsx`, `health.service.ts` — a "waking up the server" spinner). The goal of this migration is to move compute onto AWS (ahead of/alongside the separate database migration) at the lowest sustainable cost — for a personal finance app with 2 low-traffic users and a strict budget, cost dominates every decision below, including whether to keep the always-on behavior at all.

**Confirmed decisions:**
- Compute only; Firestore stays on GCP for now, migrating separately later (see `aws-sql-migration-plan.md`).
- Firestore auth from AWS: a scoped GCP service account JSON key stored in AWS Secrets Manager, decoded at runtime via `spring.cloud.gcp.credentials.encoded-key`. Not building WIF since this bridge is short-lived.

### Rejected compute alternatives

- **ECS Express Mode** (Fargate with an auto-provisioned Application Load Balancer): the ALB alone runs ~$17-19/mo of an ~$28-32/mo total — Fargate compute itself is only ~$9/mo. Rejected purely on cost; the ALB isn't optional in Express Mode.
- **AWS App Runner**: avoids the ALB (~$4-8/mo) but rejected due to roadmap/deprecation concerns.
- **AWS Lambda**: near-$0 (perpetual free tier: 1M requests + 400K GB-seconds/month, never expires), but a poor fit for this Java app — SnapStart, needed to keep cold starts reasonable, only works on the managed Java runtime, not container images, and adopting it means rewriting around `aws-serverless-java-container` instead of embedded Tomcat. Rejected as too invasive for the savings.
- **ECS Managed Instances** (AWS's Sept 2025 feature): charges a flat $0.02/hr ($14.60/mo) management fee per instance on top of EC2 cost, regardless of instance size, and doesn't clearly support attaching a stable Elastic IP directly to a managed instance (AWS can replace it for patching) — so it likely still needs an ALB for a stable endpoint, largely canceling the fee's supposed savings. Rejected.
- **Chosen: ECS EC2 launch type, self-managed capacity.** Still genuinely ECS — same cluster/task-definition/ECR/IAM model as the alternatives above — just backed by one small, self-registered EC2 instance instead of Fargate, with no forced load balancer. An Elastic IP attached directly to that instance (free while attached to a running instance) gives a permanently stable address, and a Caddy sidecar container handles automatic Let's Encrypt TLS. The tradeoff being explicitly accepted: the user owns basic OS patching on this one instance, the same "don't pay for availability/maintenance we don't need" philosophy applied to dropping Aurora's RDS fallback in the database plan.

## Current Cloud Run setup (from `.github/workflows/backend-deploy.yml`)

```
--memory=512Mi --cpu=1 --concurrency=80 --timeout=300 --max-instances=3 --allow-unauthenticated
```
No `--min-instances` (defaults to 0). Deploys via Workload Identity Federation (no static GCP key in CI). Runtime identity is the default Compute Engine service account (ADC) — this is what currently grants Firestore access for free, and is exactly what breaks once compute leaves GCP.

Key facts that shape the target setup:
- No `server.port` set — app relies on `PORT` env var (Cloud Run convention); Dockerfile sets `ENV PORT=8080`. Must keep `PORT=8080` (or set `server.port=8080` explicitly) so the container's health checks and traffic hit the right port.
- Health check: default Spring Boot Actuator, `/actuator/health`, publicly permitted in `SecurityConfig`. Frontend's `health.service.ts` polls this same path — reuse it as the container health check.
- No JVM heap flags (`java -jar app.jar` only) — relies on container-aware default heap sizing against the cgroup memory limit; this still works under ECS, but see the EC2 capacity note below on leaving enough headroom for the host OS and sidecar.
- Dockerfile (`eclipse-temurin:21-jre-alpine`, multi-stage, non-root user) needs a **platform change**: it's currently a standard `linux/amd64` image, but the EC2 instance family chosen below (`t4g`) is Graviton/ARM64 — the image must be built (or multi-arch built) for `linux/arm64`.
- Secrets today (`JWT_SECRET`, `GOOGLE_CLIENT_ID`) are written to a plaintext YAML file and passed via `--env-vars-file`. This migration is a natural point to move `JWT_SECRET` (and the new GCP key) into AWS Secrets Manager instead of continuing the plaintext-file pattern.

## Target AWS setup

### 1. IAM roles (one-time, via console or `aws iam`)
- **Task execution role**: pull image from ECR, read the two Secrets Manager secrets, write to CloudWatch Logs (standard `AmazonECSTaskExecutionRolePolicy` + an inline policy scoped to the two specific secret ARNs).
- **Task role**: only what the app itself needs at runtime — for now, nothing beyond what's implicit (no AWS SDK calls from app code), so this can start minimal/empty and gain permissions later when the DB migration lands.
- No "Infrastructure role" is needed — that role exists only for Express Mode to auto-provision an ALB/networking on your behalf, and there's nothing to auto-provision here.

### 2. ECR
- Create a private repository (e.g. `lazyspender/lazyspender-api`), mirroring the existing Artifact Registry naming.
- Image storage is free under ECR's always-free 500MB/month tier for a Spring Boot jar image.

### 3. Interim Firestore credential
- In GCP, create a new service account scoped to Datastore-only access (least privilege — don't reuse a broader existing account), generate a JSON key.
- Store the key as an AWS Secrets Manager secret (e.g. `lazyspender/gcp-datastore-credentials`).
- In the Spring app, set `spring.cloud.gcp.credentials.encoded-key=${GCP_CREDENTIALS_ENCODED_KEY}` (base64 of the key JSON) — this is a one-line addition to `application.yaml`, no code change, and avoids needing to write the key to a file inside the container. Inject it as a task-definition secret from Secrets Manager.
- Explicitly flag this as throwaway plumbing: once the separate DB migration to AWS lands, this credential and the `spring-cloud-gcp-starter-data-datastore` dependency go away entirely — don't invest in anything more durable (e.g. WIF) than this.

### 4. EC2 capacity (the ECS cluster's container instance)
- One instance, Amazon Linux 2023 ECS-optimized AMI (arm64 variant, matching `t4g`).
- Register it to the ECS cluster by setting `ECS_CLUSTER=<cluster-name>` in `/etc/ecs/ecs.config` (typically via instance user-data at launch) — this makes the ECS agent, which ships pre-installed on the ECS-optimized AMI, join the cluster as container-instance capacity.
- **Instance size**: default to **t4g.micro (1 GiB)** rather than t4g.nano (0.5 GiB) — the existing 512MB task memory budget also needs to share the box with the host OS, the ECS agent, the Docker daemon, and the Caddy sidecar, and nano's headroom is tight. Confirm at implementation time by watching actual memory usage; drop to nano only if verified to fit after JVM heap tuning.
- Allocate an **Elastic IP** and associate it with this instance — free while attached to a running instance, and stable across container/task restarts (this is what replaces the ALB's stable-endpoint role).
- Security group: inbound 80/443 open (needed for public HTTPS traffic and Let's Encrypt's HTTP-01 challenge), SSH (22) restricted to the operator's own IP for occasional maintenance/patching.

### 5. ECS task definition
- **App container**: unchanged image (aside from the arm64 rebuild), port 8080, internal-only (not published directly to the host — Caddy is the only container with a published port).
- **Caddy sidecar container**: a minimal `Caddyfile` reverse-proxying the public hostname to `localhost:8080`; Caddy auto-provisions and renews a Let's Encrypt certificate with no manual cert management.
- **Network mode**: `bridge` (or `host`) — the EC2 launch type supports both, unlike Fargate's `awsvpc`-only requirement, which keeps container-to-host port mapping simple without per-task ENIs.
- Env vars: `GOOGLE_CLIENT_ID` (plaintext, matches current), plus secrets-sourced `JWT_SECRET` and `GCP_CREDENTIALS_ENCODED_KEY` pulled from Secrets Manager via the task definition's `secrets` block.

### 6. ECS service
- `desiredCount=1`, no target group and no load balancer configuration on the service.
- Placement: the single registered container instance (trivial with only one instance in the cluster).

### 7. DNS
- Route 53 (or whatever DNS provider is already in use) — a single A record pointing at the Elastic IP.

### 8. CI/CD (`.github/workflows/backend-deploy.yml`)
Replace the GCP-auth-and-deploy job with:
- `aws-actions/configure-aws-credentials` using GitHub OIDC (mirrors the existing WIF pattern — no static AWS keys in CI, matching current security posture).
- `docker build --platform=linux/arm64` (changed from `amd64`, matching the Graviton instance) → push to ECR instead of Artifact Registry.
- `aws ecs update-service --force-new-deployment` against the EC2-launch-type service to roll out the new image tag — a standard, well-documented ECS command (no Express-specific update path to figure out).
- Keep the existing `build-test` job (`./gradlew build`) as-is — it's cloud-agnostic.

### Patching tradeoff
This instance isn't AWS-managed, so basic OS package updates (`dnf upgrade` or equivalent) are the operator's responsibility — a periodic, bounded chore for a single personal-scale box, not an ongoing burden. ECS re-schedules the containers automatically once the ECS agent (a systemd service) comes back up after a reboot.

## Cutover
- Stand up the AWS service fully and verify independently (hit the Elastic IP/domain's `/actuator/health`, confirm Firestore reads/writes work cross-cloud) **before** touching the frontend or deleting anything on GCP.
- Update `frontend/.env`: `API_BASE_URL` from `https://lazyspender-api-272563214847.us-east1.run.app` to the new domain pointed at the Elastic IP.
- Leave the Cloud Run service running (don't delete) for a rollback window — reverting is just reverting the `API_BASE_URL` env var and redeploying the frontend.
- The frontend's cold-start UX (`ServerWarmupGate`, `useServerWarmup`, `health.service.ts`) becomes effectively dead code once the backend is always-on, but leave it in place for now (harmless — it'll just never trigger the slow-path UI) rather than removing it as part of this migration; flag it as a candidate for a follow-up cleanup once AWS is proven stable.
- Once confidence is established, decommission the Cloud Run service and Artifact Registry repo.

## Rough monthly cost estimate (us-east-1, 1 always-on instance)

| Item | Estimate |
|---|---|
| EC2 instance (t4g.micro on-demand, 730 hrs) | ~$6/mo |
| Elastic IP (attached to a running instance) | $0 |
| CloudWatch Logs (ingestion + storage, low volume) | ~$1/mo |
| Secrets Manager (2 secrets) | ~$0.80/mo |
| ECR image storage | ~$0 (within free tier) |
| Data transfer out | ~$0-2/mo (personal-scale traffic) |
| **Total** | **~$8-10/mo** |

No ALB, no NAT Gateway (the instance reaches Firestore's public API directly over its own public IP, same as the rejected Express Mode design avoided a NAT Gateway), no per-instance management fee.

## Verification
- After the service is up: `curl` the domain's `/actuator/health` and confirm `{"status":"UP"}`, and confirm the certificate Caddy issued is valid (no browser TLS warning).
- Exercise a couple of real endpoints (e.g. list transactions for the hardcoded owner `villamorvinzie`) to confirm the interim Firestore credential works cross-cloud.
- Check CloudWatch Logs for the task to confirm no startup errors (particularly around GCP credential loading).
- Reboot the EC2 instance once and confirm the ECS agent rejoins the cluster and both containers (`app`, `caddy`) come back up automatically, with the Elastic IP unchanged.
- Only after the above, switch `frontend/.env` `API_BASE_URL` and verify the deployed frontend against the new backend end-to-end (login, load dashboard, create a transaction) before decommissioning Cloud Run.
