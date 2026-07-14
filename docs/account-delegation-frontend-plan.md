# Account delegation — frontend implementation plan

## Context

The backend authorization layer for account delegation (owner/delegate sharing) shipped on 2026-07-12 (`430cc30 feat(backend): implement account delegation authorization layer`, committed, compiling). It's live at `/api/account-access/**` and every existing controller (`TransactionController`, `PlannedPaymentController`, `UserController`) already resolves the effective owner via the new `AuthContext.getOwner()` static holder instead of a client-supplied value — confirmed by reading those controllers. The frontend has nothing for this yet: no `AccessContext`, no `X-Delegated-Owner` header, no profile switcher, no accept/reject/manage UI. This plan implements the frontend half described in `docs/account-delegation-design.md`, following the existing three-layer pattern (`services/*.service.ts` → `hooks/use*.ts` → screens/components) used by every other domain in this app.

Full design reference: `docs/account-delegation-design.md`. Backend contract confirmed by reading `AccountAccessController.java`, `AccountAccessRequest/Response.java`, `AccessRole`/`AccessStatus` enums directly — endpoints, payload shapes, and role semantics below are exact, not inferred.

## Data layer

**`frontend/types/accountAccess.ts`** (new) — mirrors the backend DTOs exactly:
```ts
export enum AccessRole { COLLABORATOR = 'COLLABORATOR', READ = 'READ' }
export enum AccessStatus { PENDING = 'PENDING', ACCEPTED = 'ACCEPTED', REJECTED = 'REJECTED', REVOKED = 'REVOKED' }
export interface AccountAccess {
  id: string; owner: string; delegate: string; role: AccessRole; status: AccessStatus;
  createdAt: string; respondedAt?: string; ownerName?: string; ownerPictureUrl?: string;
}
export interface CreateAccountAccessRequest { email: string; role: AccessRole; }
```

**`frontend/services/accountAccess.service.ts`** (new) — same shape as `plannedPayment.service.ts`: one exported async function per endpoint, using `apiClient` directly (`createInvite`, `getPending`, `getGrantedToMe`, `getGrantedByMe`, `acceptInvite`, `rejectInvite`, `revokeAccess`, `leaveAccess`), hitting the exact paths in `AccountAccessController` (`POST /api/account-access`, `GET /pending`, `GET /granted-to-me`, `GET /granted-by-me`, `POST /{id}/accept`, `POST /{id}/reject`, `DELETE /{id}`, `DELETE /{id}/leave`).

**`frontend/hooks/useAccountAccess.ts`** (new) — `ACCOUNT_ACCESS_QUERY_KEYS` factory (`all`/`pending`/`grantedToMe`/`grantedByMe`, matching the `PLANNED_PAYMENT_QUERY_KEYS` shape) plus:
- `usePendingInvites()` — `useQuery`, `refetchInterval: 60_000` (polling, no push infra per design doc).
- `useGrantedToMe()`, `useGrantedByMe()` — plain `useQuery`.
- `useCreateInvite()`, `useAcceptInvite()`, `useRejectInvite()`, `useRevokeAccess()`, `useLeaveAccess()` — `useMutation`, each invalidating the relevant query keys on success (e.g. accept invalidates both `pending` and `grantedToMe`; revoke invalidates `grantedByMe`; create invalidates `grantedByMe`).

## Delegated-owner persistence

