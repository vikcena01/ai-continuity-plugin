---
id: n13vu
type: next_action
title: >-
  Settle the manifest wording, then submit to claude-community via the Console
  form
status: superseded
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:52:18.545Z'
supersedes:
  - n12gs
superseded_by: n14i4
depends_on: []
tags: []
superseded_reason: >-
  The user submitted on 2026-08-26, so the remaining work is waiting and
  verification rather than preparation; and the pin mechanics turn out to be
  less restrictive than the previous next_action implied, which changes what can
  still be changed.
---

Do first, while rewriting is still free:
  1. Decide the public description and sync .claude-plugin/plugin.json and marketplace.json to match — the directory may read from the manifest, and they currently carry older wording than the copy drafted for the submission.
  2. Restart the session (the MCP server here still runs a pre-fix bundle, so resolve_claim is not exposed) and exercise the public install path, remembering the marketplace-name collision documented in a2qj: remove the directory-source marketplace before adding the GitHub one.
  3. Look at the GitHub-rendered README — the <picture> light/dark switch and the align=left float only reveal themselves once rendered.

Then submit: `claude plugin validate .` (already passing), then platform.claude.com/plugins/submit — the Console form, NOT the claude.ai one, which requires a Team/Enterprise org. After that, treat the history as frozen.

Optional, the user's own file: a `Host github.com` block in ~/.ssh/config pinning the personal-account key (d29ka).
