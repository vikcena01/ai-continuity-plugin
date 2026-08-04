# RESUME CONTEXT — Snip internal URL shortener backend
_Build Snip, an internal URL shortener for the company used by marketing and the docs team. Must create short links, redirect fast, and later track click analytics._

**Current milestone:** Click analytics milestone
**Resume at:** Build async click-tracking write path — Immediate next task: build the click-tracking write path as fire-and-forget so redirects stay fast.

## 🔒 FROZEN — MUST NOT change
- [short-code-format] Random 7-char base62 short codes — Short codes are random, 7 characters, base62 — exactly. Chosen over sequential ids to prevent enumeration. Format is externally committed: marketing printed it in a campaign and a partner contract references '7-character Snip codes'. This can never change; it is frozen.  _(confidence: confirmed)_

## Active decisions & architecture
- [postgres-primary-store] PostgreSQL is the source of truth — Standardize on PostgreSQL as the primary datastore. Ops team knows Postgres well, it already runs in prod, and at expected volume (a few million links, low hundreds of QPS) a dedicated KV store is unwanted operational overhead. A Redis read cache may be added later if reads get hot, but Postgres remains source of truth. Settled — do not reopen.  _(confidence: confirmed)_
- [collision-retry] Unique constraint + retry on collision — Handle random-code collisions with a unique constraint on the code column plus generate-check-retry on insert.  _(confidence: confirmed)_
- [redirect-302-indexed] 302 redirect via single indexed code lookup — Redirect resolves via a single indexed lookup on the code column. Use HTTP 302 (not 301) to retain control and enable analytics interception later.  _(confidence: confirmed)_

## Active constraints
- [async-click-tracking] Click tracking must not slow redirects — Every redirect should record a click event (timestamp, referrer, coarse geo) without slowing the redirect. The write path must be fire-and-forget/async so redirects stay fast.  _(confidence: confirmed)_

## 🚫 Do NOT revisit (already rejected — do not re-propose)
- [reject-kv-store] DynamoDB/Redis as source of truth — REJECTED because: Company is standardizing on PostgreSQL, which ops knows well and already runs in prod; at expected volume a dedicated KV store is unwanted operational overhead. Redis is allowed only as an optional later read cache, not source of truth.
- [reject-autoincrement-ids] Auto-increment ids exposed in URLs — REJECTED because: Sequential ids are enumerable — anyone could walk /1, /2, /3 to scrape every link, and they leak how many links exist. Rejected in favor of random 7-char base62 codes.

## Open questions / risks
- [vanity-url-arbitration] How to reserve/arbitrate vanity codes — Custom vanity URLs (e.g. snip/blackfriday) collide with the random code space and users may fight over names. No decision yet on how to reserve or arbitrate vanity codes. Parked as an open question.
