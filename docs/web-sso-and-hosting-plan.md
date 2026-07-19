# Web Provisioning + Web Google SSO - Solution Design

## Overview
The Expo app already has web output configured (`app.config.js` → `web: { output: "static" }`, `react-native-web` installed, `npm run web` works for local dev), but nothing is deployed to a production web URL. Meanwhile, Google Sign-In is fully built for native (`@react-native-google-signin/google-signin` in `frontend/hooks/useAuth.ts` + `frontend/app/login.tsx`, backed by the `POST /api/auth/google` flow documented in `docs/google-sso-onboarding-design.md`), but that library is native-only — it has no functional web implementation. The app is fully auth-gated (`Drawer.Protected guard={isAuthenticated}` in `app/_layout.tsx`), so a web build can't be usefully deployed until web-capable sign-in exists first.

This design covers both pieces: adding Google Sign-In for web via Google Identity Services (GIS), then deploying the static web build to **Azure Static Web Apps**. Hosting lives in a separate Azure subscription, independent of the backend's GCP project (`mindful-rhythm-426908-a5`) — CORS is the only integration point between the two.

## Requirements (confirmed)
- Hosting: Azure Static Web Apps (Free tier).
- Web session storage: `localStorage` — this v1 tradeoff (JS-readable, XSS-exposed) is accepted for now in exchange for zero backend changes; `frontend/config/authStorage.ts` already has a `Platform.OS === 'web'` branch that uses it instead of `expo-secure-store`, no work needed.
- No backend auth-logic changes: `POST /api/auth/google` just needs *a* valid Google ID token whose `aud` matches the configured web client ID — already true today, since the same `GOOGLE_WEB_CLIENT_ID` is used natively as `webClientId` in `GoogleSignin.configure()`.

---

## Sequencing: two follow-up issues, in order

1. **Web Google Sign-In (GIS)** — fully verifiable locally via `npm run web` against `localhost`, needs no hosting infra, only the existing dev CORS allowlist (`http://localhost:*`, already in `WebConfig.java`) and one manual GCP Console change.
2. **Azure Static Web Apps deploy** — branched from `main` only after (1) merges. Deploying hosting before web SSO works would put a broken login in front of real users.

