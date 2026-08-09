# Offline data caching + sync (transactions & planned payments)

## Why

The frontend is currently "always-online": every screen depends on a live
round-trip to the Spring Boot API, there's no local persistence beyond the
JWT (`expo-secure-store`), and TanStack Query's `onlineManager` has no real
connectivity signal wired in on native (it only works via `navigator.onLine`
on web). If the device loses connectivity, reads show nothing new and writes
just fail with a network error — nothing is cached or queued.

The goal: transactions and planned payments stay viewable and editable while
offline, with local changes syncing back to the backend once connectivity
returns.

## Key constraint driving the design

The backend has no `createdAt`/`updatedAt`/version fields and no idempotency
support on either `Transaction` or `PlannedPayment`, and always
server-generates ids (client-supplied ids are ignored on create). That rules
out real conflict detection and safe blind retries. Rather than build a
bespoke write-queue with its own retry/dedupe logic on top of that, the design
leans on TanStack Query's own built-in offline machinery:

- `onlineManager` — a single connectivity signal the query client already
  understands.
- Default `networkMode: 'online'` — mutations fired while offline pause
  automatically (never start the network request), so there's no risk of a
  duplicate half-sent request; they resume in order once `onlineManager`
  flips back online.
- `PersistQueryClientProvider` + an AsyncStorage persister — persists both
  the query cache and any paused mutations across app restarts, replaying
  paused mutations once restored.

This reuses infrastructure the app already depends on (`@tanstack/react-query`)
instead of adding a second, parallel sync mechanism.

## Scope decision: `confirmPlannedPayment` stays require-online

`POST /api/planned-payments/{id}/confirm` creates a `Transaction` **and**
advances `nextDueDate`/`status` in one call, with no idempotency key. Letting
it auto-pause-and-queue like every other mutation risks a double-booked
transaction and a skipped due date if it's ever replayed twice (e.g. app
killed mid-replay, then relaunched into another auto-resume). It's excluded
from queueing on purpose — gated to `networkMode: 'always'` (fails immediately
offline instead of queueing) plus a UI-level disabled state — rather than
solved with more sync machinery, since fixing it properly would require a
backend idempotency key that doesn't exist today.

## A blocking bug this surfaced

`ServerWarmupGate` polls the backend health endpoint in an infinite retry loop
and renders nothing but a spinner until it succeeds (built to wait out Cloud
Run cold starts). With no network at all, that loop never resolves, and the
app is stuck on "Waking up the server…" forever — it never reaches the
offline cache. Fixing this (bypass the gate when the device itself has no
connectivity, not just when the server is slow) is a prerequisite for any of
the rest of this to be reachable.

## Also needed: one backend fix

`TransactionService.getTransactionById/updateTransaction/deleteTransaction`
throw a plain `RuntimeException` on a missing id, which renders as an
undifferentiated 500 rather than a 404 (unlike `PlannedPaymentService`, which
already returns 404 correctly). A sync client replaying a queued
delete/update needs to tell "already gone, drop this op" apart from "real
server error" — so this gets the same `ResponseStatusException(NOT_FOUND, ...)`
treatment `PlannedPaymentService` already uses.

## Approach

**Dependencies** (frontend): `@react-native-community/netinfo`,
`@react-native-async-storage/async-storage` (via `expo install`, for
SDK-correct native versions with web shims), `@tanstack/react-query-persist-client`
+ `@tanstack/query-async-storage-persister` (npm, pinned to the installed
`@tanstack/react-query@5.90.12`). No new UUID library — `expo-crypto`
(already a dependency) covers client-side temp ids for optimistic creates.

**Read path**: `onlineManager.setEventListener` fed by `NetInfo.addEventListener`
(`frontend/config/onlineManager.ts`) gives the query client a real
connectivity signal on native, not just web. `PersistQueryClientProvider`
(`frontend/config/persister.ts`, wired into `frontend/app/_layout.tsx`)
persists the query cache to AsyncStorage so cached lists render immediately
after a restart, before any network call succeeds.

**Write path**: extends the optimistic pattern already used by
`useDeleteTransaction`/`useDeletePlannedPayment` (`onMutate` cancel+snapshot+apply,
`onError` rollback, `onSettled` invalidate) to create/update, which today only
patch the cache in `onSuccess` after the server responds — not usable offline,
since a paused mutation never reaches `onSuccess` until it's replayed. Creates
use a `local-<uuid>` temp id, remapped to the server-returned id on success.

**Visibility**: an offline banner (`frontend/components/OfflineBanner.tsx`,
mirroring the existing `InstallPwaPrompt` Snackbar pattern) shows connectivity
state and a pending-mutation count (`useMutationState` filtered to
`state.isPaused`), so queued changes aren't invisible to the user.

## Explicitly out of scope

- Backend idempotency-key/ETag/versioning work beyond the one 404 fix —
  last-write-wins on PUT stays as-is; true conflict detection would need a
  backend schema change this task doesn't take on.
- PWA service-worker offline app-shell caching — a separate, already-closed
  concern (issue #74 explicitly scoped that out).
- Any auth/multi-owner handling beyond what already exists.

## Verification

- Backend: confirm `DELETE`/`GET`/`PUT` on a nonexistent transaction id return
  404, not 500.
- Frontend web: DevTools → Network → Offline, reload — app renders past the
  warmup spinner instead of hanging.
- Populate the cache online, then go offline and restart the app — cached
  lists render immediately.
- While offline, create/edit/delete a transaction and a planned payment — UI
  updates immediately, banner shows a pending count; going back online
  replays queued mutations in order and reconciles temp ids invisibly.
- Attempt to confirm a planned payment while offline — the action is blocked,
  not queued.
