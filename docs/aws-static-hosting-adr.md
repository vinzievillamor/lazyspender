# ADR: Frontend static hosting migrated from Azure Static Web Apps to AWS (S3 + CloudFront)

**Status**: Implemented (#102, #103)

## Scope

This covers only the web export's *hosting* — where the built static site lives and how it's served. It doesn't touch native app builds or `API_BASE_URL`, which points at whichever backend is live regardless of where the frontend itself is hosted (see `aws-migration-summary.md`'s Sequencing). This piece was independent of the compute/DB migrations.

## Context: prior Azure Static Web Apps setup

`.github/workflows/frontend-web-deploy.yml` deployed the `expo export -p web` output (`frontend/dist`) to **Azure Static Web Apps** — a third cloud alongside GCP, on SWA's free tier. Two things mattered for the AWS equivalent:

- **No custom domain**: prod origin was Azure's default subdomain, referenced directly in `backend/src/main/resources/application.yaml`'s CORS config. This migration added one: a Google Workspace custom domain (`zirchel.com`) was purchased after this plan was first written, so the AWS target serves from `lazyspender.zirchel.com` instead of CloudFront's default domain — see "Custom domain" below.
- **`staticwebapp.config.json`** rewrote every clean route (`/dashboard`, `/login`, `/records`, `/planned-payments`, `/account-access`) to its per-route HTML file, because expo-router's static web export emits one HTML file per top-level route, not a single SPA `index.html` fallback. This had no automatic AWS equivalent — it was reimplemented explicitly as a CloudFront Function, or every route except `/` would 404 on direct load/refresh.
- `frontend/public/sw.js` is a minimal, install-only service worker that must always be served fresh — a stale cached copy would block the PWA install-prompt logic from picking up future changes.

## Rejected alternatives