This doc (tracked under issue #47) is design-only; each of the two pieces above gets its own issue/branch/worktree per the usual workflow when implementation starts.

---

## Web Google Sign-In

**Key constraint**: GIS (with FedCM) expects Google's own rendered button, not a manually-triggered `prompt()` from an arbitrary button click — self-styled trigger buttons are unreliable under FedCM. So the web login screen renders a container that Google injects its button into, instead of a `react-native-paper` `<Button onPress>`.

**Isolation strategy**: `useAuth.ts` is imported only by `app/login.tsx`, and `GoogleSignin`/`google-signin` only appear inside `useAuth.ts`. Shadowing both with Metro's `.web.` platform-extension convention (new to this codebase, but standard Expo/RN practice) means the native-only library is never bundled into the web build at all — safer than an `if (Platform.OS !== 'web')` runtime guard around `GoogleSignin.configure()`, since it's unclear whether merely importing the library throws on web.

**New files (when implementation starts)**:
- `frontend/app/+html.tsx` — scaffold via `npx expo customize` (select `+html.tsx`), then add to `<head>`:
  ```tsx
  <script src="https://accounts.google.com/gsi/client" async defer />
  ```
  This is expo-router's standard mechanism for a third-party global `<head>` script on static web export — loads once for the whole SPA shell, no per-component script-injection/race-condition handling needed.

- `frontend/hooks/useAuth.web.ts` — same public shape as `useAuth.ts` (`isAuthenticated, isLoading, isSigningIn, error, canSignIn, signOut`), but instead of `promptGoogleSignIn`, exposes a ref for the button container. Internally: `google.accounts.id.initialize({ client_id: Constants.expoConfig?.extra?.googleWebClientId, callback: handleCredentialResponse })` then `google.accounts.id.renderButton(containerRef.current, {...})`. `handleCredentialResponse({credential})` calls the existing, unmodified `authenticateWithGoogle(credential)` from `services/auth.service.ts`, then `signIn(auth.token)` from `AuthContext`. `signOut` calls `google.accounts.id.disableAutoSelect()` then the existing `signOutSession()`.

- `frontend/app/login.web.tsx` — same visual shell as `login.tsx` (title/subtitle/error via `react-native-paper`), but renders `<View ref={buttonContainerRef} />` instead of the Paper `<Button>`. If RNW's `View` ref doesn't forward cleanly to a raw DOM node (worth an early smoke test, not assumed), fall back to a plain `<div ref={...}>` guarded by `Platform.OS === 'web'` — safe since this file only ever runs on web.

**Unchanged, reused as-is**: `services/auth.service.ts`, `contexts/AuthContext.tsx`, `app/_layout.tsx`'s `Drawer.Protected` guard, `config/authStorage.ts`.

**Manual GCP Console step (owner: user, outside repo)**: add `http://localhost:3000` (the port `npm run web` binds, per `package.json`) to **Authorized JavaScript origins** on the existing Google Web OAuth client (the one behind `GOOGLE_WEB_CLIENT_ID`). GIS/FedCM enforces this at request time; the native flow has no equivalent check, which is why this hasn't been needed until now.

**Verification**:
1. Add the localhost origin in GCP Console (above).
2. `npm run web`, navigate to `/login`, confirm the Google-rendered button appears, click it, confirm `POST /api/auth/google` fires and the app flips into the authenticated `Drawer` screens.
3. Smoke-test other screens on web for regressions from web-bundling less-common native deps: dashboard charts (`react-native-gifted-charts`), any animated UI (`react-native-reanimated`/`worklets`), date pickers (`@react-native-community/datetimepicker`, has an official web shim but unverified in this app). Treat failures here as a separate follow-up issue, not a blocker.

---

## Azure Static Web Apps deploy

Config lives in `frontend/` (not repo root), matching the "no root build, each project self-contained" convention.

- `frontend/staticwebapp.config.json` (new) — the one real behavioral difference from Firebase: Firebase's `cleanUrls: true` auto-maps `/dashboard` → `dashboard.html` with no extra config, but Azure Static Web Apps has no equivalent auto-behavior — each clean route needs an explicit `routes` rewrite rule, or the path falls through to SWA's default 404. `expo export -p web` with `web.output: "static"` still emits one real HTML file per route (`index.html`, `dashboard.html`, `login.html`, `records.html`, `planned-payments.html`, `account-access.html`), so each needs its own rule:
  ```json
  {
    "routes": [
      { "route": "/dashboard", "rewrite": "/dashboard.html" },
      { "route": "/login", "rewrite": "/login.html" },
      { "route": "/records", "rewrite": "/records.html" },
      { "route": "/planned-payments", "rewrite": "/planned-payments.html" },
      { "route": "/account-access", "rewrite": "/account-access.html" }
    ]
  }
  ```
  No `navigationFallback` — same reasoning as before: each route already resolves to a real file, and a catch-all would mask genuine 404s.

- `frontend/package.json` — add scripts:
  ```json
  "web:build": "expo export -p web",
  "web:deploy": "npm run web:build && swa deploy ./dist --deployment-token $AZURE_SWA_DEPLOYMENT_TOKEN --env production"
  ```
  (No `web:preview` script — preview environments were considered but dropped to keep v1 scope minimal; see Open Decisions.)

- One-time local/Azure setup: `npm install -g @azure/static-web-apps-cli` and `az login` (interactive). Create the Static Web App **without linking a GitHub repo** (`az staticwebapp create --name lazyspender-web --resource-group <rg> --sku Free --location <region>`) — see "CI/CD automation" below for why. Fetch the deployment token (`az staticwebapp secrets list --name lazyspender-web --query "properties.apiKey" -o tsv`).

  **Correction**: an earlier version of this doc suggested storing that token in `frontend/.env.local` as "gitignored, never committed" — that's wrong, `frontend/.env.local` is actually tracked in git (same as `frontend/.env`), so writing a secret there would leak it into the repo. Instead, export it as an ephemeral shell variable (e.g. `$env:AZURE_SWA_DEPLOYMENT_TOKEN` in the current PowerShell session only) for manual deploys, and store it as a GitHub Actions repo secret (`AZURE_STATIC_WEB_APPS_API_TOKEN`) for CI.

**Backend CORS** — `backend/src/main/java/com/lazyspender/backend/config/WebConfig.java`, add to `allowedOriginPatterns(...)`:
```java
"https://lazyspender-web.azurestaticapps.net"
```
(Azure Static Web Apps' default domain — placeholder name, replace once the resource is actually created.) Leave a comment placeholder for a future custom domain rather than guessing one now. Redeploy the backend to Cloud Run after this change.

**Manual GCP Console step (owner: user, outside repo)**: add the same production origin to Authorized JavaScript origins on the Web OAuth client.

**Verification**:
1. Add prod origin to backend CORS + OAuth console, redeploy backend.
2. `npm run web:deploy` to production; repeat the login + page smoke test from the SSO section against the real production URL.

---

## CI/CD automation (added, no longer out of scope for v1)

Once the manual deploy above is verified once, automate it: store the deployment token as a GitHub Actions repo secret (`gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN`) and add `.github/workflows/frontend-web-deploy.yml`, mirroring the existing `backend-deploy.yml`/`frontend-build.yml` shape — build with `npm run web:build`, then deploy with Microsoft's official `Azure/static-web-apps-deploy@v1` action (`skip_app_build: true`, `app_location: frontend/dist`), triggered on push to `main` for `frontend/**` changes. This is why the Static Web App is created **without** linking a GitHub repo at `az staticwebapp create` time — linking it would have Azure auto-generate its own workflow file, which would conflict with this hand-written one.

---

## Explicitly Out of Scope for v1
- Custom domain for Azure Static Web Apps.
- Preview/staging deploy environments (`swa deploy --env preview`) — dropped to keep v1 scope minimal; first full verification happens against production.
- `404.html` / `+not-found.tsx` handling — unmatched routes fall through to Azure Static Web Apps' generic 404 page.
- httpOnly-cookie session storage for web (see Requirements above — `localStorage` accepted for v1).

## Open Decisions
- **RNW `View` ref → DOM node forwarding**: expected to work (RNW 0.21), but unverified — fallback is a raw `<div ref>` in `login.web.tsx` if not.
- **Azure resource group / region / subscription**: resolved during implementation (issue #72) — free-trial subscription, `eastus2` region (one of the small set of regions Static Web Apps supports).
