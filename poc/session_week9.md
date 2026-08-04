# Snip — session week 9 (new decisions)

Continues the Snip project. Capture the new decisions made in this session.

---

**Week 9 — redirect caching + campaign codes**

ENG: Two things today.

First, redirects. For public share links we want browsers and CDNs to cache the
redirect, and marketing wants the SEO link equity that comes with a permanent
redirect. So switch our redirects from 302 to **301 permanent**. We originally
picked 302 to keep an interception hook for analytics, but analytics now goes to
ClickHouse on an async path, so we don't need the 302 hook anymore. Use 301.

AI: Got it — 301 permanent redirects.

ENG: Second, product wants a "campaign codes" namespace — human-readable-ish
codes for big marketing pushes. To avoid collisions with the existing space,
allow those to be **8 characters**. So we'll support 8-char codes for campaigns.

AI: Understood — 8-character codes for the campaign namespace.
