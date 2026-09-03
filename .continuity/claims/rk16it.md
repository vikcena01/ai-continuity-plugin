---
schema: 1
id: rk16it
type: risk
title: >-
  Capture Audit v0: recall fails on framing, authority is misclassified, and a
  quarter of the corpus is direction churn
status: superseded
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T07:31:03.000Z'
supersedes:
  - rk15ac
superseded_by: rk17sk
depends_on: []
tags: []
superseded_reason: >-
  Two of the three audit findings are now fixed in v1.2.0 and the missed
  instance has been recovered, so the original risk overstates what is still
  wrong; what remains is that the framing fix is an instruction change with no
  evidence behind it yet.
---

Audited 26 user turns from the build session plus 63 from this one, against 119 claims.

FALSE NEGATIVE — framing statements. 'The state engine is the moat' was said verbatim in the same sentence that produced d3; zero claims mention 'moat' or 'state engine'. It survived only in the assistant's separate auto-memory, i.e. outside the product. Same class: 'your call, I gave you full ownership'. Capture sees 'use X / not Y' and is blind to statements that set strategy or authority.

MISCLASSIFIED — right content, wrong authority level. The owner's standing instruction 'if not, don't do anything' exists only inside q9c8, which is an open QUESTION about a research problem. A future session reads it as an unresolved topic, not as a rule it must obey. Questions are not guardrails; constraints are.

CHURN, quantified — 30 of 119 claims (25%) are next_action, and 29 of those 30 are superseded. A quarter of the corpus is restatements of what to do next, each one a file, a commit, and re-read in every projection until replaced. rk13tj called capture over-eager; this is the number.

CORRECT NEGATIVE, worth keeping — across six turns of detailed advisor design proposals, capture recorded nothing until the owner said 'go'. Axis 2 works when the discipline is explicit; it fails when the signal is implicit.

Still deliberately NOT captured: the moat thesis itself, which needs the owner's wording rather than a reconstruction.
