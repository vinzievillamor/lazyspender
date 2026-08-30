# AWS SQL migration plan

## Scope

This documents a plan to migrate the backend's persistence layer from Google Cloud Firestore in Datastore mode to a managed SQL database on AWS. **This is a database-only migration** — the backend keeps running on Cloud Run for now; a separate effort (see `aws-lambda-migration-plan.md`) consolidates backend hosting onto AWS later, and networking/compute concerns for that are out of scope here.

Traffic is the dominant constraint on every decision below: there are only 2 users of this app, each using it roughly 15 minutes/day at most.

## Why move off Datastore

Firestore in Datastore mode has no `GROUP BY`, `JOIN`, or native cross-field aggregation. Three backend services work around this today with parallel fan-out queries and in-memory aggregation (`BalanceTrendService`, `ExpenseDistributionService`, `DebtTrendService`), and every query filtering/sorting on more than one property needs a hand-declared composite index in `backend/src/main/resources/datastore/index.yaml` or Datastore rejects it at runtime. A relational database removes both problems structurally.

## Recommended AWS database

**Aurora Serverless v2 (PostgreSQL-compatible), scale-to-zero**: $0.12/ACU-hour while active, **$0/hour when idle** — only storage (~$0.10/GB-month) continues to be billed. At an estimated 10-20 active hours/month (matching 2 users × ~15 min/day, at minimum ~0.5 ACU): ≈$0.90/month compute + ~$2-3/month storage ⇒ **under $5/month total**. AWS made 0-ACU scaling generally available in November 2024, letting the database fully pause compute billing between sessions.

**Trade-off to accept, not engineer around**: resuming from 0 ACU adds multi-second latency to the first request after an idle period. For a personal app opened briefly a few times a day, this is a reasonable trade for the cost savings — availability isn't a concern here, so no always-on fallback is kept in reserve.

## Schema design

### Key modeling decisions

