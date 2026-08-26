---
schema: 1
id: rk13tj
type: risk
title: >-
  The write path is the weak half — capture is too eager, and its errors were
  caught only incidentally
status: resolved
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T09:43:48.492Z'
  updated: '2026-08-26T14:59:45.119Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  d9 makes the READ path trustworthy by construction, but nothing equivalent
  protects the writes, and the stated guardrail (the human reads the git diff)
  was not what actually caught the errors today.
resolution: >-
  Fixed across 69d8f55 and 96eeff7: 'continuity review' gives a semantic diff of
  what capture wrote (NEW/STATUS/REPLACED/EDITED, each with its reason), the
  resume context reports unreviewed changes so the ritual is prompted rather
  than remembered, and the Stop hook plus MCP instructions now default to
  capturing NOTHING. 21 assertions in test/review.sh.
---

Two separate problems, both measured on 2026-08-26.

VOLUME: the Stop hook fired on every turn, including turns that were pure Q&A with no project state in them, and produced roughly 20 next_action supersessions in a single day — each rewriting a long body. Distinct from q3, which is about capture being MISSED; this is about capture being excessive. The bar for 'worth capturing' needs raising, ideally by pre-filtering more cheaply than a full model round-trip.

QUALITY: three captured claims were wrong or harmful, and all three were found by chance rather than by review — rk2 recorded the wrong mechanism (silent duplication, when it was actually an add/add conflict), the q6f8 body was inverted by a blanket string rewrite into a false privacy warning about the wrong address, and personal SSH key and private-repo names were published in d29ka before anyone noticed.

The trust model assumes the human reads the diff. Nobody read those diffs. Make the review ritual a real one-command experience rather than an implied habit, or autonomous capture is confident-sounding accumulation with a determinism guarantee bolted to the read side only.
