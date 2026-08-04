# RESUME CONTEXT — Snip internal URL shortener backend
_Build Snip, an internal URL shortener for the company used by marketing and the docs team. Must create short links, redirect fast, and later track click analytics._

**Current milestone:** Click analytics milestone
**Resume at:** Build async click-tracking write path shipping events to ClickHouse — Build the async click-tracking write path that ships click events to ClickHouse without slowing the redirect.

## 🔒 FROZEN — MUST NOT change
- [short-code-format] Random 7-char base62 short codes — Short codes are random, 7 characters, base62 — exactly. Chosen over sequential ids to prevent enumeration. Format is externally committed: marketing printed it and a partner contract references '7-character Snip codes'. Frozen.  _(confidence: confirmed)_

## Active decisions & architecture
- [postgres-primary-store] PostgreSQL is the source of truth — Standardize on PostgreSQL as the primary datastore. A Redis read cache may be added later if reads get hot, but Postgres remains source of truth. Settled — do not reopen.  _(confidence: confirmed)_
- [collision-retry] Unique constraint + retry on collision — Handle random-code collisions with a unique constraint on the code column plus generate-check-retry on insert.  _(confidence: confirmed)_
- [redirect-302-indexed] 302 redirect via single indexed code lookup — Redirect resolves via a single indexed lookup on the code column. Use HTTP 302 (not 301) to enable analytics interception later.  _(confidence: confirmed)_
- [analytics-clickhouse-store] Analytics goes into a separate ClickHouse store; Postgres serves links only — Week 8 current decision: all click events go to a SEPARATE analytics store (ClickHouse) via the async write path. The primary Postgres serves ONLY links. Replaces both the logs idea and the clicks-in-main-Postgres plan.  _(confidence: confirmed)_
    ↳ replaced [analytics-logs-cloudwatch] "Emit click events to application logs / CloudWatch" — because: Logs/CloudWatch are hard to query for real analytics and retention gets expensive; superseded by the dedicated ClickHouse analytics store.
    ↳ replaced [analytics-clicks-main-postgres] "Store click events in a clicks table in main Postgres" — because: Load testing showed analytics inserts at real click volume bloat the primary Postgres and contend with link-serving reads, slowing redirects and violating the 'redirects must stay fast' rule; superseded by moving analytics to a separate ClickHouse store.

## Active constraints
- [async-click-tracking] Click tracking must not slow redirects — Every redirect records a click event (timestamp, referrer, coarse geo) without slowing the redirect. The write path must be fire-and-forget/async.  _(confidence: confirmed)_

## 🚫 Do NOT revisit (already rejected — do not re-propose)
- [reject-kv-store] DynamoDB/Redis as source of truth — REJECTED because: Standardizing on PostgreSQL which ops knows well; at expected volume a KV store is unwanted overhead. Redis allowed only as an optional later read cache, not source of truth.
- [reject-autoincrement-ids] Auto-increment ids exposed in URLs — REJECTED because: Sequential ids are enumerable (walk /1,/2,/3 to scrape every link) and leak link counts. Rejected in favor of random 7-char base62.

## Open questions / risks
- [vanity-url-arbitration] How to reserve/arbitrate vanity codes — Custom vanity URLs collide with the random code space; no decision yet on how to reserve or arbitrate them. Parked.
