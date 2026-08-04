# RESUME CONTEXT — Snip internal URL shortener backend
_Build Snip, an internal URL shortener for the company used by marketing and the docs team. Must create short links, redirect fast, and later track click analytics._

**Current milestone:** Click analytics milestone
**Resume at:** Build async click-tracking write path shipping events to ClickHouse — Build the async click-tracking write path that ships click events to ClickHouse without slowing the redirect.

## ⚠️ CONFLICTS NEEDING ATTENTION (unresolved — do not act blindly)
- [8-char-campaign-codes] "Support 8-character codes for campaign namespace" conflicts with [short-code-format] "Random 7-char base62 short codes" (frozen)
    → New 8-char campaign codes clash with the FROZEN 7-char base62 format, which is externally committed (marketing + partner contract referencing '7-character Snip codes'). Cannot be auto-adopted. Whether a separate campaign namespace is exempt from the contractual 7-char guarantee is a human decision. New claim parked; frozen claim untouched.

## 🔒 FROZEN — MUST NOT change
- [short-code-format] Random 7-char base62 short codes — Short codes are random, 7 characters, base62 — exactly. Chosen over sequential ids to prevent enumeration. Format is externally committed: marketing printed it and a partner contract references '7-character Snip codes'. Frozen.  _(confidence: confirmed)_

## Active decisions & architecture
- [postgres-primary-store] PostgreSQL is the source of truth — Standardize on PostgreSQL as the primary datastore. A Redis read cache may be added later if reads get hot, but Postgres remains source of truth. Settled — do not reopen.  _(confidence: confirmed)_
- [collision-retry] Unique constraint + retry on collision — Handle random-code collisions with a unique constraint on the code column plus generate-check-retry on insert.  _(confidence: confirmed)_
- [analytics-clickhouse-store] Analytics goes into a separate ClickHouse store; Postgres serves links only — Week 8 current decision: all click events go to a SEPARATE analytics store (ClickHouse) via the async write path. The primary Postgres serves ONLY links. Replaces both the logs idea and the clicks-in-main-Postgres plan.  _(confidence: confirmed)_
    ↳ replaced [analytics-logs-cloudwatch] "Emit click events to application logs / CloudWatch" — because: Logs/CloudWatch are hard to query for real analytics and retention gets expensive; superseded by the dedicated ClickHouse analytics store.
    ↳ replaced [analytics-clicks-main-postgres] "Store click events in a clicks table in main Postgres" — because: Load testing showed analytics inserts at real click volume bloat the primary Postgres and contend with link-serving reads, slowing redirects and violating the 'redirects must stay fast' rule; superseded by moving analytics to a separate ClickHouse store.
- [use-301-permanent-redirects] Use 301 permanent redirects for share links — Switch public share-link redirects from 302 to 301 permanent so browsers and CDNs cache them and marketing gains SEO link equity. The 302 was originally kept as an analytics interception hook, but analytics now runs async to ClickHouse, so the hook is no longer needed.  _(confidence: confirmed)_
    ↳ replaced [redirect-302-indexed] "302 redirect via single indexed code lookup" — because: [AUTO-RECONCILED] 302's sole justification was analytics interception; analytics now runs async to ClickHouse, so 301 permanent redirects (browser/CDN caching + SEO) supersede it.

## Active constraints
- [async-click-tracking] Click tracking must not slow redirects — Every redirect records a click event (timestamp, referrer, coarse geo) without slowing the redirect. The write path must be fire-and-forget/async.  _(confidence: confirmed)_

## 🚫 Do NOT revisit (already rejected — do not re-propose)
- [reject-kv-store] DynamoDB/Redis as source of truth — REJECTED because: Standardizing on PostgreSQL which ops knows well; at expected volume a KV store is unwanted overhead. Redis allowed only as an optional later read cache, not source of truth.
- [reject-autoincrement-ids] Auto-increment ids exposed in URLs — REJECTED because: Sequential ids are enumerable (walk /1,/2,/3 to scrape every link) and leak link counts. Rejected in favor of random 7-char base62.

## Open questions / risks
- [vanity-url-arbitration] How to reserve/arbitrate vanity codes — Custom vanity URLs collide with the random code space; no decision yet on how to reserve or arbitrate them. Parked.
