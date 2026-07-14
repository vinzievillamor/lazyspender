---
name: backend-logs
description: Pull and search backend Cloud Run logs to troubleshoot a reported bug (invite/email/payment didn't go through, 500s, unexpected behavior). Use when the user reports something didn't work in the app and the cause isn't obvious from reading code alone — e.g. "the invite didn't push through", "this errored out", "nothing happened when I tried X".
---

# Backend logs

Pull real production logs from Cloud Run to see what actually happened server-side,
instead of guessing from code alone. This backend has no staging/emulator — `local`
profile still talks to the real prod Firestore/Cloud Run project, so prod logs are
the only source of truth for "what happened when the user did X."

## Where the logs live

- **Project**: `mindful-rhythm-426908-a5`
- **Cloud Run service**: `lazyspender-api`, region `us-east1`
- Logs are read via `gcloud logging read`, not the Cloud Console UI, so results
  land directly in the conversation.

## Step 0 — Check gcloud auth

```bash
gcloud auth list
gcloud run services list --region=us-east1
```

If `gcloud run services list` fails with `invalid_grant` / refresh token errors,
the cached credentials expired. This requires an interactive browser login you
cannot run yourself — ask the user to run it themselves via the `!` prefix so
the output lands in the session:

```
! gcloud auth login
```

Wait for their confirmation before continuing.

## Step 1 — Search logs for the relevant area

General pattern — filter by service, then by keywords relevant to the reported
issue (class names, log messages, endpoint paths):

```bash
gcloud logging read 'resource.type="cloud_run_revision" resource.labels.service_name="lazyspender-api" (textPayload:"<keyword1>" OR textPayload:"<keyword2>")' \
  --project=mindful-rhythm-426908-a5 --limit=100 --freshness=7d \
  --format="table(timestamp,severity,textPayload)"
```

Pick keywords from the domain (e.g. class name like `BackfillVillamorvinzieDelegationInvite`,
a log message substring, `AccountAccess`, `PlannedPayment`) rather than pulling
unfiltered logs — this backend logs full stack traces, so an unfiltered pull is
noisy.

## Step 2 — Cross-check with HTTP request logs

To see whether the frontend actually called the relevant endpoint, and when,
filter on `httpRequest.requestUrl` instead of `textPayload`:

```bash
gcloud logging read 'resource.type="cloud_run_revision" resource.labels.service_name="lazyspender-api" httpRequest.requestUrl:"/api/<path>"' \
  --project=mindful-rhythm-426908-a5 --limit=50 --freshness=7d \
  --format="table(timestamp,httpRequest.requestMethod,httpRequest.requestUrl,httpRequest.status)"
```

Widen to `/api/` (no specific path) and a short `--freshness` (e.g. `1d`) to see
the single most recent request from the app overall — this tells you whether the
app session is still active/polling, or went idle/backgrounded, which is often
the actual explanation rather than a backend bug.

Compare timestamps against current time (`date -u`) — logs are UTC. A large gap
between "last request seen" and "now" usually means the client stopped polling
(app backgrounded/closed), not that the backend failed silently.

## Step 3 — Reason about the timeline, don't just report errors

Lay out what happened in order: request in → server-side processing (migration
runs, service logic, Datastore calls) → whether a subsequent request would have
picked up the result. A "bug" is often actually a race between an async
one-off process (like an `ApplicationRunner` migration on cold boot) and the
frontend's next poll — not a code defect. Only point at application code once
the logs rule out timing/staleness and transient infra errors (e.g. a one-off
`SSLHandshakeException` / `DatastoreException: I/O error` on a Datastore call
during boot is a transient network blip, not a bug, if a later attempt succeeds).

## Step 4 — Report back

State plainly: what the logs show happened, in timestamp order, and the
conclusion (backend succeeded/failed and why, or client-side staleness). If the
data is fine server-side, tell the user what action on their end (reopen app,
pull-to-refresh, wait for the next poll interval) should resolve it, rather than
proposing a code change that isn't needed.
