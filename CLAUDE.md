# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a monorepo with two independent projects that talk to each other over HTTP:

- `backend/` — Spring Boot 3 (Java 21) REST API, deployed to Cloud Run, backed by Google Cloud Firestore in Datastore mode
- `frontend/` — Expo / React Native app (file-based routing via `expo-router`)
- `docs/` — durable design rationale for individual features: *why* something is built the way it is (e.g. `expense-distribution-widget-plan.md` on Datastore's aggregation limits). Committed, since this stays useful after the feature ships. Step-by-step "how to build X" implementation plans belong in Claude Code's Plan mode instead (not committed) — `docs/` is not the place for in-progress task checklists.

There is no root-level build; each project is built and run independently from its own directory.

## Development workflow

**Before starting any new task, complete these steps in order — don't skip ahead to implementation:**

1. **Startup** — run the `startup` skill (or otherwise orient on recent commits, working tree state, and relevant memory) if not already done this session.
2. **Create a GitHub issue** for the task (`gh issue create ...`).
3. **Create the branch** from that issue, named per the convention below, and link the two.
4. **Create a dedicated git worktree** for the branch (see below) so this session's work can't overlap or conflict with any other in-progress session.
5. Only then start the actual task.

- **Every feature, hotfix, or bugfix starts with a GitHub issue.** Create the issue first, then create the branch from it and link the two (e.g. `gh issue create ...` followed by a branch named after the issue).
- **Branch naming**: `<type>/<issue-number>-<short-slug>`, e.g. `feature/32-account-delegation-frontend-implementation`. Common `<type>` values: `feature`, `fix`, `hotfix`, `docs`, `chore`.
- **All development happens in a branch** — never commit directly to `main`.
- **Merges to `main` must be squash merges** (`gh pr merge --squash` or the GitHub UI's "Squash and merge"), so `main` keeps one commit per issue/PR.
- **Never add a `Co-Authored-By: Claude` (or similar) trailer to commits pushed to this repository.** Omit the co-author line entirely, regardless of Claude Code's default commit message template.
- **Use a separate `git worktree` per feature/task**, especially when spawning subagents to work on it. Each worktree gets its own checkout of the feature branch so parallel agents don't clobber each other's working-tree state (uncommitted changes, build artifacts, etc.). Clean up the worktree once the branch is merged/abandoned.

## Backend (`backend/`)

### Commands

```bash
./gradlew bootRun --args='--spring.profiles.active=local'   # run locally against the real (prod) Firestore instance
./gradlew build                                             # compile + run tests
./gradlew test                                               # run tests only
./gradlew test --tests "com.lazyspender.backend.BackendApplicationTests"  # single test class
```

There is currently only a placeholder Spring context test (`BackendApplicationTests`) — no meaningful test coverage exists yet.

The API can also be exercised through the Bruno collection in `backend/bruno-api/` (select the `local` environment, base URL `http://localhost:8080`).

### Architecture

Standard layered Spring Boot structure: `controller` → `service` → `repository`, with `mapper` (MapStruct) converting between `model` (Datastore entities) and `dto` (request/response objects). Controllers never touch entities directly.

- **Persistence**: Google Cloud Firestore in **Datastore mode**, accessed via `spring-cloud-gcp-starter-data-datastore`. Repositories extend `DatastoreRepository` (see `TransactionRepository`, `PlannedPaymentRepository`). Custom queries use GQL via `@Query` with named params.
- **Datastore has no `GROUP BY`/`JOIN`/native aggregation across arbitrary fields.** Reporting features (balance trend, expense distribution, contributors) work around this with parallel per-category/per-owner `SUM(amount)` queries or in-memory aggregation — see `BalanceTrendService`, `ExpenseDistributionService`, `docs/expense-distribution-widget-plan.md` for the reasoning.
- **Composite indexes are hand-declared** in `src/main/resources/datastore/index.yaml`. Any new query that filters/sorts on more than one property (or a property that isn't already indexed for that combination) requires adding a matching index entry here, or Datastore will reject the query at runtime.
- **Profiles**: `application.yaml` (default/prod config) vs `application-local.yaml` (local-only overrides, e.g. dev JWT secret / Google client ID). Both talk to the same real GCP project (`mindful-rhythm-426908-a5`) — there is no emulator; `spring.profiles.active=local` just swaps a few app-level settings, not the datastore target. Be careful: local runs read/write real production data.
- **Domain model**: `Transaction` (owner, account, category, amount, currency, `type`: INCOME/EXPENSE, optional `plannedPaymentId` linking it back to a recurring payment) and `PlannedPayment` (recurrence config: type/value/end condition, `ConfirmationType` MANUAL vs AUTO, `PaymentStatus` lifecycle ACTIVE/PAUSED/COMPLETED/CANCELLED). `PlannedPaymentService.confirmPlannedPayment` is the key piece of business logic: it creates a `Transaction` from the planned payment, advances `nextDueDate` via `RecurrenceCalculator`, and marks the payment COMPLETED once its end condition is met. `autoConfirmDuePayments` batches this for AUTO-confirmation payments that are due.
- **Note**: `PlannedPaymentService.validateRequest` currently only allows `RecurrenceType.MONTHLY` and rejects `EndType.DATE`, even though the model/enum support more (DAILY/WEEKLY/YEARLY, DATE end) — check this validation before assuming those variants work end-to-end.
- **CORS** is opened broadly for local dev / Expo (`WebConfig`): localhost any port, `exp://`, and private network ranges (192.168.x.x, 10.x.x.x).
- Multi-user support is by a simple `owner` string field on every entity (no auth) — most list/query endpoints are scoped `by owner`.
- One-off data migrations live in `migration/` (e.g. `BackfillPlannedPaymentsIdForTransaction`) and are triggered via `BackfillController` (`POST /api/backfill/...`), not run automatically on startup.

### Deployment

`Dockerfile` is a multi-stage Alpine build (Gradle build stage → JRE runtime, tests skipped in the image build). `build-and-push.sh` builds and pushes to Google Artifact Registry (`us-east1-docker.pkg.dev/mindful-rhythm-426908-a5/lazyspender/lazyspender-api`) for Cloud Run deployment.

## Frontend (`frontend/`)

### Commands

```bash
npm install
npm run start      # expo start --tunnel --port 3000
npm run android     # expo start --android --port 3000
npm run ios         # expo start --ios --port 3000
npm run web          # expo start --web --port 3000
npm run lint         # expo lint
```

No frontend test runner is configured.

### Architecture

- **Routing**: `expo-router` with a drawer navigator defined in `app/_layout.tsx`. Screens are files under `app/` (`dashboard.tsx`, `records.tsx`, `planned-payments.tsx`); `index.tsx` is hidden from the drawer.
- **Data layer pattern**, repeated per domain (transactions, planned payments, users, balance trend, expense distribution): `services/*.service.ts` (axios calls via the shared client in `config/api.ts`) → `hooks/use*.ts` (TanStack Query wrapping the service, with query-key factories like `TRANSACTION_QUERY_KEYS`) → components/screens consume the hooks. Follow this same three-layer shape when adding a new API-backed feature rather than calling axios/the service directly from a component.
- Mutations manage the React Query cache by hand (`setQueriesData` for optimistic add/update, optimistic delete with rollback via `onMutate`/`onError`, and cross-invalidating related queries — e.g. any transaction mutation invalidates `BALANCE_TREND_QUERY_KEYS` too since balances derive from transactions).
- **API base URL** comes from `app.config.js` `extra.apiBaseUrl`, sourced from `frontend/.env` (`API_BASE_URL`), read at runtime via `expo-constants` in `config/api.ts`. Defaults to the production Cloud Run URL if unset.
- **Current user**: there's no login flow — `UserProvider` in `app/_layout.tsx` is hardcoded to a single owner (`"villamorvinzie"`), and `contexts/UserContext.tsx` fetches that user's record and exposes it app-wide via `useUser()`.
- **Theming**: `react-native-paper` with a custom theme in `config/theme.ts`; components should pull colors/spacing from there rather than hardcoding values.
- Charts use `react-native-gifted-charts` (see `BalanceTrendWidget`, `ExpenseDistributionWidget`).
