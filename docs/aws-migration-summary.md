# AWS migration: summary

Full migration has three independent-but-complementary pieces, each documented in full detail elsewhere:

- **Compute**: Cloud Run (GCP) → AWS API Gateway + Lambda (SnapStart, no ALB, no EC2) — [details](./aws-lambda-migration-plan.md)
- **Database**: Firestore in Datastore mode (GCP) → AWS Aurora Serverless v2 (Postgres) — [details](./aws-sql-migration-plan.md)
- **Frontend static hosting**: Azure Static Web Apps → AWS S3 + CloudFront — [details](./aws-static-hosting-migration-plan.md)

Only compute and database are actually moving off GCP — the frontend's static hosting is already on a third cloud (Azure), not GCP, so its move is about consolidating everything onto one cloud rather than leaving GCP specifically. This page is the top-level reference; go to the linked docs for implementation detail.

## Current vs. target

| Concern | Today | AWS target |
|---|---|---|
| Compute | Cloud Run (GCP), scales to zero (cold starts) | API Gateway + Lambda, SnapStart-mitigated cold starts (still scales to zero) |
| Database | Firestore in Datastore mode (GCP, no `GROUP BY`/`JOIN`) | Aurora Serverless v2, PostgreSQL-compatible, scale-to-zero |
| Frontend hosting | Azure Static Web Apps (free tier) | S3 (private, OAC) + CloudFront, no custom domain |
| ORM/repos | Spring Data `DatastoreRepository` + hand-declared composite indexes | Spring Data JPA (Hibernate) + Flyway migrations |
| DB access pattern | Native (same cloud as compute) | Native (same cloud as compute), once both migrations land |
| Secrets | Plaintext YAML file via `--env-vars-file` | AWS Systems Manager Parameter Store (SecureString) |

## Sequencing

The compute and database migrations can happen in **either order** — each plan documents its own bridge for whichever side hasn't moved yet:

- **DB first**: backend stays on Cloud Run, reaches Aurora over the public internet (TLS-enforced JDBC) — see the SQL plan's "Interim connectivity" section.
- **Compute first**: Lambda backend reaches Firestore via a scoped GCP service-account key in AWS Systems Manager Parameter Store — see the Lambda plan's "Interim Firestore credential" section.
- **End state, either way**: Lambda backend + Aurora DB, same cloud, no cross-cloud bridge left in place.

The **frontend hosting move is fully independent** of both — it only needs to know the backend's URL (`frontend/.env`'s `API_BASE_URL`) and the backend's CORS config only needs to know the frontend's origin (`app.cors.allowed-origin-patterns`). It can happen before, during, or after the compute/DB work in any order, with no bridge to build.

## Combined cost estimate

| Item | Estimate |
|---|---|
| Lambda + API Gateway compute (SnapStart, no ALB, no EC2, + logs + Parameter Store secrets) | ~$1-2/mo |
| Aurora Serverless v2, scale-to-zero (2 low-traffic users) | <$5/mo |
| Frontend hosting (S3 + CloudFront, no custom domain) | ~$0-0.25/mo |
| **Combined total** | **~$1-7/mo** |

Baseline today: ~$0/mo (Cloud Run scales to zero, Firestore free tier, Azure SWA free tier).

No RDS/always-on database fallback, no ALB, and no always-on compute are kept in this plan — availability isn't a concern for this personal, low-traffic app, so none of those costs are worth carrying. See each linked plan's "Rejected alternatives"/"Trade-off to accept" sections for why.

## Key risks / tradeoffs

- Unlike the database and frontend-hosting moves, the compute move is a genuine cost optimization, not just cloud consolidation: Lambda's perpetual free tier drops compute to ~$1-2/mo, versus the ~$8-10/mo an always-on ECS EC2 instance (the originally-chosen, now-superseded approach) would have cost.
- That savings comes with a real tradeoff: Lambda reintroduces cold starts (SnapStart-mitigated, not eliminated) — the same category of cold start the app already lives with today on Cloud Run, just AWS-hosted. The frontend's cold-start UX (`useServerWarmup`, `ServerWarmupGate`, `health.service.ts`) stays load-bearing rather than becoming a cleanup candidate — see the Lambda plan's "Cold starts" section.
- Aurora scale-to-zero adds multi-second resume latency after idle periods — acceptable for a personal app used briefly a few times a day.
- Whichever side migrates first runs a temporary cross-cloud bridge (GCP key in AWS, or AWS DB reached from GCP over the public internet) — neither is meant to be hardened further, since it's short-lived.
- Both plans keep a rollback window (leave the old GCP resource running/untouched) before decommissioning anything on GCP.
- The frontend hosting move carries its own, smaller risk: `staticwebapp.config.json`'s route-to-HTML rewrites have no automatic AWS equivalent and must be reimplemented as a CloudFront Function, or every route but `/` 404s — see the static hosting plan's "Target AWS setup."

## High-level phases

1. **Stand up AWS database** (Aurora Serverless v2, Flyway schema, ETL cutover from Firestore) — see SQL plan's "Phased rollout."
2. **Stand up AWS compute** (Lambda function + API Gateway, `aws-serverless-java-container` adapter, IAM roles, CI/CD switch) — see the Lambda plan's "Target AWS setup" and "CI/CD" sections.
3. **Cut over frontend's backend target** — point `frontend/.env` `API_BASE_URL` at the new backend once it's verified independently.
4. **Migrate frontend hosting** (S3 + CloudFront, CloudFront Function for route rewrites, CI/CD switch) — independent of 1-3, can happen any time — see the static hosting plan's "Target AWS setup" and "Cutover."
5. **Decommission GCP and Azure** — after each side's rollback grace period elapses: Cloud Run service, Artifact Registry repo (no longer used once compute is a Lambda zip rather than a container image), Firestore-in-Datastore-mode database, the `spring-cloud-gcp-*` dependencies/index.yaml, and the Azure Static Web App + `swa` CLI reference.