- **Primary keys** stay as the app-generated UUID strings already in use (`VARCHAR(36)`) — no switch to auto-increment integers, since IDs are already generated in Java and referenced elsewhere as strings.
- **`Instant` → `TIMESTAMPTZ`** for every timestamp field — a direct, lossless mapping.
- **Enums → `VARCHAR` + `CHECK` constraint**, not a native Postgres `ENUM` type — the app already treats these as plain strings, and a `CHECK` clause is far easier to evolve via a Flyway migration than `ALTER TYPE ... ADD VALUE`'s transactional restrictions.
- **New foreign keys** — the one place a relational layer adds correctness Datastore never enforced (today these are plain string fields resolved manually in service code): `transactions.planned_payment_id → planned_payments.id` (nullable), and `owner`/`delegate` fields across `transactions`, `planned_payments`, `account_access` → **`users.owner`** (not `users.id`, since `owner` is what every repository query actually filters on today; requires a `UNIQUE` constraint on `users.owner`).
- **`User.accounts`** (a `List<String>` filtered with `accounts.contains(...)` in Java today, because Datastore can't express `IN`) becomes a real `user_accounts(user_owner, account_name)` join table rather than a Postgres array column — the app already filters on individual account values, so this turns into an ordinary indexed `= ANY(:accounts)` query and maps cleanly onto JPA.
- **Dual-purpose `recurrenceValue`/`endValue`** fields (stringly-typed, interpretation depends on a sibling enum) split into properly typed columns (`recurrence_day_of_week`/`recurrence_day_of_month`, `end_occurrence_count`/`end_date`) — that stringly-typing was only ever a Datastore modeling compromise. Note `PlannedPaymentService.validateRequest` currently restricts to `MONTHLY`/non-`DATE`-end (per root `CLAUDE.md`) even though the model supports more — model the full enum space in SQL regardless, since that's an app-level validation choice, not a schema constraint.
- **`double` → `NUMERIC(12,2)`** for `amount`/`ref_currency_amount` — a deliberate improvement over float rounding risk, worth doing while the schema is being redesigned anyway.

Four tables carry over from the existing model classes: `users`, `planned_payments`, `transactions`, `account_access` — column-level detail follows the Java model + the decisions above.

## Indexes

Of the 11 hand-declared composite indexes in `datastore/index.yaml`, most map to real query shapes (`transactions(owner, date DESC)`, `transactions(owner, type, date)`, `transactions(owner, category, date)`, `account_access(delegate/owner, status)`) and carry over. A new `transactions(planned_payment_id)` index is needed once that becomes an FK/join column. Several indexes existed only to satisfy Datastore's requirement that every aggregated column appear in the index (e.g. `transactions(category, date, amount)`) — Postgres's query planner reads non-indexed columns from the row itself, so these are dropped. Remaining indexes become pure performance tuning rather than correctness-required, revisit only if a query is observed to be slow.

## Rewriting the aggregation workarounds

Each Datastore-workaround service collapses into a single SQL query:

- **`BalanceTrendService`**: today, fetches everything in range and filters the `accounts` list in Java, with a branch between an aggregate query and a fetch-and-sum-in-Java path depending on whether an account filter is present. Becomes one `WHERE account = ANY(:accounts)` query plus a `SUM(CASE WHEN type = 'INCOME' ...)` aggregate for the opening balance — no branching.
- **`ExpenseDistributionService`**: the most Datastore-coupled file — fires one `AggregationQuery` per category in parallel via the raw `com.google.cloud.datastore.Datastore` client, as a `GROUP BY` workaround. Becomes a single `SELECT category, SUM(amount) ... GROUP BY category` query; the raw Datastore client injection goes away entirely. `getTopContributors`'s in-memory `groupingBy`/sort/`limit(10)` similarly becomes one `GROUP BY note ORDER BY total DESC LIMIT 10` query.
- **`DebtTrendService`**: today, fetches all transactions in range and manually groups them by `plannedPaymentId` in Java, since Datastore has no join. Becomes a real `LEFT JOIN` between `planned_payments` and `transactions` on `planned_payment_id`.

## ORM and migration tooling

**Spring Data JPA (Hibernate)**, switching repositories from `DatastoreRepository` to `JpaRepository` with **no changes to derived query method names** — the single biggest churn-minimization win of the migration (every `findByOwner`/`findByOwnerAndStatus`/etc. carries over verbatim). The 5 custom GQL `@Query` methods on `TransactionRepository` need rewriting as JPQL/native SQL — straightforward 1:1 translations per the shapes above. Entity classes swap the Datastore `@Entity` annotation for JPA's; existing Lombok usage is unaffected. `build.gradle` drops `spring-cloud-gcp-starter-data-datastore` for `spring-boot-starter-data-jpa` + the Postgres JDBC driver.

**Flyway** for schema migrations, over Liquibase — the more common Spring Boot default, without Liquibase's YAML/XML overhead. This replaces today's ad hoc `ApplicationRunner`-based schema-adjacent changes; the existing `migration/`/`BackfillController` pattern stays as-is for data backfills, which Flyway doesn't need to take over.

## One-time data migration (ETL)

Given the traffic profile, dual-write/CDC/zero-downtime cutover machinery is unnecessary — a simple export → transform → load run during a short, announced maintenance window is sufficient: a one-off batch job reads every row from Datastore via the app's existing ADC, transforms enum/timestamp/split-field values into the new schema, and writes via JDBC respecting FK insert order (`users` → `planned_payments` → `transactions`/`account_access`).

**Rollback plan**: leave Datastore completely untouched and read-only for an agreed grace period (1-2 weeks) after cutover — the datasource config can be pointed back at it as a fallback before decommissioning. **Verification**: row-count parity per table against Datastore kind counts, plus field-by-field spot-checks, before declaring the cutover complete.

## Interim connectivity

Hosting/networking design is out of scope for this database-only plan. The backend stays on Cloud Run for now and reaches the AWS database over the public internet (no VPC peering in scope) — this requires a public Aurora endpoint with TLS enforced on the JDBC connection (`sslmode=require` or stricter), and credentials handled the same simple way (`JWT_SECRET`/OAuth client id are today) via a Cloud Run env var/secret binding rather than standing up Secrets Manager for one connection string. Revisit once backend hosting itself moves onto AWS compute.

## Phased rollout

1. **Schema design & DDL** — finalize table definitions, write initial Flyway migrations against a fresh Aurora Serverless v2 instance.
2. **Application code migration to JPA** — swap dependencies, convert entity annotations and repositories, rewrite the 5 custom queries and the three aggregation services per the shapes above.
3. **Local dual-testing** — verify every endpoint against the new Postgres schema with synthetic data before touching production data.
4. **One-time ETL cutover** — during an announced maintenance window: run the ETL job, verify row counts and spot-checks, flip the datasource config, redeploy.
5. **Post-cutover verification** — smoke-test all endpoints against production and monitor logs through the first few real usage sessions.
6. **Cleanup / decommission** — after the rollback grace period elapses: remove Datastore-specific code/dependencies, delete `datastore/index.yaml`, decommission the Firestore-in-Datastore-mode database in GCP.