**`frontend/config/delegatedOwnerStorage.ts`** (new) — same get/set/clear shape as `config/authStorage.ts` (web falls back to `localStorage`, native uses `expo-secure-store`; no new dependency — the design doc says "AsyncStorage" but that package isn't installed here, `expo-secure-store` is the existing convention and already handles both platforms).

## API client wiring

**`frontend/config/api.ts`** (edit):
- Add a module-level `let delegatedOwner: string | null = null;` with `setDelegatedOwnerHeader(owner: string | null)`, mirroring the existing `onUnauthorized` pattern (interceptors can't reach React context directly, per the existing comment on that pattern).
- In the request interceptor, after the existing auth header, attach `X-Delegated-Owner` when `delegatedOwner` is set.
- Add `setAccessRevokedHandler(handler: (() => void) | null)` (same shape as `setUnauthorizedHandler`). In the response interceptor, on a `403` when `delegatedOwner` was set for that request, call the handler instead of (or in addition to) the generic error log — this is the "access revoked mid-session" case from the design doc.

## AccessContext

**`frontend/contexts/AccessContext.tsx`** (new), modeled on `UserContext.tsx` + `AuthContext.tsx`:
- On mount, loads the persisted delegated owner from `delegatedOwnerStorage`, and fetches `useGrantedToMe()` to build `myProfiles`: `[{ owner: user.owner, label: 'My Account', role: null }, ...accepted.map(a => ({ owner: a.owner, label: a.ownerName ?? a.owner, role: a.role, pictureUrl: a.ownerPictureUrl }))]`.
- Exposes `{ delegatedOwner, isDelegated, activeRole, myProfiles, setDelegatedOwner }`. `activeRole` is looked up from `myProfiles` for the current `delegatedOwner` (null/COLLABORATOR = full access, `READ` = view-only) — this is what screens use for the read-only UI gating.
- `setDelegatedOwner(owner)`: persists via `delegatedOwnerStorage`, updates the `api.ts` module store via `setDelegatedOwnerHeader`, then `queryClient.clear()` (the design doc calls this "simplest and safe" for v1 — the whole dataset changes wholesale on a profile switch; folding `delegatedOwner` into every existing query-key factory is explicitly deferred in the doc and out of scope here).
- Registers `setAccessRevokedHandler` in a `useEffect`: on trigger, resets to self, clears the query cache, and sets a message string that renders as a `react-native-paper` `Snackbar` (no existing toast/snackbar pattern in this codebase — this is the first use of it, kept local to this context rather than building a global toast system).
- Must be nested inside `UserProvider` (needs `useUser()` for the self owner) — goes in `app/_layout.tsx` inside the existing `isAuthenticated ? <UserProvider>{drawer}</UserProvider>` branch: `<UserProvider><AccessProvider>{drawer}</AccessProvider></UserProvider>`.

## Header UI — profile switcher + pending bell

**`frontend/components/ProfileSwitcherMenu.tsx`** (new) — `react-native-paper` `Menu` anchored on an `Avatar.Text`/`IconButton`, per the design doc doubling as both the switch control and the "viewing as" indicator (no separate banner component needed — when `isDelegated`, the anchor shows the delegated owner's label instead of a generic avatar, so it's visibly different at a glance). Menu items: each `myProfiles` entry (self first) calls `setDelegatedOwner`, plus a trailing "Manage Access" item that navigates to `/account-access`.

**`frontend/components/PendingInvitesBell.tsx`** (new) — `IconButton` (`bell` icon) with a `Badge` showing `usePendingInvites().data?.length`, `onPress` navigates to `/account-access`. Hidden/zero when count is 0.

**`frontend/app/_layout.tsx`** (edit): add `headerRight: () => <View style={{flexDirection:'row'}}><PendingInvitesBell /><ProfileSwitcherMenu /></View>` to the `Drawer`'s `screenOptions` (applies across all protected screens, so it's visible everywhere, not just when the drawer is open — resolves the design doc's "always visible" requirement better than putting it in `CustomDrawerContent`, which is only visible when the drawer is swiped open). Add a hidden `Drawer.Screen name="account-access"` (`drawerItemStyle: { display: "none" }`, same pattern as `index`).

## Manage Access screen

**`frontend/app/account-access.tsx`** (new) — three sections per the design doc, each backed by the corresponding hook:
1. **Pending requests** (`usePendingInvites`) — Accept/Reject buttons per row (`useAcceptInvite`/`useRejectInvite`).
2. **Shared with me** (`useGrantedToMe`, filtered to `ACCEPTED`) — Leave button (`useLeaveAccess`).
3. **People I've shared with** (`useGrantedByMe`, all statuses) — invite form (email `TextInput` + role `SegmentedButtons` for COLLABORATOR/READ, `useCreateInvite`) at the top, then a list with Revoke per active row (`useRevokeAccess`).

Simple `ScrollView`/`FlatList` sections following the loading/error/empty patterns already used in `records.tsx` (`ActivityIndicator` while loading, retry `Button` on error, empty-state text) — no modal needed, this is a dedicated screen.

## Read-only enforcement (COLLABORATOR vs READ)

Backend 403 is the real enforcement (per design doc) — this is UX polish only, gating the same affordances already in `records.tsx`/`planned-payments.tsx`:
- **`frontend/app/records.tsx`**: read `const { activeRole } = useAccessContext()`; when `activeRole === AccessRole.READ`, don't render the `FAB` (line ~192) and pass a no-op/disabled `onDelete` to `SwipeableTransactionItem` (or skip rendering the swipe actions).
- **`frontend/app/planned-payments.tsx`**: same gating on its `FAB` and on `PlannedPaymentDetailModal`'s `onEdit`/`onDelete` props.

## Explicitly out of scope (matches design doc's "out of scope for v1")

- Folding `delegatedOwner` into every existing query-key factory (`queryClient.clear()` covers it for v1).
- Real-time push for invites (polling only, per doc).
- Any change to `BalanceTrendService`/`ExpenseDistributionService` — untouched, they keep working because they already read `AuthContext.getOwner()` server-side.
- Backend changes of any kind — that layer is done and committed.

## Verification

1. `cd frontend && npm run lint` — no new lint errors.
2. Manual smoke test via `/run` (Expo web is fastest to iterate): sign in as the existing user, confirm the header now shows the profile switcher (self only, no delegated profiles yet) and no bell badge.
3. Create a second `User` record (or use an existing second account) and send an invite via the new Manage Access screen; accept it from the delegate side; confirm the profile switcher lists it, switching populates `records`/`dashboard` with the owner's data, and `X-Delegated-Owner` is visible in the network request headers.
4. Set the grant to `READ` and confirm the FAB/edit/delete affordances disappear in `records.tsx`/`planned-payments.tsx` while viewing that profile, and that a direct API call (or COLLABORATOR-only action attempted anyway) still gets a 403 from the backend.
5. Revoke access from the owner side while the delegate is actively viewing that profile, then trigger a request (pull-to-refresh) — confirm the Snackbar fires and the view resets to "My Account".
