# Google SSO Onboarding - Solution Design

## Overview
Today there is no authentication: the frontend hardcodes a single `owner` string (`"villamorvinzie"`) in `UserProvider`, and the backend trusts whatever `owner` a client sends. This design introduces real onboarding — new users sign in with their Gmail account (Google as the sole identity provider), and the app auto-provisions a `User` record on first login. Scope is deliberately narrow: one provider, one session strategy, no roles.

## Requirements
- A new user can open the app, tap "Sign in with Google," and land on the dashboard with their own account provisioned automatically — no separate signup form.
- A returning user is silently re-authenticated (or shown a login screen) without re-entering data.
- Existing owner-scoped data model (`Transaction`, `PlannedPayment` keyed by `owner`) keeps working — the trusted identity now determines `owner` instead of a client-supplied param.
- No other providers, no passwords, no roles/permissions in v1.

---

## Auth Flow

1. User taps "Sign in with Google" on a new `app/login.tsx` screen.
2. Frontend uses `@react-native-google-signin/google-signin` (native Google Identity Services, via Play Services on Android / Credential Manager) to obtain a Google ID token (OIDC JWT) directly from Google. **Correction (2026-07-12):** the original design assumed `expo-auth-session/providers/google`, a browser-redirect OAuth flow. That's now a dead end on Android specifically: Google requires custom URI redirect schemes to contain a period (this app's `frontend` scheme doesn't), and is deprecating custom-URI-scheme OAuth on Android entirely regardless ("risk of app impersonation"), with no fixed sunset date. The native library sidesteps this — there's no redirect URI involved. Either way, a Development Build is required (Expo Go can't host either flow); this project already depends on `expo-dev-client` and has an APK build pipeline, so that isn't a new requirement.
3. Frontend calls `POST /api/auth/google` with the Google ID token.
4. Backend verifies the token using `GoogleIdTokenVerifier` (from `google-api-client`): checks the signature against Google's published public keys, confirms `aud` matches our OAuth client ID, confirms it isn't expired. The raw token is never trusted without this step.
5. Backend extracts `sub` (stable Google user id), `email`, `name`, `picture` from the verified payload and upserts a `User` by `googleId` — creating a new `User` on first login. No hardcoded user remains to migrate toward; see **Migration of Existing Data** below for how prior data gets reassigned.
6. Backend mints its own signed session JWT (`sub` = user id, `owner` = email, expiry **24 hours**), signed with an HMAC secret stored as a Cloud Run env var/secret. We mint our own token rather than forwarding Google's ID token as the session credential: Google ID tokens are designed to expire in ~1 hour and prove identity at a point in time, not to serve as a day-long API session credential. Getting a 24h session out of Google directly would mean requesting offline access, storing Google refresh tokens, and calling Google's token endpoint to mint a new ID token periodically — more moving parts than signing our own JWT. A self-minted token also means every subsequent request is validated locally (HMAC check), with no network dependency on Google after the initial handshake.
7. Frontend stores the session JWT in `expo-secure-store`. An axios interceptor in `config/api.ts` attaches it as `Authorization: Bearer <token>` on every request.
8. A Spring Security filter chain validates the Bearer token on each request and populates a `SecurityContext` with the authenticated `owner`. Non-auth endpoints require this; `/api/auth/**` is public.
9. On 401 (expired/invalid token), the frontend clears the stored token and redirects to `/login`. With a 24h lifetime this means re-running the Google sign-in flow (silent where possible) about once a day, rather than building refresh-token rotation.

```
┌─────────┐   Google ID token   ┌──────────────┐   verify + upsert   ┌────────┐
│  Expo    │ ──────────────────▶ │ /api/auth/    │ ───────────────────▶│ User   │
│  app     │                     │ google        │                     │ entity │
│          │ ◀────────────────── │              │◀────────────────────│        │
└─────────┘   app session JWT    └──────────────┘   mint JWT           └────────┘
     │
     │  Authorization: Bearer <app JWT> on every subsequent request
     ▼
┌──────────────────────┐
│ JwtAuthenticationFilter│ → SecurityContext(owner) → existing owner-scoped services
└──────────────────────┘
```

---

## Data Model Changes

`User` (`backend/src/main/java/com/lazyspender/backend/model/User.java`) gains:

```java
private String googleId;   // Google `sub`, unique
private String email;
private String name;
private String pictureUrl;
```

`owner` is kept as-is (it's already the scoping key across `Transaction`/`PlannedPayment`) but is now derived server-side from the verified email, never accepted from the client for write/read authorization decisions.

No new Datastore composite indexes are needed — lookups are by single-property equality (`googleId`, `email`), which Datastore supports without a composite index.

---

## Migration of Existing Data

The hardcoded `"villamorvinzie"` owner is being removed outright rather than auto-converged via an email match. Existing `Transaction`/`PlannedPayment` records under that owner string will be reassigned manually after the real Google sign-in exists, using a one-off script in `migration/` triggered via `BackfillController` (`POST /api/backfill/...`) — the same pattern already used for `BackfillPlannedPaymentsIdForTransaction`. This is deliberately deferred and manual: run once, after the user has signed in with their Google account and their real `owner` value is known.

**Status (2026-07-12): still pending.** Real Google sign-in now works end-to-end and has provisioned a real `User` row in production Firestore (verified — signing in lands on the dashboard, currently empty since no data is reassigned yet). The reassignment migration script itself hasn't been written; `migration/` currently only has `BackfillNotesMigration.java` and `BackfillPlannedPaymentsIdForTransaction.java`, neither of which reassigns `owner`. Old data under `"villamorvinzie"` is effectively orphaned (invisible to the new signed-in owner) until this backfill is written and run.

---

## Backend Changes — as built

### New dependencies (`backend/build.gradle`)
- `org.springframework.boot:spring-boot-starter-security` — stateless filter chain, no CSRF (pure JSON API, no cookies/sessions).
- `com.google.api-client:google-api-client:2.7.0` — `GoogleIdTokenVerifier` for validating Google ID tokens.
- `io.jsonwebtoken:jjwt-api` / `jjwt-impl` / `jjwt-jackson` (`0.12.6`) — signing and validating the app's own session JWTs.

### Files created
| File | Purpose |
|------|---------|
| `dto/GoogleAuthRequest.java` | Wraps the incoming Google ID token |
| `dto/AuthResponse.java` | App session JWT + basic user info returned to the frontend |
| `service/AuthService.java` | Verifies Google ID token, upserts `User`, delegates JWT minting |
| `service/JwtService.java` | Signs/parses/validates app session JWTs; embeds `owner` as a custom claim alongside `sub`/`iat`/`exp` |
| `config/JwtConfigProperties.java` | Binds `app.jwt.secret` — `${JWT_SECRET}` env var in prod (`application.yaml`), a literal dev-only value in `application-local.yaml` |
| `security/JwtAuthenticationFilter.java` | Reads `Authorization: Bearer`, validates via `JwtService`, populates `SecurityContext` with a `UsernamePasswordAuthenticationToken` whose principal name *is* the owner string |
| `security/SecurityConfig.java` | Stateless filter chain (`SessionCreationPolicy.STATELESS`), CSRF disabled, `permitAll()` on `/api/auth/**` and `/error`, `authenticated()` everywhere else, JWT filter registered before `UsernamePasswordAuthenticationFilter` |
| `controller/AuthController.java` | `POST /api/auth/google` |

### Files modified
| File | Change |
|------|--------|
| `model/User.java` | Added `googleId`, `email`, `name`, `pictureUrl` |
| `repository/UserRepository.java` | Added `findByGoogleId`, kept `findByOwner`/`findByEmail` |
| `TransactionController`, `UserController`, `PlannedPaymentController`, `BalanceTrendController`, `ExpenseDistributionController`, `BackfillController` | **Done.** Every read/write path now derives `owner` from the authenticated `Principal` (`principal.getName()`) rather than a client-supplied value — writes call `request.setOwner(principal.getName())`, reads call the service directly with `principal.getName()`. This is the real authorization boundary the design called for; client-supplied `owner` in any request body/query param is now ignored server-side (see **Known frontend dead weight** below). The old broken `GET /api/users/owner/{owner}` was removed in favor of `GET /api/users/me`. |
| `config/WebConfig.java` | Confirmed `Authorization` header is allowed under the existing broad CORS config; no breadth change |

---

## Frontend Changes — as built

### Files created
| File | Purpose |
|------|---------|
| `app/login.tsx` | "Sign in with Google" screen |
| `services/auth.service.ts` | Calls `POST /api/auth/google` |
| `hooks/useAuth.ts` | Wraps sign-in, sign-out, current-session state (native Google Sign-In, see below) |
| `contexts/AuthContext.tsx` | Holds session JWT (via `expo-secure-store`), exposes `isAuthenticated`/`isLoading` |

### Files modified
| File | Change |
|------|--------|
| `app/_layout.tsx` | The hardcoded `<UserProvider owner="villamorvinzie">` is gone. Root tree is `PaperProvider` → `QueryClientProvider` → `AuthProvider` → `AppNavigator`. `AppNavigator` uses `expo-router`'s `<Drawer.Protected guard={isAuthenticated}>` / `guard={!isAuthenticated}` to gate the real screens vs. the `login` route in the same `Drawer` navigator (rather than a manual redirect), and only mounts `<UserProvider>` (now prop-less — it self-fetches via `/api/users/me`) once `isAuthenticated` is true |
| `config/api.ts` | Axios request interceptor attaches `Authorization: Bearer <token>`; response interceptor on 401 clears the stored token and invokes an `onUnauthorized` handler wired to `AuthContext`'s sign-out |
| `contexts/UserContext.tsx` / `services/user.service.ts` | `getCurrentUser()` now calls `GET /api/users/me` — Principal-scoped, no client-supplied param. The old broken owner-path lookup is gone |
| `services/transaction.service.ts` / `app/records.tsx` (via `hooks/useTransactions.ts`) | `getAllTransactions()` now calls `GET /api/transactions/mine` instead of the old unscoped `GET /api/transactions` — the required per-user data isolation fix bundled into this feature |

New Expo dependencies: `@react-native-google-signin/google-signin` (+ its Expo config plugin), `expo-secure-store`.

**Client ID strategy for native platforms:** the single existing Google OAuth client (`app.google.client-id` on the backend) is used today purely as the token-verification audience and is almost certainly a "Web application" type client. `@react-native-google-signin/google-signin` needs an Android OAuth client registered in the same GCP project (`mindful-rhythm-426908-a5`) to authenticate at all — package name `com.vinzie.lazyspender` plus the SHA-1 fingerprint of the signing cert used for builds. Unlike the old redirect-scheme approach, this Android client ID is never passed programmatically (the library resolves it automatically from the SHA-1 + package name registered against it) — only `webClientId` is passed to `GoogleSignin.configure()`, and that's what fixes the resulting ID token's `aud` to the web client regardless of platform, so the backend's existing single-audience `GoogleIdTokenVerifier` check needs no change. An iOS client + a real bundle ID (`app.config.js` currently ships the Expo-generated placeholder `com.anonymous.frontend`) are still needed before iOS sign-in works — deferred, see Open Decisions.

Because native Android sign-in validates the calling app via the signing cert's SHA-1, a stable release-signing identity shared across local/CI builds is a hard prerequisite — see `frontend/plugins/withAndroidReleaseSigning.js`, which patches the generated `build.gradle` on every prebuild so debug and release builds route through the same signing config when release keystore Gradle properties are supplied.

**Known, deliberate follow-up (not part of v1):** `planned-payments`, `balance-trend`, `expense-distribution`, and transaction create/update all still thread a client-supplied `owner` through query params/request bodies on the frontend. The backend now ignores/overwrites all of it (derives `owner` from the JWT `Principal` instead), so this isn't a bug — just dead weight left for a later cleanup pass, not required for the feature to function correctly.

---

## Explicitly Out of Scope for v1
- Any provider other than Google.
- Password-based auth.
- Refresh-token rotation / long-lived sessions — expired app sessions re-run the Google sign-in flow.
- Roles or permissions beyond the existing single-owner-per-user scoping.
- Account linking (merging two Google identities into one owner).
- Server-side token revocation / logout-everywhere.

## Open Decisions
- **Secret storage**: HMAC signing secret needs to live in a Cloud Run secret (matching how other prod config is handled) rather than checked into `application.yaml`.
- **iOS bundle identifier**: TBD, needs to replace the Expo-generated placeholder (`com.anonymous.frontend`) before an iOS Google OAuth client can be registered.
- **Android/iOS Google OAuth client creation**: TBD — external Google Cloud Console setup (package name + SHA-1 for Android, bundle ID for iOS), not something doable from the repo. Owner: user.

## Resolved Decisions
- **Session JWT lifetime**: 24 hours. Re-auth via Google after expiry, roughly once a day.
- **Existing hardcoded user**: removed outright, not auto-converged. A manual backfill (see **Migration of Existing Data**) reassigns old data to the real owner after first Google sign-in.
- **Android sign-in library (2026-07-12)**: `@react-native-google-signin/google-signin` (native Google Identity Services) instead of `expo-auth-session`'s browser-redirect flow. Forced by Google deprecating custom-URI-scheme OAuth redirects on Android — the redirect-based approach was discovered to be a dead end only after implementing and testing it on a real Android build (no emulator for this kind of native-platform issue). iOS still uses the same library but isn't wired up yet (see Open Decisions above).
