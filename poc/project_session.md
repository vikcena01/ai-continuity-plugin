# Project: "Snip" — internal URL shortener backend

This is a condensed record of ~6 weeks of design work between an engineer (ENG)
and their AI assistant (AI). Treat it as the raw material of a long-running project.

---

**Week 1 — kickoff**

ENG: We're building Snip, an internal URL shortener for the company. Needs to
create short links, redirect fast, and (later) track click analytics. It'll be
used by marketing and the docs team.

AI: Got it. Core pieces: link creation, redirect service, storage, analytics.

**Week 2 — storage decision**

AI: For the primary datastore I'd suggest DynamoDB or Redis as the source of
truth — key/value fits short-code → URL lookups and it's fast.

ENG: No. We're standardizing on PostgreSQL. Our whole ops team knows Postgres
cold, we already run it in prod, and at our volume (a few million links, low
hundreds of QPS) a dedicated KV store is operational overhead we don't want. We
can add a Redis *cache* in front later if reads get hot, but Postgres is the
source of truth. This is settled — don't reopen it.

AI: Understood. Postgres as primary store, optional read cache later.

**Week 3 — short code format**

ENG: Two options for the short codes. Either expose the row's auto-increment id
in the URL, or generate a random code.

AI: Auto-increment is simplest.

ENG: Absolutely not — sequential ids are enumerable. Anyone could walk
/1, /2, /3 and scrape every link, and they leak how many links exist. We use a
random 7-character base62 code. And lock this down: 7 chars, base62, exactly.
Marketing has already printed the format in a campaign and a partner's contract
references "7-character Snip codes." This can never change. It is frozen.

AI: Noted — random 7-char base62, frozen. Sequential/auto-increment ids in URLs
are off the table for enumeration reasons.

**Week 4 — collisions**

ENG: With random codes we'll get occasional collisions. Handle it with a unique
constraint + retry on insert.

AI: Agreed, generate-check-retry.

ENG: One thing still unresolved: custom vanity URLs (like snip/blackfriday).
Those collide with the random space and users may fight over names. We haven't
decided how to reserve or arbitrate vanity codes. Park it as an open question.

**Week 5 — redirect path**

ENG: Redirect must be fast. Single indexed lookup on the code column, 301 vs 302
— use 302 so we keep control and can add analytics interception later.

AI: 302 it is.

**Week 6 — analytics milestone**

ENG: Storage and redirect are done and deployed. Next milestone is click
analytics: every redirect should record a click event (timestamp, referrer,
coarse geo) without slowing the redirect. The immediate next task is building the
click-tracking write path — fire-and-forget so redirects stay fast.

AI: So the current focus is the analytics milestone, first task the async
click-tracking write path.
