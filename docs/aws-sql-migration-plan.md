# AWS SQL migration plan

## Scope

This documents a plan to migrate the backend's persistence layer from Google Cloud Firestore in Datastore mode to a managed SQL database on AWS. **This is a database-only migration** — the backend keeps running on Cloud Run for now; a separate effort is consolidating backend hosting onto AWS later, and networking/compute concerns for that are deliberately out of scope here.

Traffic is the dominant constraint on every decision below: there are only 2 users of this app, each using it roughly 15 minutes/day at most.

This is the first file in `docs/`. `CLAUDE.md` currently references `docs/expense-distribution-widget-plan.md` as though it exists — it doesn't, and creating `docs/` for this file doesn't fix that dangling reference (worth writing separately at some point, but out of scope here).

## Why move off Datastore

Firestore in Datastore mode has no `GROUP BY`, `JOIN`, or native cross-field aggregation. Three backend services work around this today with parallel fan-out queries and in-memory aggregation (`BalanceTrendService`, `ExpenseDistributionService`, `DebtTrendService`), and every query filtering/sorting on more than one property needs a hand-declared composite index in `backend/src/main/resources/datastore/index.yaml` or Datastore rejects it at runtime. A relational database removes both problems structurally — see [Rewriting the aggregation workarounds](#rewriting-the-aggregation-workarounds) below.

## Recommended AWS database

**Aurora Serverless v2 (PostgreSQL-compatible), scale-to-zero**: $0.12/ACU-hour while active; **$0/hour compute when idle** (no active connections) — only storage (~$0.10/GB-month) and I/O continue to be billed. At an estimated 10-20 active hours/month (matching 2 users × ~15 min/day, with some margin), running at the minimum ~0.5 ACU while active: ~15 hrs × 0.5 ACU × $0.12/hr ≈ **$0.90/month compute**, plus ~$2-3/month storage/backups ⇒ **under $5/month total**.

**Recommendation: Aurora Serverless v2, PostgreSQL-compatible, with scale-to-zero capacity enabled.** AWS made 0-ACU scaling generally available in November 2024, letting the database fully pause compute billing between sessions.

**Trade-off to accept, not engineer around**: resuming from 0 ACU adds multi-second latency to the first request after an idle period. For a personal finance app that two people open briefly a few times a day, this is a reasonable trade for the cost savings — it's a multi-second resume, not a cold-start-style delay of tens of seconds. Availability isn't a concern for this app, so there's no always-on fallback kept in reserve for this — the cost savings are worth the resume latency, full stop.

Engine version: use whatever PostgreSQL-compatible version Aurora Serverless v2 supports at implementation time rather than pinning a specific version number here, since that will drift.

## Schema design

### Conventions

- **Primary keys** stay as the app-generated UUID strings already in use today, typed `VARCHAR(36)` — no switch to auto-increment integers, since IDs are already generated in Java (`UUID.randomUUID().toString()`) and referenced elsewhere as strings (e.g. `Transaction.plannedPaymentId`).
- **`Instant` → `TIMESTAMPTZ`** for every timestamp field (`createdAt`, `respondedAt`, `startDate`, `nextDueDate`, `date`) — a direct, lossless mapping; JDBC handles `Instant`/`TIMESTAMPTZ` natively.
- **Enums → `VARCHAR` + `CHECK` constraint**, not a native Postgres `ENUM` type. The application already treats these as plain strings (Java enums serialized by name), and a `CHECK (status IN (...))` constraint is far easier to evolve via a Flyway migration than a native `ENUM` type, where `ALTER TYPE ... ADD VALUE` carries transactional restrictions and values can't be removed or reordered. Adding a new enum constant becomes: add the Java constant + a migration updating the `CHECK` clause — the same amount of ceremony as today.
- **New foreign keys** — the one place a relational layer adds correctness that Datastore never enforced, since today these are just plain string fields resolved manually in service code:
  - `transactions.planned_payment_id → planned_payments.id` (nullable — not every transaction originates from a planned payment)
  - `transactions.owner`, `planned_payments.owner`, `account_access.owner`, `account_access.delegate` → **`users.owner`** (not `users.id`). `owner` is the field every repository query actually filters on today (`findByOwner`, `findByOwnerAndStatus`, etc.) — `id` is Datastore's own key and isn't used as a join key anywhere in the app. This requires `users.owner` to carry a `UNIQUE` constraint. Note `account_access` needs two separate FK constraints against `users.owner` (one for `owner`, one for `delegate`).

### `users`

(from `backend/src/main/java/com/lazyspender/backend/model/User.java`)

| Column | Type | Notes |
|---|---|---|
| `id` | `VARCHAR(36)` PK | |
| `owner` | `VARCHAR(255)` UNIQUE NOT NULL | FK target for all other tables |
| `google_id` | `VARCHAR(255)` | matches `findByGoogleId` |
| `email` | `VARCHAR(255)` | matches `findByEmail` |
| `name` | `VARCHAR(255)` | |
| `picture_url` | `TEXT` | |

`accounts` (`List<String>` in the Java model) is **not** a column here — see below.

#### Resolving `User.accounts`: a join table, not an array column

`accounts` today is a simple `List<String>` that gets filtered against in Java: `BalanceTrendService` and `ExpenseDistributionService` both take an `accounts` parameter and do `accounts.contains(tx.getAccount())` in application code, specifically because Datastore's derived/GQL queries can't express an `IN` predicate. Recommend a real join table instead of a Postgres `TEXT[]` column:

```sql
CREATE TABLE user_accounts (
    user_owner   VARCHAR(255) NOT NULL REFERENCES users(owner),
    account_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_owner, account_name)
);
```

This is the better fit because the app already joins/filters on individual account values (not just displaying an opaque list) — a join table turns those into ordinary indexed queries (`WHERE account IN (SELECT account_name FROM user_accounts WHERE user_owner = ...)` or a plain `= ANY(:accounts)` parameter list) instead of array-containment operators, and it maps cleanly onto a JPA `@ElementCollection` or a proper join entity without any array-type driver quirks.

### `planned_payments`

(from `PlannedPayment.java`)

| Column | Type | Notes |
|---|---|---|
| `id` | `VARCHAR(36)` PK | |
| `owner` | `VARCHAR(255)` NOT NULL REFERENCES `users(owner)` | |
| `account` | `VARCHAR(255)` | |
| `category` | `VARCHAR(255)` | |
| `amount` | `NUMERIC(12,2)` | optional improvement over `double` — see note below |
| `note` | `TEXT` | |
| `currency` | `VARCHAR(3)` | |
| `start_date` | `TIMESTAMPTZ` | |
| `recurrence_type` | `VARCHAR(20)` + `CHECK` | `RecurrenceType` enum values |
| `recurrence_day_of_week` | `VARCHAR(10)` NULL | replaces `recurrenceValue` when `recurrence_type = WEEKLY` |
| `recurrence_day_of_month` | `SMALLINT` NULL | replaces `recurrenceValue` when `recurrence_type = MONTHLY` |
| `end_type` | `VARCHAR(20)` + `CHECK` | `EndType` enum values |
| `end_occurrence_count` | `INTEGER` NULL | replaces `endValue` when `end_type = OCCURRENCE` |
| `end_date` | `TIMESTAMPTZ` NULL | replaces `endValue` when `end_type = DATE` |
| `confirmation_type` | `VARCHAR(20)` + `CHECK` | |
| `status` | `VARCHAR(20)` + `CHECK` | |
| `next_due_date` | `TIMESTAMPTZ` | |
| `created_by` | `VARCHAR(255)` | |
| `modified_by` | `VARCHAR(255)` | |

Add a `CHECK` ensuring exactly one of `recurrence_day_of_week` / `recurrence_day_of_month` is set based on `recurrence_type`, and similarly for `end_occurrence_count` / `end_date` based on `end_type`.

`PlannedPaymentService.validateRequest` currently only allows `RecurrenceType.MONTHLY` and rejects `EndType.DATE` (per `CLAUDE.md`), even though the model supports more. Model the **full** enum space in SQL regardless — that restriction is an application-level validation choice, not a schema constraint, and shouldn't be baked into the database.

#### Resolving the dual-purpose `recurrenceValue` / `endValue` fields

Today these are stringly-typed fields whose interpretation depends on a sibling enum (`recurrenceValue` is a day name for `WEEKLY`, a day-number string for `MONTHLY`; `endValue` is an occurrence count or an ISO date string). That was only ever a Datastore modeling compromise — SQL gains nothing from preserving it. Split into the properly typed columns shown in the table above.

### `transactions`

(from `Transaction.java`)

| Column | Type | Notes |
|---|---|---|
| `id` | `VARCHAR(36)` PK | |
| `owner` | `VARCHAR(255)` NOT NULL REFERENCES `users(owner)` | |
| `account` | `VARCHAR(255)` | |
| `category` | `VARCHAR(255)` | |
| `amount` | `NUMERIC(12,2)` | optional improvement over `double` — see note below |
| `note` | `TEXT` | |
| `date` | `TIMESTAMPTZ` | |
| `currency` | `VARCHAR(3)` | |
| `ref_currency_amount` | `NUMERIC(12,2)` | |
| `planned_payment_id` | `VARCHAR(36)` NULL REFERENCES `planned_payments(id)` | promoted from a soft/manual reference to an enforced FK |
| `type` | `VARCHAR(10)` + `CHECK` | `TransactionType` (INCOME/EXPENSE) |
| `confirm` | `BOOLEAN` NOT NULL DEFAULT `TRUE` | |
| `created_by` | `VARCHAR(255)` | |
| `modified_by` | `VARCHAR(255)` | |

### `account_access`

(from `AccountAccess.java`)

| Column | Type | Notes |
|---|---|---|
| `id` | `VARCHAR(36)` PK | |
| `owner` | `VARCHAR(255)` NOT NULL REFERENCES `users(owner)` | |
| `delegate` | `VARCHAR(255)` NOT NULL REFERENCES `users(owner)` | |
| `role` | `VARCHAR(20)` + `CHECK` | `AccessRole` |
| `status` | `VARCHAR(20)` + `CHECK` | `AccessStatus` |
| `created_at` | `TIMESTAMPTZ` | |
| `responded_at` | `TIMESTAMPTZ` NULL | |

### Optional improvement: `double` → `NUMERIC(12,2)` for money

`amount` and `ref_currency_amount` are `double` in the current Java model, which risks float rounding on monetary values. Switching to `NUMERIC(12,2)` is a deliberate improvement beyond pure translation — worth doing while the schema is being redesigned anyway, but not required for functional parity with today's behavior.

## Indexes

Translating the 11 hand-declared composite indexes in `backend/src/main/resources/datastore/index.yaml` against the query patterns that actually use them:

**Keep** (map to real query shapes in `TransactionRepository`, `AccountAccessRepository`, and the trend/distribution services):
- `transactions(owner, date DESC)` — general owner-scoped listing sorted by date (`findByOwner(Pageable)`)
- `transactions(owner, type, date)` — balance-trend opening-balance aggregation
- `transactions(owner, category, date)` — expense-distribution and top-contributors queries
- `transactions(planned_payment_id)` — **new**, needed once this becomes an FK/join column (`findByPlannedPaymentId`, `countByPlannedPaymentId`, and the debt-trend `JOIN`)
- `account_access(delegate, status)` and `account_access(owner, status)` — directly match `findByDelegateAndStatus` / `findByOwnerAndStatus` / `findByOwnerAndDelegateAndStatus`

**Drop** — these existed only to satisfy Datastore's requirement that every multi-property filter/sort have a declared composite index, not because the query pattern needs a dedicated index in SQL:
- `transactions(type, amount)`, `transactions(date, amount)`, `transactions(note, amount)`, `transactions(category, date, amount)` — these look like they were declared to support the per-category `SUM(amount)` aggregation fan-out in `ExpenseDistributionService`. In Postgres, a `GROUP BY category` query with a `(owner, type, category, date)`-style index covers this without needing `amount` present in the index — the planner reads `amount` from the row itself. Datastore requires aggregated/covering columns to appear in the index; Postgres does not.

Remaining indexes are now pure performance tuning, not correctness-required the way they are in Datastore — revisit only if a specific query is observed to be slow, which is unlikely at this data volume (2 users' worth of data).

## Rewriting the aggregation workarounds

Each of the three Datastore-workaround services collapses into a single SQL query. Shapes below are illustrative, not final SQL.

### `BalanceTrendService`

Today: `findByOwnerAndDateBetweenOrderByDateAsc` fetches everything in range, then filters by the `accounts` list **in Java** (`accounts.contains(tx.getAccount())`, because Datastore has no `IN` predicate here), and computes the opening balance via a two-branch path — either an aggregate `SUM` query (no account filter) or fetching and summing every prior transaction in Java (when an account filter is present).

Becomes:
```sql
SELECT * FROM transactions
WHERE owner = :owner AND account = ANY(:accounts) AND date BETWEEN :start AND :end;

SELECT SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) AS opening_balance
FROM transactions
WHERE owner = :owner AND account = ANY(:accounts) AND date < :start;
```
One query shape regardless of whether an account filter is present — the current branch between "aggregate query" and "fetch-and-sum-in-Java" disappears. Weekly/monthly bucketing and running-balance calculation can stay as application code (it isn't Datastore-coupled), or optionally move into a windowed SQL query (`date_trunc` + `SUM() OVER (ORDER BY period)`) later.

### `ExpenseDistributionService`

This is the most Datastore-coupled file in the codebase — it uses the raw `com.google.cloud.datastore.Datastore` client directly (not Spring Data) to fire one `AggregationQuery` with `Aggregation.sum("amount")` **per category, in parallel**, as a fan-out workaround for the lack of `GROUP BY`.

Becomes:
```sql
SELECT category, SUM(amount) AS total
FROM transactions
WHERE owner = :owner AND type = 'EXPENSE' AND date BETWEEN :start AND :end
GROUP BY category;
```
The entire per-category `CompletableFuture` fan-out and the raw `Datastore`/`AggregationQuery`/`AggregationResult` client usage go away — including the need to inject a raw `Datastore` bean into this service at all.

`getTopContributors`'s in-memory `Collectors.groupingBy(Transaction::getNote, summarizingDouble(...))` + sort + `limit(10)` becomes:
```sql
SELECT note, SUM(amount) AS total, COUNT(*) AS tx_count
FROM transactions
WHERE owner = :owner AND category = :category AND date BETWEEN :start AND :end
GROUP BY note
ORDER BY total DESC
LIMIT 10;
```

### `DebtTrendService`

Today: fetches all transactions in range, then manually groups them into a `Map<String, List<Instant>>` keyed by `plannedPaymentId` in Java, since Datastore has no join to correlate transactions back to planned payments.

Becomes a real join:
```sql
SELECT pp.*, t.date
FROM planned_payments pp
LEFT JOIN transactions t
  ON t.planned_payment_id = pp.id AND t.date < :bucket_end
WHERE pp.owner = :owner AND pp.status != 'CANCELLED';
```
Per-bucket outstanding-amount calculation can stay in application code initially, or move into the query as a `COUNT(t.id) FILTER (WHERE t.date < bucket_end)` per-payment aggregate as a later optimization.

## ORM and migration tooling

**Spring Data JPA (Hibernate)**. Repository interfaces switch from `extends DatastoreRepository<T, String>` to `extends JpaRepository<T, String>` with **no changes to derived query method names** — this is the single biggest churn-minimization win of the migration:

- `AccountAccessRepository`: `findByDelegateAndStatus`, `findByOwnerAndStatus`, `findByOwnerAndDelegateAndStatus`
- `PlannedPaymentRepository`: `findByOwner`, `findByOwnerAndStatus`, `findByOwner(Pageable)`, `findByStatusAndConfirmationTypeAndNextDueDateLessThanEqual`
- `UserRepository`: `findByOwner`, `findByGoogleId`, `findByEmail`
- `TransactionRepository`: `findByOwner(Pageable)`, `findAll(Pageable)`, `findByPlannedPaymentId`, `countByPlannedPaymentId`

All carry over verbatim to Spring Data JPA's method-name query derivation.

The 5 custom GQL `@Query` methods on `TransactionRepository` need rewriting as JPQL or native SQL: the date-range scan, the `SUM(amount)` aggregate, the `DISTINCT ON (note)` projection, and the two remaining filtered scans — each a straightforward 1:1 translation.

Entity classes (`AccountAccess`, `PlannedPayment`, `Transaction`, `User`) swap `@com.google.cloud.spring.data.datastore.core.mapping.Entity` for JPA's `@jakarta.persistence.Entity` + `@Table`/`@Id`/`@Column` annotations; existing Lombok `@Data`/`@Builder` usage is unaffected.

Gradle changes in `backend/build.gradle`: drop `com.google.cloud:spring-cloud-gcp-starter-data-datastore` and the `spring-cloud-gcp-dependencies` BOM, add `spring-boot-starter-data-jpa` and the `org.postgresql:postgresql` JDBC driver.

**Flyway** for schema migrations, over Liquibase — the more common default pairing with Spring Boot, without Liquibase's YAML/XML overhead. This applies to schema DDL only, replacing today's ad hoc mix of boot-time `ApplicationRunner`s (gated by `@ConditionalOnProperty` flags) for schema-adjacent changes. The existing `migration/` package's pattern (`ApplicationRunner` + `BackfillController` HTTP endpoints, see `backend/src/main/java/com/lazyspender/backend/migration/`) stays as-is going forward for data backfills — that's a separate, app-level concern Flyway doesn't need to take over.

## One-time data migration (ETL)

Given the traffic profile, dual-write/CDC/zero-downtime cutover machinery is unnecessary complexity. A simple export → transform → load run during a short, announced maintenance window is sufficient:

1. A one-off batch job reads every row per kind from Datastore, using the same Application Default Credentials the app already relies on today — no new read-side credentials needed.
2. Transform each entity:
   - Enum values pass through unchanged as strings (already matches the `VARCHAR` + `CHECK` design).
   - `Instant` fields pass through as-is into `TIMESTAMPTZ` (JDBC handles this natively).
   - `PlannedPayment.recurrenceValue` / `endValue` get parsed and split into the new typed columns based on `recurrenceType` / `endType`.
   - `User.accounts` gets exploded into one row per account in `user_accounts`.
3. Write via JDBC into the Flyway-created schema, respecting FK insert order: `users` → `planned_payments` → `transactions` / `account_access`.
4. **Rollback plan**: leave the Datastore database completely untouched and read-only for an agreed grace period (1-2 weeks) after cutover. If an issue surfaces, the backend's datasource config can be pointed back at Datastore as a fallback before Datastore resources are decommissioned for good.
5. **Verification**: row-count parity per table against Datastore kind counts, plus spot-checks comparing specific records field-by-field (Datastore vs. Postgres) before declaring the cutover complete.

## Interim connectivity

Kept brief — hosting/networking design is explicitly out of scope for this database-only plan.

The backend stays on Cloud Run for now and will reach the AWS database over the public internet, since there's no private network path (VPC peering) between Cloud Run and AWS in scope here. This requires:
- The Aurora instance to have a public endpoint with TLS enforced on the JDBC connection (`sslmode=require` or stricter).
- Credentials stored the same simple way the JWT secret and Google OAuth client id are handled today — a Cloud Run environment variable / secret binding — rather than standing up AWS Secrets Manager purely for one connection string that only Cloud Run consumes. Revisit this once backend hosting itself eventually moves onto AWS compute.
- A firewall/security-group rule limiting inbound DB access to expected egress ranges is reasonable hardening, but is a networking concern left to the future hosting-consolidation effort.

## Phased rollout

1. **Schema design & DDL** — finalize the table definitions above, write the initial Flyway migrations (`V1__init_schema.sql` for tables/FKs/CHECK constraints, `V2__init_indexes.sql` for the indexes) against a fresh Aurora Serverless v2 instance.
2. **Application code migration to JPA** — swap `build.gradle` dependencies, convert entity annotations, convert repository interfaces to `JpaRepository`, rewrite the 5 custom `TransactionRepository` `@Query` methods, rewrite `BalanceTrendService` / `ExpenseDistributionService` / `DebtTrendService` per the shapes above, and remove the raw `Datastore` client injection from `ExpenseDistributionService`.
3. **Local dual-testing** — run the app locally against the new Postgres schema with a small/synthetic dataset first, and verify every endpoint (transactions, planned payments, account access, balance/expense/debt trend) matches prior Datastore-backed behavior before touching production data.
4. **One-time ETL cutover** — during an announced maintenance window: pause using the app briefly (trivial with 2 low-traffic users), run the ETL job, verify row counts and spot-checks, flip the backend's active datasource config from Datastore to the new Postgres connection, and redeploy to Cloud Run.
5. **Post-cutover verification** — smoke-test all endpoints against the production AWS database and monitor Cloud Run logs for connection/query errors through the first few real usage sessions.
6. **Cleanup / decommission** — after the rollback grace period elapses with no issues: remove the `spring-cloud-gcp-starter-data-datastore` dependency and any remaining Datastore-specific code paths, delete `backend/src/main/resources/datastore/index.yaml`, and decommission the Firestore-in-Datastore-mode database in GCP project `mindful-rhythm-426908-a5` to stop incurring residual GCP storage cost.
