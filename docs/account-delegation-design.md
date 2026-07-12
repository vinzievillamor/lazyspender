# Account Delegation (Shared Access) - Solution Design

## Overview
Today, access to an account is 1:1 with a Google identity: `owner` on every entity is derived from the signed-in user's verified email/JWT, and there is no concept of one user acting on another's data (see `docs/google-sso-onboarding-design.md`). This design adds **delegated access**: a user (the **owner**) can invite another existing user (the **delegate**) to manage their account. Once accepted, the delegate can switch into the owner's account from a profile-switcher in the app header and, for that session, see and edit the owner's transactions, planned payments, and dashboard exactly as the owner would — without a second Google sign-in.

## Naming convention
This design deliberately uses two role words, and nothing else, for the two sides of a grant:
- **owner** — the account holder sharing access to their data. (Matches the existing `owner` field already used on every entity — this design doesn't introduce a new meaning for it, just a new way to resolve it per request.)
- **delegate** — the person granted access to act on someone else's account. (Earlier drafts of this doc called this person "grantee" or "manager" interchangeably — consolidated to one term.)

Anywhere the "logged-in acting identity" needs a name distinct from "owner" (e.g. for `createdBy`/`modifiedBy` attribution), it's called the **requesting user** — never "owner," since a delegate never actually owns the account they're acting on.

## Requirements (confirmed)
- Invites are by email, and only to users who already have a `User` record (no invites to people who've never signed in).
- Two grant roles: **COLLABORATOR** (full read/write parity with the owner) and **READ** (view-only — dashboard/records/planned payments visible, no create/edit/delete).
- An owner can revoke access at any time; a delegate can leave a shared account at any time.
- A delegate can hold grants from multiple owners simultaneously and switch between them.
- Actions taken while acting on a delegated account are attributed via `createdBy`/`modifiedBy` fields, separate from `owner`.
- Invite awareness is in-app only (a bell/notification icon) — no email-sending service is introduced.

---

## Core idea: don't touch existing owner-scoped queries

Every existing query (`TransactionRepository`, `PlannedPaymentRepository`, `BalanceTrendService`, `ExpenseDistributionService`, etc.) already filters strictly by `owner`. Rather than teaching each of those about delegation, this design keeps `owner` meaning exactly what it means today ("whose account this belongs to") and adds a single authorization layer in front of it that resolves the request's **owner** value fresh each time:

- If the delegate is acting as themselves, the resolved owner = their own identity (unchanged behavior).
- If the delegate has selected a delegated profile, the resolved owner = that owner's identity, but only after confirming an `ACCEPTED` grant exists with sufficient role.

This keeps the Datastore-mode aggregation workarounds (`docs/expense-distribution-widget-plan.md`) completely untouched — no new cross-entity joins, no change to how balance/expense aggregation queries work.

---

## Data Model

New entity, `backend/src/main/java/com/lazyspender/backend/model/AccountAccess.java`, following the same Lombok shape as the existing `Transaction`/`PlannedPayment` models (`@Data` + `@Builder(toBuilder = true)` + both constructors, so there's no hand-written getter/setter/builder boilerplate to maintain):

```java
@Entity(name = "accountAccess")
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class AccountAccess {
    @Id
    private String id;
    private String owner;      // whose account is being shared
    private String delegate;   // who receives access
    private AccessRole role;       // COLLABORATOR | READ
    private AccessStatus status;   // PENDING | ACCEPTED | REJECTED | REVOKED
    private Instant createdAt;
    private Instant respondedAt;
}
```

`AccessRole { COLLABORATOR, READ }`, `AccessStatus { PENDING, ACCEPTED, REJECTED, REVOKED }`.

Re-invites always insert a **new row** rather than resurrecting an old one — `REJECTED`/`REVOKED` rows are kept as history (visible in "People I've shared with"). This means an `(owner, delegate)` pair can have several historical rows over time, but at most one row in an "active" status (`PENDING` or `ACCEPTED`) at once — enforced at invite time.

Repository queries needed (`AccountAccessRepository extends DatastoreRepository<AccountAccess, String>`):
- `findByDelegateAndStatus(String delegate, AccessStatus status)` — profile switcher list (ACCEPTED) and pending-invite bell (PENDING).
- `findByOwnerAndStatus(String owner, AccessStatus status)` — "people who can manage my account" screen (call separately per status, or fetch all and let the frontend group by status, to also show REJECTED/REVOKED history).
- `findByOwnerAndDelegateAndStatus(String owner, String delegate, AccessStatus status)` — the authorization check (looks specifically for an `ACCEPTED` row for the pair; at most one can exist given the invariant above). Also reused for the duplicate-invite guard: called once for `PENDING` and once for `ACCEPTED` and combined in the service, rather than a single `findByOwnerAndDelegateAndStatusIn(..., List<AccessStatus>)` — Datastore mode's derived-query support doesn't implement the `IN`/`IsIn` predicate keyword (confirmed at runtime: `DatastoreDataException: Unsupported predicate keyword: IN`), so an `In`-suffixed method throws rather than filtering.

New composite indexes in `index.yaml` (filtering on two properties together):
```yaml
  - kind: accountAccess
    properties:
      - name: delegate
      - name: status
  - kind: accountAccess
    properties:
      - name: owner
      - name: status
```

**Attribution** — add to `Transaction` and `PlannedPayment`:
```java
private String createdBy;   // real signed-in identity that performed the action
private String modifiedBy;  // real signed-in identity of the last editor
```
`owner` keeps its current meaning (whose record this is — the account being acted on, self or delegated). `createdBy`/`modifiedBy` record the requesting user who actually pressed the button. When acting as yourself these are identical to `owner`; only diverge under delegation. No composite index needed (not used in filters, only display).

---

## Authorization layer

**Decision: resolve and validate `X-Delegated-Owner` in one filter, not per-endpoint.** A per-controller header check (as originally sketched) means every new or modified endpoint has to remember to call it — one missed call silently trusts the wrong owner, or worse, trusts the client-supplied `owner` in a request body outright. Instead, this is enforced exactly once, in the filter chain, before any controller runs at all — mirroring how `JwtAuthenticationFilter` already establishes identity today (`backend/src/main/java/com/lazyspender/backend/security/JwtAuthenticationFilter.java`).

New `DelegatedAccessFilter extends OncePerRequestFilter`, registered via `http.addFilterAfter(delegatedAccessFilter, ExceptionTranslationFilter.class)` in `SecurityConfig` — **not** `addFilterAfter(..., JwtAuthenticationFilter.class)` as originally sketched here. Confirmed at runtime: `JwtAuthenticationFilter` sits early in Spring Security's default chain (well before `ExceptionTranslationFilter`), so registering `DelegatedAccessFilter` immediately after it means `assertAccess`'s `AccessDeniedException` propagates through filters that ran *before* `ExceptionTranslationFilter` ever gets a chance to catch it, and escapes as an uncaught 500 instead of a 403. Placing it after `ExceptionTranslationFilter` instead puts it inside that filter's try/catch scope (which wraps everything downstream, including `AuthorizationFilter` and the controller) while still running well after the `Authentication` has already been set by `JwtAuthenticationFilter`.

**Where the requesting user gets stashed**: rather than threading it through an `Authentication`/`Principal` parameter on every controller method (touching every method signature to expose one extra string), or a request-scoped bean (still means adding a constructor parameter to every controller/service that needs it), this goes on a static holder, `AuthContext` (`backend/src/main/java/com/lazyspender/backend/security/AuthContext.java`) — the one place both the resolved owner and the real signed-in requesting user are read from. It mirrors exactly how Spring Security's own `SecurityContextHolder` already works in this codebase: a static class backed by a `ThreadLocal`, called directly with no injection anywhere. Lombok's `@UtilityClass` removes the usual private-constructor/`static`-modifier boilerplate that pattern requires — it makes the class `final`, gives it a private constructor, and implicitly makes every field/method static:

```java
@UtilityClass
public class AuthContext {
    private final ThreadLocal<String> requestingUser = new ThreadLocal<>();

    public String getOwner() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    public String getRequestingUser() {
        String user = requestingUser.get();
        return user != null ? user : getOwner();
    }

    void setRequestingUser(String user) {
        requestingUser.set(user);
    }

    void clear() {
        requestingUser.remove();
    }
}
```

`DelegatedAccessFilter` (still `@Component @RequiredArgsConstructor`-injected with `AccountAccessService`, like any other Spring-managed collaborator — only the identity holder itself is static) sets `AuthContext` directly and clears it in a `finally` block. A bare `ThreadLocal` left set after the response is written would otherwise leak into whichever next request the servlet container hands the same pooled thread:

```java
@Override
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
    try {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String delegatedOwner = request.getHeader("X-Delegated-Owner");

        if (auth != null && delegatedOwner != null && !delegatedOwner.equals(auth.getName())) {
            AccessRole required = HttpMethod.GET.matches(request.getMethod()) ? AccessRole.READ : AccessRole.COLLABORATOR;
            accountAccessService.assertAccess(delegatedOwner, auth.getName(), required); // throws AccessDeniedException if not ACCEPTED / insufficient role
            AuthContext.setRequestingUser(auth.getName());
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(delegatedOwner, null, Collections.emptyList()));
        }

        chain.doFilter(request, response);
    } finally {
        AuthContext.clear();
    }
}
```

`assertAccess` throws `org.springframework.security.access.AccessDeniedException`, which Spring Security's own `ExceptionTranslationFilter` (already part of the chain) turns into a 403 — no custom `@ControllerAdvice` needed.

This check happens **live on every request** (not cached in the JWT), so a revoke takes effect on the delegate's very next call — the JWT itself stays valid for 24h regardless of grant state, so this is the only thing making revocation actually immediate.

**Why this is a bigger win than it first looks**: `TransactionController`, `PlannedPaymentController`, `BalanceTrendController`, `ExpenseDistributionController`, `UserController#getCurrentUser` need **no signature or constructor changes at all** — they already call `principal.getName()` for owner scoping today, and can switch that one call to the static `AuthContext.getOwner()` (equivalent value once the filter has run) or drop the `Principal`/`Authentication` parameter entirely. Create/update endpoints that need attribution call `AuthContext.getRequestingUser()` the same way — nothing added to the constructor, nothing to inject:

```java
@RequiredArgsConstructor
public class TransactionController {
    private final TransactionService transactionService;

    @PostMapping
    public ResponseEntity<TransactionResponse> createTransaction(@Valid @RequestBody TransactionRequest request) {
        request.setOwner(AuthContext.getOwner());
        request.setCreatedBy(AuthContext.getRequestingUser());
        ...
    }
}
```

The client still sends `X-Delegated-Owner` (it has to say *which* profile it wants — there's no server-side session to remember that in a stateless JWT API), but the header is meaningless without a validated `ACCEPTED` grant behind it; the filter is the only thing that can turn it into a trusted identity, and `AuthContext` is the only place that identity is read back out.

---

## Invite lifecycle & endpoints

New `AccountAccessController` under `/api/account-access`:

| Method | Path | Who | Effect |
|---|---|---|---|
| `POST` | `/api/account-access` | owner | body `{ email, role }`; looks up `User` by email (404 if none — no invites to non-users); rejects self-invite; rejects if an active (`PENDING`/`ACCEPTED`) grant already exists for that pair; always inserts a **new** row (history is kept, never mutates a past `REJECTED`/`REVOKED` row) |
| `GET` | `/api/account-access/pending` | delegate | invites awaiting *my* response — feeds the bell icon |
| `GET` | `/api/account-access/granted-to-me` | delegate | `ACCEPTED` grants where I'm the delegate — feeds the profile switcher (response includes the owner's `name`/`pictureUrl`, denormalized from `UserRepository.findByOwner`, so the UI never has to resolve an owner string to a display name itself) |
| `GET` | `/api/account-access/granted-by-me` | owner | all grants I've created, every status, oldest-first — feeds the "manage access" screen including history |
| `POST` | `/api/account-access/{id}/accept` | delegate | `PENDING` → `ACCEPTED` |
| `POST` | `/api/account-access/{id}/reject` | delegate | `PENDING` → `REJECTED` |
| `DELETE` | `/api/account-access/{id}` | owner | `PENDING`/`ACCEPTED` → `REVOKED` |
| `DELETE` | `/api/account-access/{id}/leave` | delegate | `ACCEPTED` → `REVOKED` (self-service opt-out) |

All of these authorize by checking the caller's own identity matches `owner`/`delegate` on the target row. **`/api/account-access/**` is excluded from `DelegatedAccessFilter`'s header resolution** (skipped by path, same as the existing `/api/auth/**` public-path carve-out in `SecurityConfig`) — managing your own grants always uses your real signed-in identity, never a delegated one. Otherwise a delegate currently switched into a delegated profile could end up creating/revoking grants under the owner's identity instead of their own, just because the frontend happened to still have `X-Delegated-Owner` attached to that request.

---

## Frontend

**New `AccessContext`** (parallel to `UserContext` in `contexts/`): holds `delegatedOwner` (persisted via `AsyncStorage`, defaults to the signed-in user's own owner), `myProfiles` (self + `granted-to-me` list, each with a display name and role), and `setDelegatedOwner()`.

**Axios interceptor** in `config/api.ts`: attach `X-Delegated-Owner: <delegatedOwner>` on every request, reading from a small module-level store kept in sync with `AccessContext` (interceptors can't reach React context directly).

**Profile switcher**: a dropdown (`react-native-paper` `Menu`) anchored to an avatar/icon in the drawer header — the "dropdown bar" you described — listing "My Account" plus each accepted delegated profile (owner's name). Selecting one calls `setDelegatedOwner()` and clears/invalidates all owner-scoped React Query caches (`queryClient.clear()` is simplest and safe here — the dataset genuinely changes wholesale) so every screen refetches under the newly selected owner. All existing query-key factories (`TRANSACTION_QUERY_KEYS`, etc.) should fold `delegatedOwner` into the key so a stale cache from one profile can't leak into another if `clear()` is ever swapped for something narrower later.

**"Viewing as" label**: whenever `delegatedOwner !== self`, a persistent banner/chip (e.g. under the drawer header, always visible, not just on first switch) reads "Viewing: `<owner's name>`'s account". This is the same avatar/menu used for switching, so it doubles as both indicator and the way back to "My Account" — the goal is a delegate can never lose track of whose data they're looking at, especially before creating/editing a transaction.

**Bell/notification icon** in the header: badge count = `pending` invites count (`GET /api/account-access/pending`, `refetchInterval` — e.g. 60s — no push infra, so this is polling, not real-time). Tapping navigates to a **Manage Access** screen.

**New screen** `app/account-access.tsx` (added to the drawer or reached from the profile menu), three sections:
1. *Pending requests* (mine to respond to) — Accept / Reject.
2. *Shared with me* (accounts I can act on) — Leave.
3. *People I've shared with* (my own grants) — invite form (email + role picker) and Revoke per row.

**Read-only UI enforcement**: when `delegatedOwner !== self` and the active grant's role is `READ`, hide/disable "Add transaction," "Add planned payment," and edit/delete affordances in `records.tsx`, `planned-payments.tsx`, and the transaction forms. This is UX polish only — the backend 403 is the actual enforcement, since a disabled button is trivially bypassable by hitting the API directly.

**403 handling**: if a request comes back 403 with a delegated-owner header set (e.g. access was revoked mid-session), the axios response interceptor should reset `delegatedOwner` to self and surface a toast ("Access to this account was removed"), then let the caller retry against their own profile.

---

## Explicitly out of scope for v1
- Inviting users who've never signed in (no email-sending service exists; would need pending-invite-by-email reconciliation on first login).
- Real-time push for invites (bell icon is polling only).
- Per-feature permission granularity beyond COLLABORATOR/READ (e.g. "can manage planned payments but not delete transactions").
- Any change to how `BalanceTrendService`/`ExpenseDistributionService` aggregate — they keep querying by `owner` exactly as today.
- Audit log/history UI for `createdBy`/`modifiedBy` (fields are captured now so this can be built later without a migration).

## Resolved decisions
1. **Invite lookup** — done server-side only, inside `POST /api/account-access`. No separate "search users" endpoint is exposed (the existing unscoped `GET /api/users` is a pre-existing gap, not reused here); an email with no matching `User` returns a plain 404.
2. **Re-invite history** — always insert a new `AccountAccess` row; `REJECTED`/`REVOKED` rows are retained as history and shown in "People I've shared with." Duplicate-invite guard checks only *active* (`PENDING`/`ACCEPTED`) rows for the pair.
3. **"Viewing as" label** — persistent, always visible while acting on a delegated profile (see Frontend section above), not just a one-time toast on switch.
4. **Authorization enforcement point** — a single `DelegatedAccessFilter` (not a per-endpoint header check) resolves and validates `X-Delegated-Owner` once, before any controller runs; see Authorization layer above. `/api/account-access/**` itself is excluded from this resolution so managing your own grants is never accidentally done under a delegated identity.
5. **Identity holder shape** — `AuthContext` is a static Lombok `@UtilityClass` over a `ThreadLocal`, not a request-scoped Spring bean, matching how `SecurityContextHolder` already works in this codebase. No constructor injection is needed in any controller/service that reads it; `DelegatedAccessFilter` is the only place that writes to it, and clears it in a `finally` block so nothing leaks across pooled threads.
6. **Naming convention** — **owner**/**delegate** replace the earlier grantor/grantee/manager terminology; `AuthContext.getOwner()`/`getRequestingUser()` replace `getEffectiveOwner()`/`getActualOwner()`; the `X-Delegated-Owner` header replaces `X-Acting-Owner`; `DelegatedAccessFilter` replaces `ActingOwnerFilter`. See Naming convention section above.
