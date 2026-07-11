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
2. Frontend uses `expo-auth-session/providers/google` to obtain a Google ID token (OIDC JWT) directly from Google. **Correction:** Expo Go can no longer be used for OAuth redirects (Google/Expo have both deprecated the flows that made that possible) — a Development Build is required. This project already depends on `expo-dev-client` and has an APK build pipeline, so this isn't a new requirement, just a corrected assumption versus the original "no custom dev client" framing below.
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

---

## Backend Changes

### New dependencies (`backend/build.gradle`)
- `org.springframework.boot:spring-boot-starter-security` — stateless filter chain, no CSRF (pure JSON API, no cookies/sessions).
- `com.google.api-client:google-api-client` — `GoogleIdTokenVerifier` for validating Google ID tokens.
- `io.jsonwebtoken:jjwt-api` / `jjwt-impl` / `jjwt-jackson` — signing and validating the app's own session JWTs.

### Files to create
| File | Purpose |
|------|---------|
| `dto/GoogleAuthRequest.java` | Wraps the incoming Google ID token |
| `dto/AuthResponse.java` | App session JWT + basic user info returned to the frontend |
| `service/AuthService.java` | Verifies Google ID token, upserts `User`, delegates JWT minting |
| `service/JwtService.java` | Signs/parses/validates app session JWTs |
| `security/JwtAuthenticationFilter.java` | Reads `Authorization: Bearer`, validates, populates `SecurityContext` |
| `security/SecurityConfig.java` | Stateless filter chain config; `permitAll()` on `/api/auth/**`, auth required elsewhere |
| `controller/AuthController.java` | `POST /api/auth/google` |

### Files to modify
| File | Change |
|------|--------|
| `model/User.java` | Add `googleId`, `email`, `name`, `pictureUrl` |
| `repository/UserRepository.java` | Add `findByGoogleId`, keep `findByOwner`/`findByEmail` |
| All controllers currently accepting an `owner` path/query param for scoping | Read `owner` from `SecurityContext` instead of (or in addition to, with a match check against) the client-supplied value — this is the actual authorization boundary; without it, SSO only adds a login screen but not real per-user isolation |
| `config/WebConfig.java` | No change to CORS breadth, but confirm `Authorization` header is allowed |

---

## Frontend Changes

### Files to create
| File | Purpose |
|------|---------|
| `app/login.tsx` | "Sign in with Google" screen, outside the drawer navigator |
| `services/auth.service.ts` | Calls `POST /api/auth/google` |
| `hooks/useAuth.ts` | Wraps sign-in, sign-out, current-session state |
| `contexts/AuthContext.tsx` | Holds session JWT (via `expo-secure-store`), exposes `isAuthenticated` |

### Files to modify
| File | Change |
|------|--------|
| `app/_layout.tsx` | Remove the hardcoded `<UserProvider owner="villamorvinzie">` entirely; wrap the tree in `AuthProvider`, which mounts `UserProvider` with the real authenticated owner once a session resolves, otherwise renders the login route |
| `config/api.ts` | Axios request interceptor attaches `Authorization: Bearer <token>`; response interceptor on 401 clears the stored token and routes to `/login` |
| `contexts/UserContext.tsx` | Switches from its current (already broken — `GET /api/users/owner/{owner}` doesn't exist on the backend) owner-based lookup to `GET /api/users/me`, which is Principal-scoped and needs no client-supplied param |
| `app/records.tsx` (via `hooks/useTransactions.ts`) | The transactions list currently calls the **unscoped** `GET /api/transactions`, which returns every user's transactions, not just the signed-in user's. Must switch to the already-existing `GET /api/transactions/mine`. This is the one required behavior fix bundled into this feature — without it, SSO adds a login screen but not actual per-user data isolation on the main list view |

New Expo dependency: `expo-auth-session`, `expo-secure-store` (if not already present).

**Client ID strategy for native platforms:** the single existing Google OAuth client (`app.google.client-id` on the backend) is used today purely as the token-verification audience and is almost certainly a "Web application" type client. Google does not allow custom URL-scheme redirects (e.g. `frontend://...`) for Web-type clients — only Android/iOS client types support that. Native sign-in therefore needs two more OAuth clients registered in the same GCP project (`mindful-rhythm-426908-a5`):
- **Android**: package name `com.vinzie.lazyspender`, plus the SHA-1 fingerprint of the signing cert used for builds (from the existing APK build pipeline / `eas credentials`).
- **iOS**: a real bundle ID — `app.config.js` currently ships the Expo-generated placeholder `com.anonymous.frontend`, which should be replaced before registering with Google/App Store.

The frontend passes all three client IDs (`webClientId`, `iosClientId`, `androidClientId`) to `expo-auth-session`'s Google provider, but per Google/Firebase's documented pattern the resulting ID token's `aud` is still the **web** client ID regardless of platform — so the backend's existing single-audience `GoogleIdTokenVerifier` check needs no change once the native clients exist.

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