- **Plain S3 static website hosting (no CloudFront)**: HTTP-only, no TLS — a functional regression, not just a cost one, since service workers require a secure context. Rejected outright.
- **AWS Amplify Hosting**: the closest feature match to Azure SWA, and equally $0/mo at this traffic. A cost tie against S3+CloudFront wasn't a reason to add the extra managed layer.
- **Full Route 53 hosted zone migration**: a custom domain (`zirchel.com`, via Google Workspace) exists, so a custom domain itself was in scope — but moving the *entire* DNS zone into Route 53 was rejected. That would have required re-creating every existing record (Workspace's MX/SPF/DKIM/DMARC mail records, any domain-verification TXT) in Route 53 before repointing nameservers at the registrar, risking a real email outage for a benefit — managing a couple of subdomain CNAMEs in Terraform — that's marginal. `lazyspender.zirchel.com` is a subdomain, not the apex, so a plain CNAME at the existing registrar is sufficient; Route 53's apex-ALIAS capability isn't needed here.

## Decision: AWS setup

- **S3**: a private bucket ("Block all public access" on, versioning skipped), synced fresh on every deploy (`aws s3 sync --delete`, see `frontend/deploy-web.sh`). `aws s3 sync`'s MIME guessing doesn't recognize `.json`, so it uploads `manifest.json` as `application/octet-stream` — harmless for Chrome/Android but iOS Safari silently refuses to treat the page as an installable standalone PWA unless the manifest is served with a JSON-ish content type, so "Add to Home Screen" falls back to a bookmark tab with the address bar. A follow-up `aws s3 cp --content-type application/manifest+json --metadata-directive REPLACE` after the sync fixes this (#103); Azure SWA had set it correctly on its own, so this only surfaced after the AWS cutover.
- **CloudFront**: origin is the S3 bucket via Origin Access Control (bucket stays fully private, unlike plain S3 hosting); default root object `index.html`; a viewer-request CloudFront Function (`infra/cloudfront-functions/spa-routing.js`) reimplements `staticwebapp.config.json`'s route-to-HTML rewrites 1:1. Cache behavior is split by path: hashed `_expo/static/*` assets get long/immutable caching, while `*.html`/`manifest.json`/`sw.js` get short/no-cache TTLs (`sw.js` must never be stale). Alternate domain name (CNAME) is `lazyspender.zirchel.com`, backed by an ACM certificate — see "Custom domain" below.
- **IAM/CI**: a dedicated IAM role scoped to just this bucket/distribution, assumed via GitHub OIDC (`infra/oidc.tf`) — mirrors the WIF-style, no-static-keys pattern the Lambda plan uses for backend CI. The deploy step is `aws s3 sync` + `aws cloudfront create-invalidation` (`frontend/deploy-web.sh`), invoked from `.github/workflows/frontend-web-deploy.yml`; `frontend/package.json`'s `web:deploy` script got the same swap for manual/local deploys.

### Custom domain

`lazyspender.zirchel.com` — a subdomain of the Google Workspace domain purchased for this project (`zirchel.com`), not the apex, so no apex-ALIAS complexity and no interaction with whatever Workspace already does with the bare domain (mail, Sites).

- **ACM certificate**: CloudFront requires the cert in **us-east-1** regardless of which region the rest of the stack runs in, DNS-validated. Terraform provisions the `aws_acm_certificate` and passes its ARN to the CloudFront distribution.
- **DNS stays at the existing registrar** — the zone was not migrated to Route 53 (see "Rejected alternatives"). Two records were added there by hand, once: the ACM DNS-validation CNAME, and a CNAME pointing `lazyspender.zirchel.com` at the CloudFront distribution's domain name. Since these live outside Terraform's reach, `terraform apply` outputs the validation record's name/value for the maintainer to copy in; `aws_acm_certificate_validation` then just polls ACM until it sees the manually-added record.
- **CORS**: `application.yaml`'s allowed-origin config added `https://lazyspender.zirchel.com`; the Azure entry was kept alongside it for a rollback window and has since been removed now that Azure is fully decommissioned.

## Infrastructure maintenance: Terraform

All AWS resources above (bucket, OAC, distribution, CloudFront Function, IAM role/OIDC) are provisioned and maintained via **Terraform** — nothing was created by hand in the console (`infra/static_hosting.tf`, `infra/oidc.tf`). The GCP/Azure resources this migration replaced were click-ops with no IaC; the AWS stack gets IaC from day one so the interlocking wiring stays reproducible and rollback-safe. CloudFormation/CDK/SAM were passed over as more verbose or Lambda-centric for no benefit at this scale.

- **Layout**: a root-level `infra/` directory — one Terraform root module for all of the app's AWS infrastructure (this piece and the compute/DB migrations alike), organized generically by concern, not per migration plan. The CloudFront Function's JS source is committed there and deployed via `aws_cloudfront_function`.
- **State**: S3 backend with native S3 locking (Terraform ≥ 1.10, no DynamoDB table); the state bucket is the one hand-created bootstrap resource.
- **Infra vs. content**: Terraform manages resources only — the built site ships via `aws s3 sync` + invalidation in CI. `terraform plan`/`apply` run locally by the maintainer; no CI-driven applies for a single-maintainer project.
- **DNS is the one exception**: the CloudFront alternate-domain CNAME and the ACM validation CNAME were added by hand at the existing registrar (see "Custom domain"), since the zone isn't managed in Route 53/Terraform. Everything else — bucket, OAC, distribution, CloudFront Function, ACM cert, IAM role/OIDC — is Terraform-managed.

## Rough monthly cost

| Item | Estimate |
|---|---|
| S3 storage + requests | <$0.02/mo |
| CloudFront data transfer + requests | ~$0-0.20/mo |
| ACM certificate | $0 (DNS-validated certs are free) |
| **Total** | **~$0-0.25/mo** |

No fixed/base fee anywhere in this stack, unlike an ALB's flat monthly charge. No Route 53 hosted zone cost either — DNS for the subdomain stays at the existing registrar. Prior baseline: $0/mo (Azure SWA free tier).

## Cutover

The CloudFront distribution was stood up first on its default `*.cloudfront.net` domain and verified independently, then the ACM validation + alternate-domain CNAMEs were added at the registrar and `https://lazyspender.zirchel.com` confirmed to serve the same way. Once confidence was established: the Azure Static Web App was deleted, its CI secret removed, the `swa` CLI reference dropped, and the now-dead Azure origin removed from `application.yaml`'s CORS config. Azure is fully decommissioned for this project.

## Verification performed

Every route was requested directly by URL (not via client-side nav) and confirmed to return 200 with the right page — a plain S3 origin without the rewrite function would 403/404 on all but `/`. The PWA install prompt was confirmed to still appear over HTTPS from `https://lazyspender.zirchel.com`, the ACM cert covers it without a browser warning, and the backend accepts CORS from the new origin.
