---
id: n9pi
type: next_action
title: >-
  Push is BLOCKED on credentials, not on any decision — authenticate as
  vikcena01, then push
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:17:49.496Z'
supersedes:
  - n8h1
superseded_by: null
depends_on: []
tags: []
---

Everything is approved and ready. `main` is at 1cb54cf, tag v1.0.0, tree clean, 69 assertions green, dist/ verified in sync, and origin still shows 0 refs — nothing has been published.

Diagnosis of the failure (all read-only checks): the target repo github.com/vikcena01/ai-continuity-plugin EXISTS and is already PUBLIC, so nothing leaked. Three credentials are present and none can write to it. (1) The default SSH key authenticates as a DEPLOY KEY for a different repo, an unrelated private repo — deploy keys are single-repo, hence 'denied to deploy key'. (2) ~/.ssh/config defines a `github-work` alias pointing at a work key path, but that key file does not exist on disk. (3) The gh CLI is authenticated as `the work account` with only READ on this repo — and per the no-work-identity constraint it must not be used here anyway.

Resolution is the user's to perform, since it involves credentials: either `gh auth login` as vikcena01 then `git remote set-url origin https://github.com/vikcena01/ai-continuity-plugin.git`, or add an SSH key for vikcena01. Then `git push -u origin main --follow-tags`. Afterwards, verify `/plugin marketplace add vikcena01/ai-continuity-plugin` resolves, and check the GitHub-rendered README for the <picture> theme switch and the align=left float.
