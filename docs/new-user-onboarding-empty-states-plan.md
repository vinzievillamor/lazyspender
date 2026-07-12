# New User Onboarding — Empty States & Errors

## Overview

Since Google SSO shipped (`docs/google-sso-onboarding-design.md`), a brand-new
sign-in auto-provisions a `User` with zero `Transaction`s, zero
`PlannedPayment`s, and — critically — **no `accounts`**. That last gap is the
root cause of most of what looks like "the app is broken for new users":
Dashboard silently shows nothing, Records shows a blank screen, and the "+"
button on Records/Planned Payments crashes outright the first time a new user
taps it.

None of this is a backend aggregation bug. `BalanceTrendService` and
`ExpenseDistributionService` already degrade cleanly to zero on empty
Datastore results (see Root Causes below). The problems are: (1) an
onboarding gap — `accounts` never gets populated — and (2) frontend code that
doesn't defend against that gap, plus (3) inconsistent/missing empty-state UI.

Scope is deliberately narrow: fix crashes and empty-state gaps for zero-data
new users. **Not** in scope: a first-run tutorial/wizard or other onboarding
polish beyond that.

---

## Root Causes

### 1. `accounts` is a real, used field — just never populated on SSO signup

`User.accounts` (`backend/.../model/User.java`) is not dead code:

- **Read** by `BalanceTrendController` / `ExpenseDistributionController` as a
  required query param (no default, not `required=false`) — a request
  without it is a 400 at the controller boundary.
- **Read** by `BalanceTrendWidget.tsx` / `ExpenseDistributionWidget.tsx` to
  seed `selectedAccounts`, which gates the whole query
  (`enabled: !!user?.owner && selectedAccounts.length > 0`).
- **Read** by `TransactionFormModal.tsx` / `PlannedPaymentFormModal.tsx` to
  build the mandatory "which account" `Chip` picker when creating a
  transaction or planned payment.
- **Written** only via `POST /api/users` → `UserService.create` — a path the
  Google SSO auto-provisioning flow (`AuthService.java`) never calls. SSO
  hand-builds the `User` entity directly and only sets `id`, `owner`,
  `googleId`, `email`, `name`, `pictureUrl`. `accounts` stays `null`.
- There is no frontend UI anywhere to add/edit a user's `accounts` after the
  fact, so a Google SSO user currently has **no way to ever set this field**
  short of a manual `POST /api/users` call.
- Note: `Transaction.account` / `PlannedPayment.account` are free-text
  strings populated from this picker — there's no server-side check that a
  transaction's `account` is actually one of the owning user's `accounts`.
  That's an existing, unrelated looseness — not something this plan changes.

**Given this, populating `accounts` at SSO signup (not removing the field) is
the fix** — the original framing of "is this dead code?" turned out not to
apply; the field is load-bearing for two dashboard widgets and both
create-transaction/create-payment forms.

### 2. Frontend code assumes `user.accounts` is non-empty

Four call sites use `user?.accounts` where only `user` is guarded, not
`.accounts` — both a real `null` in the DB and a `[]` after the fix below
would still need a check at the `.length === 0` boundary since these index
into `[0]`:

- `TransactionFormModal.tsx:41` — `account: user?.accounts[0]`
- `TransactionFormModal.tsx:218` — `user?.accounts.map(...)`
- `PlannedPaymentFormModal.tsx:53` — `account: user?.accounts[0]`
- `PlannedPaymentFormModal.tsx:213` — `user?.accounts.map(...)`

All four throw `TypeError: Cannot read properties of undefined` today the
instant a new user opens either "create" modal — reachable from the FAB on
both Records and Planned Payments. This is the most acute bug: a new user's
very first action after seeing an empty list crashes the app.

### 3. Empty-state UI is inconsistent across the three screens

| Screen | Current behavior for zero data | Verdict |
|---|---|---|
| Planned Payments | `ListEmptyComponent` with "No planned payments yet" + subtext (`app/planned-payments.tsx:116-125`) | Correct, reuse as the template |
| Dashboard (Balance Trend, Expense Distribution) | Falls through to a "No transaction data available for the selected period and accounts" message — but the real reason is "no accounts configured," which the message doesn't say | Present but misleading |
| Records | No empty-state branch at all — `FlatList` has no `ListEmptyComponent`, so a new user sees a blank screen with just a floating FAB | Missing entirely |

