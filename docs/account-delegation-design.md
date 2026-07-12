# Account Delegation (Shared Access) - Solution Design

## Overview
Today, access to an account is 1:1 with a Google identity: `owner` on every entity is derived from the signed-in user's verified email/JWT, and there is no concept of one user acting on another's data (see `docs/google-sso-onboarding-design.md`). This design adds **delegated access**: a user (the "grantor") can invite another existing user (the "manager") to manage their account. Once accepted, the manager can switch into the grantor's account from a profile-switcher in the app header and, for that session, see and edit the grantor's transactions, planned payments, and dashboard exactly as the grantor would — without a second Google sign-in.

## Requirements (confirmed)
- Invites are by email, and only to users who already have a `User` record (no invites to people who've never signed in).
- Two grant roles: **COLLABORATOR** (full read/write parity with the owner) and **READ** (view-only — dashboard/records/planned payments visible, no create/edit/delete).
- A grantor can revoke access at any time; a manager can leave a shared account at any time.
- A manager can hold grants from multiple grantors simultaneously and switch between them.
- Actions taken while acting on a delegated account are attributed via `createdBy`/`modifiedBy` fields, separate from `owner`.
- Invite awareness is in-app only (a bell/notification icon) — no email-sending service is introduced.

---

## Core idea: don't touch existing owner-scoped queries

Every existing query (`TransactionRepository`, `PlannedPaymentRepository`, `BalanceTrendService`, `ExpenseDistributionService`, etc.) already filters strictly by `owner`. Rather than teaching each of those about delegation, this design keeps `owner` meaning exactly what it means today ("whose account this belongs to") and adds a single authorization layer in front of it that resolves an **effective owner** per request:

- If the manager is acting as themselves, effective owner = their own identity (unchanged behavior).
- If the manager has selected a delegated profile, effective owner = the grantor's identity, but only after confirming an `ACCEPTED` grant exists with sufficient role.

This keeps the Datastore-mode aggregation workarounds (`docs/expense-distribution-widget-plan.md`) completely untouched — no new cross-entity joins, no change to how balance/expense aggregation queries work.

---

## Data Model

New entity, `backend/src/main/java/com/lazyspender/backend/model/AccountAccess.java`:

```java
@Entity(name = "accountAccess")
public class AccountAccess {
    @Id
    private String id;
    private String grantorOwner;   // whose account is being shared
    private String granteeOwner;   // who receives access
    private AccessRole role;       // COLLABORATOR | READ
    private AccessStatus status;   // PENDING | ACCEPTED | REJECTED | REVOKED
    private Instant createdAt;
    private Instant respondedAt;
}
```

`AccessRole { COLLABORATOR, READ }`, `AccessStatus { PENDING, ACCEPTED, REJECTED, REVOKED }`.

Repository queries needed (`AccountAccessRepository extends DatastoreRepository<AccountAccess, String>`):
- `findByGranteeOwnerAndStatus(String granteeOwner, AccessStatus status)` — profile switcher list (ACCEPTED) and pending-invite bell (PENDING).
- `findByGrantorOwnerAndStatus(String grantorOwner, AccessStatus status)` — "people who can manage my account" screen.
- `findByGrantorOwnerAndGranteeOwner(String grantorOwner, String granteeOwner)` — checked on invite (prevent duplicates) and on every acting-as request (authorization check).

New composite indexes in `index.yaml` (filtering on two properties together):
```yaml
  - kind: accountAccess
    properties:
      - name: granteeOwner
      - name: status
  - kind: accountAccess
    properties:
      - name: grantorOwner
      - name: status
```

**Attribution** — add to `Transaction` and `PlannedPayment`:
```java
private String createdBy;   // real signed-in identity that performed the action
private String modifiedBy;  // real signed-in identity of the last editor
```
`owner` keeps its current meaning (the effective/acting owner — whose record this is). `createdBy`/`modifiedBy` record who actually pressed the button. When acting as yourself these are identical to `owner`; only diverge under delegation. No composite index needed (not used in filters, only display).

---

## Authorization layer

New `AccountAccessService.resolveEffectiveOwner(String principalOwner, String actingOwnerHeader, AccessRole minimumRole)`:
- `actingOwnerHeader` null or equal to `principalOwner` → return `principalOwner`, no DB check (self-access is always allowed).
- Otherwise, look up `AccountAccess` by `(grantorOwner = actingOwnerHeader, granteeOwner = principalOwner)`. Must exist, be `ACCEPTED`, and have `role` at least `minimumRole` (`COLLABORATOR` satisfies both; `READ` only satisfies a `READ` requirement). If not, throw `ResponseStatusException(HttpStatus.FORBIDDEN)` — matches the codebase's existing pattern of throwing directly from services rather than a global `@ControllerAdvice` (there isn't one today).

This check happens **live on every request** (not cached in the JWT), so a revoke takes effect on the manager's very next call — important since revocation should be immediate, and the JWT is otherwise valid for 24h regardless of grant state.

Controllers gain an `X-Acting-Owner` header, resolved explicitly at the top of each handler, mirroring the existing explicit `request.setOwner(principal.getName())` style rather than introducing an interceptor/AOP:

```java
@PostMapping
public ResponseEntity<TransactionResponse> createTransaction(
        @Valid @RequestBody TransactionRequest request,
        @RequestHeader(value = "X-Acting-Owner", required = false) String actingOwner,
        Principal principal) {
    String owner = accountAccessService.resolveEffectiveOwner(principal.getName(), actingOwner, AccessRole.COLLABORATOR);
    request.setOwner(owner);
    request.setCreatedBy(principal.getName());
    ...
}
```

