---
id: ope1
type: open_question
title: >-
  Stop-hook capture is at-most-once-per-10s, not once per turn — throttle can
  skip captures in fast exchanges
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-25T15:49:39.180Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Qualifies d15's reliability claim: the mechanism is automatic but not
  literally every-turn, and that caveat is invisible from d15 alone.
---

The Stop hook's second loop-guard is a 10s on-disk time throttle (THROTTLE_MS in src/hook-stop-capture.ts). It makes a runaway loop physically impossible, but it also means two turns completed inside the same 10s window produce only ONE capture check. A rapid back-and-forth where a decision is settled in the second turn can therefore still lose that decision. Open question for q1: is per-turn reliability actually needed, or is at-most-once-per-10s good enough in practice? Do not remove the throttle to fix this — it is the backstop that makes a blocking Stop hook safe.