There's also no shared `EmptyState`/`LoadingSpinner` component — every
screen/widget hand-rolls its own `ActivityIndicator` + `Text`, duplicated
near-identically in `records.tsx`, `planned-payments.tsx`,
`BalanceTrendWidget.tsx`, `ExpenseDistributionWidget.tsx`. Planned Payments'
inline pattern is the closest thing to a reusable template today.

### Backend aggregation is not the problem

Checked `BalanceTrendService`, `ExpenseDistributionService`,
`PlannedPaymentService`, `TransactionService` specifically for zero-record
owners — every path already handles Datastore's empty-result behavior
(`SUM(...)` returning `null` → coerced to `0`; empty query results iterated
safely; no `.get(0)`/unguarded indexing found). The one backend-side
requirement to relax is the required `accounts` query param on
`BalanceTrendController` / `ExpenseDistributionController`, called out below.

---

## Plan

### Backend

1. **Populate `accounts` on first SSO signup.** In `AuthService.java`, when
   creating a new `User` (the `.orElseGet(...)` branch), set a sensible
   default `accounts` list rather than leaving it `null`. Needs a product
   decision on the default set (e.g. `["Cash"]`, or something configurable) —
   flag this as an open question for the implementation session.
2. **Relax `accounts` as a required param** on `BalanceTrendController` /
   `ExpenseDistributionController` (`required = false`, default empty) so a
   user with no accounts gets a clean empty response instead of a 400 if the
   frontend gate in fix #2 below is ever loosened or bypassed.
3. Consider a one-off backfill (`migration/`, triggered via
   `BackfillController` per existing convention) for any already-provisioned
   SSO users left with `accounts == null` from before this fix ships.

### Frontend

4. **Fix the four crash sites** in `TransactionFormModal.tsx` and
   `PlannedPaymentFormModal.tsx` — guard `.accounts` itself (`user?.accounts?.[0]`,
   `user?.accounts?.map(...) ?? []`), and design what the picker/initial form
   value should be when the list is genuinely empty (disable submission with
   a message, or fall back to a default "Cash" chip — decide alongside #1).
5. **Add an empty state to Records** (`app/records.tsx`), following the
   Planned Payments pattern (`ListEmptyComponent`, "No records yet" + a hint
   to add one via the FAB).
6. **Disambiguate the Dashboard empty message** — Balance Trend / Expense
   Distribution should be able to tell "no accounts configured" apart from
   "no transactions in this date range" and say so explicitly, rather than
   one generic string for both.
7. Optional cleanup while touching these files: `BalanceTrendWidget.tsx` has
   an orphaned account-filter picker (`accountsSection`/`checkboxContainer`/
   `checkboxItem` styles + `toggleAccount`) that's defined but never rendered
   — worth deciding whether to wire it up or delete it rather than leave it
   dead.
8. If a consistent empty-state look is wanted across all three screens,
   extract a shared `EmptyState` component instead of the current
   copy-pasted `ActivityIndicator` + `Text` blocks — nice-to-have, not
   required to fix the reported bugs.

### Suggested order for the implementation session

Fix #4 (crash) first — it's the most severe, self-contained, and needed
regardless of how #1's default-accounts product question is resolved. Then
#1 (SSO onboarding default) and #2 (backend param), which are coupled. Then
#5/#6 (empty states), which are independent of the others and can land
separately.

---

## Key files

Backend: `model/User.java`, `service/AuthService.java`,
`service/UserService.java`, `controller/BalanceTrendController.java`,
`controller/ExpenseDistributionController.java`.

Frontend: `app/dashboard.tsx`, `app/records.tsx`, `app/planned-payments.tsx`,
`components/BalanceTrendWidget.tsx`, `components/ExpenseDistributionWidget.tsx`,
`components/TransactionFormModal.tsx`,
`components/planned-payments/PlannedPaymentFormModal.tsx`, `types/user.ts`.
