# Migrate frontend static hosting from Azure Static Web Apps to AWS (S3 + CloudFront)

## Scope

This covers only the web export's *hosting* — where the built static site lives and how it's served. It doesn't touch native app builds (`frontend-build.yml`'s Android APK job stays as-is) or `API_BASE_URL`, which already points at whichever backend is live regardless of where the frontend itself is hosted (see `aws-migration-summary.md`'s Sequencing). This piece is independent of the compute/DB migrations and can happen before, during, or after them.

## Current Azure Static Web Apps setup

`.github/workflows/frontend-web-deploy.yml` runs `npm run web:build` (`expo export -p web`) and deploys the resulting `frontend/dist` to **Azure Static Web Apps** via the `Azure/static-web-apps-deploy` action — a third cloud already in play alongside GCP, on SWA's free tier (`$0/mo`). `frontend/package.json`'s `web:deploy` script does the same thing locally via the `swa` CLI.

Two Azure-specific pieces matter for the AWS equivalent:
- **No custom domain**: prod origin is the default `https://jolly-mushroom-06ba64b00.7.azurestaticapps.net`, referenced directly in `backend/src/main/resources/application.yaml`'s `app.cors.allowed-origin-patterns`. Nothing to carry over — this migration should likewise land on AWS's default domain rather than provisioning a custom one.
- **`staticwebapp.config.json`** rewrites every clean route to its per-route HTML file, because expo-router's static web export emits one HTML file per top-level route (`dashboard.html`, `login.html`, `records.html`, `planned-payments.html`, `account-access.html`), not a single SPA `index.html` fallback:
  ```json
  { "routes": [
    { "route": "/dashboard", "rewrite": "/dashboard.html" },
    { "route": "/login", "rewrite": "/login.html" },
    { "route": "/records", "rewrite": "/records.html" },
    { "route": "/planned-payments", "rewrite": "/planned-payments.html" },
    { "route": "/account-access", "rewrite": "/account-access.html" }
  ]}
  ```
  This has no automatic AWS equivalent — it must be reimplemented explicitly, or every route except `/` 404s on direct load/refresh.
- `frontend/public/sw.js` is a minimal, install-only service worker (no offline caching — just enough to satisfy PWA installability, see CLAUDE.md's PWA note). It must always be served fresh; a stale cached copy would block the install-prompt logic from ever picking up a future change to it.

## Rejected alternatives

- **Plain S3 static website hosting (no CloudFront)**: the `bucket.s3-website-<region>.amazonaws.com` endpoint is HTTP-only, with no way to attach a TLS certificate. That's not a cost tradeoff, it's a functional regression — service workers require a secure context (HTTPS or `localhost`), so the PWA install would silently break. Rejected outright.
- **AWS Amplify Hosting**: a managed, git-connected CI/CD host — the closest feature-for-feature match to what Azure SWA already provides, and equally `$0/mo` at this app's traffic via its Always Free tier. Cost is a tie against S3+CloudFront, so there's no savings to justify the extra managed layer — this migration otherwise consistently picks whichever option is cheapest at this app's traffic (e.g. Lambda over an always-on ECS instance for compute — see the Lambda plan), and a tie on cost isn't a reason to add one.
- **Route 53 hosted zone / custom domain**: out of scope. No custom domain exists today (see above), so there's nothing to migrate onto one. Adding a custom domain later is an independent decision, not part of this plan.

## Target AWS setup

### 1. S3 bucket
- Private, "Block all public access" enabled. Versioning skipped — low value for a site that's fully rebuilt and re-synced on every deploy.
- Holds the `expo export -p web` output (`frontend/dist`), synced fresh on every deploy (`aws s3 sync --delete`, so removed/renamed files don't linger).

### 2. CloudFront distribution
- **Origin**: the S3 bucket, via **Origin Access Control (OAC)** — the bucket policy scopes access to only this distribution's OAC principal, so the bucket stays fully private (no public-read policy, unlike plain S3 static hosting).
- **Default root object**: `index.html`.
- **CloudFront Function** (viewer-request; the cheapest/fastest edge-compute tier — no Lambda@Edge needed for a plain path rewrite) reimplementing `staticwebapp.config.json`'s rewrites 1:1:
  - `/` → `/index.html`
  - `/dashboard` → `/dashboard.html`
  - `/login` → `/login.html`
  - `/records` → `/records.html`
  - `/planned-payments` → `/planned-payments.html`
  - `/account-access` → `/account-access.html`
- **Cache behavior, split by path pattern** (the one thing a default CloudFront config would get wrong for this app):
  - `_expo/static/*` (hashed JS/CSS bundle filenames — content-addressed, safe to cache forever): long `max-age`, immutable.
  - `*.html`, `manifest.json`, `sw.js`: short/no-cache TTL — none of these are content-hashed, and `sw.js` in particular must never be served stale.
- **ACM certificate**: not needed for now — no custom domain (see Rejected alternatives). Revisit only if a custom domain is added later; a CloudFront-attached ACM cert is free regardless.

### 3. IAM / CI
A dedicated IAM role scoped to `s3:PutObject`/`s3:DeleteObject`/`s3:ListBucket` on just this bucket plus `cloudfront:CreateInvalidation` on just this distribution, assumed via GitHub OIDC — mirrors the WIF-style, no-static-keys pattern the Lambda plan already uses for backend CI.

### 4. CI/CD (`.github/workflows/frontend-web-deploy.yml`)
Replace the deploy step:
```yaml
- name: Deploy to Azure Static Web Apps
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
    ...
```
with:
```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_FRONTEND_DEPLOY_ROLE_ARN }}
    aws-region: us-east-1
- run: aws s3 sync frontend/dist s3://<bucket-name> --delete
- run: aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```
Everything before that (`npm ci`, `npm run web:build`) is unchanged — this is purely a deploy-target swap, same shape as the Lambda plan's CI/CD section for the backend. Update `frontend/package.json`'s `web:deploy` script the same way, for manual/local deploys.

## Cutover
- Stand up the CloudFront distribution and verify independently first: hit its default `*.cloudfront.net` domain, confirm every route (not just `/`) loads via the CloudFront Function rewrites, confirm the PWA install prompt still fires.
- Update `backend/src/main/resources/application.yaml`'s `app.cors.allowed-origin-patterns` — add the new CloudFront domain alongside the existing Azure entry during the rollback window, then remove the Azure one once decommissioned.
- Leave the Azure Static Web App running untouched for a rollback window.
- Once confidence is established: delete the Azure Static Web App resource, remove the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret, and drop the `swa` CLI reference in `package.json`.

## Rough monthly cost estimate

| Item | Estimate |
|---|---|
| S3 storage (a few MB static export) | <$0.01/mo |
| S3 requests (PUT on deploy, GET on page loads) | <$0.01/mo |
| CloudFront data transfer out (personal-scale traffic) | ~$0-0.20/mo |
| CloudFront requests | <$0.01/mo |
| ACM certificate | $0 (not used — no custom domain) |
| **Total** | **~$0-0.25/mo** |

No fixed/base fee anywhere in this stack — CloudFront and S3 are both pure pay-per-use, unlike an ALB's flat monthly charge. Baseline today: $0/mo (Azure SWA free tier).

## Verification
- Request every route directly by URL (not via client-side nav) — `/dashboard`, `/login`, `/records`, `/planned-payments`, `/account-access` — and confirm each returns 200 with the right page. A plain S3 origin without the rewrite function would 403/404 on every one of these except `/`.
- Confirm the PWA install prompt still appears (service worker registers over HTTPS from the CloudFront domain) and that a redeploy (`aws s3 sync` + invalidation) is visible on next load without a manual browser cache clear.
- Confirm the backend accepts CORS requests from the new CloudFront origin once `application.yaml` is updated and redeployed.
- Only after the above, treat the CloudFront domain as production and start the Azure Static Web App rollback-window clock.
