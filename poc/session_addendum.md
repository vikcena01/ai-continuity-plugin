# Snip — session addendum (weeks 7-8): analytics storage evolves

Continues the Snip project. This addendum is where the analytics-storage
decision changed over time. Capture the CURRENT state and record what replaced
what, and why.

---

**Week 7 — first pass at analytics storage**

ENG: For click analytics, easiest is probably to just emit each click to our
application logs / CloudWatch and parse them into reports later.

AI: We can, but logs are hard to query for real analytics and retention gets
expensive.

ENG: Fair. Scrap the logs idea. Let's store click events in a `clicks` table in
our main Postgres, right next to the links. One database, one system, simplest
thing that works. Go with that.

AI: Okay — click events in a `clicks` table in the primary Postgres.

**Week 8 — load test changes the decision**

ENG: We load-tested the clicks-in-main-Postgres approach and it's a problem. At
real click volume the analytics inserts bloat the primary database and the write
load contends with the link-serving reads — redirects started slowing down under
analytics load, which violates our "redirects must stay fast" rule.

AI: So the same-Postgres analytics store isn't going to hold.

ENG: Right. New decision: analytics goes into a SEPARATE analytics store —
we're using ClickHouse. The primary Postgres serves ONLY links; all click events
go to ClickHouse via the async write path. This replaces both the logs idea and
the clicks-in-main-Postgres plan. That's the current design.

AI: Understood — analytics lives in ClickHouse, primary Postgres is links-only.

ENG: Next task is unchanged in spirit but now points at ClickHouse: build the
async click-tracking write path that ships events to ClickHouse without slowing
the redirect.