Endpoints touched: `TransactionController` (all), `PlannedPaymentController` (all), `BalanceTrendController`, `ExpenseDistributionController`, `UserController#getCurrentUser` (dashboard needs the grantor's `User` record — name/accounts list — when viewing their profile). Read-only endpoints (`GET`) require `AccessRole.READ`; mutating endpoints (`POST`/`PUT`/`DELETE`) require `AccessRole.COLLABORATOR`.

---

## Invite lifecycle & endpoints

New `AccountAccessController` under `/api/account-access`:

| Method | Path | Who | Effect |
|---|---|---|---|
| `POST` | `/api/account-access` | grantor | body `{ email, role }`; looks up `User` by email (404 if none — no invites to non-users); rejects self-invite; rejects if a non-`REJECTED`/`REVOKED` grant already exists for that pair; creates `PENDING` |
| `GET` | `/api/account-access/pending` | grantee | invites awaiting *my* response — feeds the bell icon |
| `GET` | `/api/account-access/granted-to-me` | grantee | `ACCEPTED` grants where I'm the grantee — feeds the profile switcher |
| `GET` | `/api/account-access/granted-by-me` | grantor | all grants I've created, any status — feeds the "manage access" screen |
| `POST` | `/api/account-access/{id}/accept` | grantee | `PENDING` → `ACCEPTED` |
| `POST` | `/api/account-access/{id}/reject` | grantee | `PENDING` → `REJECTED` |
| `DELETE` | `/api/account-access/{id}` | grantor | any status → `REVOKED` |
| `DELETE` | `/api/account-access/{id}/leave` | grantee | `ACCEPTED` → `REVOKED` (self-service opt-out) |

All of these authorize by checking the caller's own `principal.getName()` matches `grantorOwner`/`granteeOwner` on the target row — no acting-owner header involved, since managing grants themselves is always done as yourself.

---

## Frontend

**New `AccessContext`** (parallel to `UserContext` in `contexts/`): holds `actingOwner` (persisted via `AsyncStorage`, defaults to the signed-in user's own owner), `myProfiles` (self + `granted-to-me` list, each with a display name and role), and `setActingOwner()`.

**Axios interceptor** in `config/api.ts`: attach `X-Acting-Owner: <actingOwner>` on every request, reading from a small module-level store kept in sync with `AccessContext` (interceptors can't reach React context directly).

**Profile switcher**: a dropdown (`react-native-paper` `Menu`) anchored to an avatar/icon in the drawer header — the "dropdown bar" you described — listing "My Account" plus each accepted delegated profile (grantor's name). Selecting one calls `setActingOwner()` and clears/invalidates all owner-scoped React Query caches (`queryClient.clear()` is simplest and safe here — the dataset genuinely changes wholesale) so every screen refetches under the new acting owner. All existing query-key factories (`TRANSACTION_QUERY_KEYS`, etc.) should fold `actingOwner` into the key so a stale cache from one profile can't leak into another if `clear()` is ever swapped for something narrower later.

**Bell/notification icon** in the header: badge count = `pending` invites count (`GET /api/account-access/pending`, `refetchInterval` — e.g. 60s — no push infra, so this is polling, not real-time). Tapping navigates to a **Manage Access** screen.

**New screen** `app/account-access.tsx` (added to the drawer or reached from the profile menu), three sections:
1. *Pending requests* (mine to respond to) — Accept / Reject.
2. *Shared with me* (accounts I can act on) — Leave.
3. *People I've shared with* (my own grants) — invite form (email + role picker) and Revoke per row.

**Read-only UI enforcement**: when `actingOwner !== self` and the active grant's role is `READ`, hide/disable "Add transaction," "Add planned payment," and edit/delete affordances in `records.tsx`, `planned-payments.tsx`, and the transaction forms. This is UX polish only — the backend 403 is the actual enforcement, since a disabled button is trivially bypassable by hitting the API directly.

**403 handling**: if a request comes back 403 with an acting-owner header set (e.g. access was revoked mid-session), the axios response interceptor should reset `actingOwner` to self and surface a toast ("Access to this account was removed"), then let the caller retry against their own profile.

---

## Explicitly out of scope for v1
- Inviting users who've never signed in (no email-sending service exists; would need pending-invite-by-email reconciliation on first login).
- Real-time push for invites (bell icon is polling only).
- Per-feature permission granularity beyond COLLABORATOR/READ (e.g. "can manage planned payments but not delete transactions").
- Any change to how `BalanceTrendService`/`ExpenseDistributionService` aggregate — they keep querying by `owner` exactly as today.
- Audit log/history UI for `createdBy`/`modifiedBy` (fields are captured now so this can be built later without a migration).

## Open questions before implementation
1. **Invite lookup by email is not currently exposed anywhere** (`GET /api/users` returns *all* users unscoped — likely a pre-existing gap, not something to reuse for this). Should the invite endpoint do the email→User lookup server-side only (no separate public "search users" endpoint, avoiding any email-enumeration surface), returning a generic 404 if no match? That's the assumption baked into the table above — flag if you want a different tradeoff.
2. **Re-inviting after a REJECTED/REVOKED grant** — should this transition the existing row back to `PENDING`, or always insert a new row (keeping REJECTED/REVOKED ones as history)? Table above assumes reuse-if-terminal, fresh insert otherwise; history-keeping favors a new row each time instead.
3. **Dashboard identity while acting on a delegated account** — should the header/dashboard clearly label whose account you're viewing (e.g. "Viewing: Alice's account") at all times to avoid a manager mistakenly thinking they're on their own profile? Recommend yes, but flagging since it's a UX call, not yet designed in detail here.
