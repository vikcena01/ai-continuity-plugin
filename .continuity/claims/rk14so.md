---
schema: 1
id: rk14so
type: risk
title: >-
  CI stopped being scheduled entirely — rk9cg's fix shipped and passed, but no
  runs are created any more
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T16:12:00.575Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  rk9cg is closed as fixed and verified green, which is true of the workflow but
  no longer true of the protection: a future session would trust a gate that is
  not running.
---

Timeline: green on 64c6973 and e9783de (both jobs, Node 20 and 22, including the dist/ reproducibility gate), then startup_failure on 5b07bbc, then NO runs created at all — 349c7ea produced zero.

Already ruled out, so do not re-diagnose: the workflow file (byte-identical to the green run, valid YAML, confirmed on the remote copy); the workflow being disabled (API reports state=active); paths-ignore (349c7ea touched only .github/); the branch filter (push was to main). GitHub's 'likely a workflow file issue' message on a startup_failure is boilerplate, not a diagnosis.

What remains is repo- or account-level and needs the owner: Settings > Actions > General, and the account's Actions/billing restrictions. Unverifiable from a terminal — the only authenticated gh account has read-only access here, so both the permissions endpoint and 'gh run rerun' return 403.

Until this is resolved, treat `npm test` locally as the only real gate.
