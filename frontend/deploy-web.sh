#!/bin/bash

# Deploy the built web export (frontend/dist) to S3 + CloudFront.
# Expects AWS_FRONTEND_BUCKET and AWS_FRONTEND_DISTRIBUTION_ID in the
# environment, and AWS credentials already configured (via
# aws-actions/configure-aws-credentials in CI, or the local AWS CLI profile
# for manual deploys). Does not build - run `npm run web:build` first.

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

: "${AWS_FRONTEND_BUCKET:?AWS_FRONTEND_BUCKET must be set}"
: "${AWS_FRONTEND_DISTRIBUTION_ID:?AWS_FRONTEND_DISTRIBUTION_ID must be set}"

echo "Syncing dist/ to s3://${AWS_FRONTEND_BUCKET}..."
aws s3 sync dist "s3://${AWS_FRONTEND_BUCKET}" --delete

# aws s3 sync's built-in MIME guessing doesn't recognize .json, so
# manifest.json gets uploaded as application/octet-stream (Azure SWA, the
# previous host, set this correctly on its own). iOS Safari silently
# refuses to treat the page as an installable standalone PWA when the
# manifest isn't served with a JSON-ish content type, so "Add to Home
# Screen" falls back to a bookmark tab with the address bar visible.
echo "Fixing manifest.json content-type..."
aws s3 cp dist/manifest.json "s3://${AWS_FRONTEND_BUCKET}/manifest.json" \
  --content-type "application/manifest+json" \
  --metadata-directive REPLACE

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id "${AWS_FRONTEND_DISTRIBUTION_ID}" --paths "/*"

echo "Deploy complete."
