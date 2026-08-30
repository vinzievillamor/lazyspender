# Migrate frontend static hosting from Azure Static Web Apps to AWS (S3 + CloudFront)

## Scope

This covers only the web export's *hosting* — where the built static site lives and how it's served. It doesn't touch native app builds or `API_BASE_URL`, which already points at whichever backend is live regardless of where the frontend itself is hosted (see `aws-migration-summary.md`'s Sequencing). This piece is independent of the compute/DB migrations and can happen before, during, or after them.

## Current Azure Static Web Apps setup

`.github/workflows/frontend-web-deploy.yml` deploys the `expo export -p web` output (`frontend/dist`) to **Azure Static Web Apps** — a third cloud already in play alongside GCP, on SWA's free tier. Two things matter for the AWS equivalent:

- **No custom domain**: prod origin is Azure's default subdomain, referenced directly in `backend/src/main/resources/application.yaml`'s CORS config. This migration should likewise land on AWS's default domain rather than provisioning a custom one.
- **`staticwebapp.config.json`** rewrites every clean route (`/dashboard`, `/login`, `/records`, `/planned-payments`, `/account-access`) to its per-route HTML file, because expo-router's static web export emits one HTML file per top-level route, not a single SPA `index.html` fallback. This has no automatic AWS equivalent — it must be reimplemented explicitly, or every route except `/` 404s on direct load/refresh.
- `frontend/public/sw.js` is a minimal, install-only service worker that must always be served fresh — a stale cached copy would block the PWA install-prompt logic from picking up future changes.

## Rejected alternatives

- **Plain S3 static website hosting (no CloudFront)**: HTTP-only, no TLS — a functional regression, not just a cost one, since service workers require a secure context. Rejected outright.
- **AWS Amplify Hosting**: the closest feature match to Azure SWA, and equally $0/mo at this traffic. A cost tie against S3+CloudFront isn't a reason to add the extra managed layer.
- **Route 53 hosted zone / custom domain**: out of scope — no custom domain exists today, so there's nothing to migrate onto one.

## Target AWS setup

- **S3**: a private bucket ("Block all public access" on, versioning skipped), synced fresh on every deploy (`aws s3 sync --delete`).
- **CloudFront**: origin is the S3 bucket via Origin Access Control (bucket stays fully private, unlike plain S3 hosting); default root object `index.html`; a viewer-request CloudFront Function reimplements `staticwebapp.config.json`'s route-to-HTML rewrites 1:1. Cache behavior is split by path: hashed `_expo/static/*` assets get long/immutable caching, while `*.html`/`manifest.json`/`sw.js` get short/no-cache TTLs (`sw.js` must never be stale). No ACM cert needed — no custom domain.
- **IAM/CI**: a dedicated IAM role scoped to just this bucket/distribution, assumed via GitHub OIDC — mirrors the WIF-style, no-static-keys pattern the Lambda plan uses for backend CI. The deploy step becomes an `aws s3 sync` + `aws cloudfront create-invalidation`, replacing the Azure SWA deploy action; `frontend/package.json`'s `web:deploy` script gets the same swap for manual/local deploys.

## Cutover

Stand up the CloudFront distribution and verify independently first (every route loads via the rewrite function, PWA install prompt still fires). Add the new CloudFront domain to `application.yaml`'s CORS config alongside the existing Azure entry during the rollback window. Once confidence is established: delete the Azure Static Web App, remove its CI secret, and drop the `swa` CLI reference.

## Rough monthly cost estimate

| Item | Estimate |
|---|---|
| S3 storage + requests | <$0.02/mo |
| CloudFront data transfer + requests | ~$0-0.20/mo |
| ACM certificate | $0 (not used — no custom domain) |
| **Total** | **~$0-0.25/mo** |

No fixed/base fee anywhere in this stack, unlike an ALB's flat monthly charge. Baseline today: $0/mo (Azure SWA free tier).

## Verification

Request every route directly by URL (not via client-side nav) and confirm each returns 200 with the right page — a plain S3 origin without the rewrite function would 403/404 on all but `/`. Confirm the PWA install prompt still appears over HTTPS from the CloudFront domain, and that the backend accepts CORS from the new origin once `application.yaml` is updated.
