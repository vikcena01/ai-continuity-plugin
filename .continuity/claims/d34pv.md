---
schema: 1
id: d34pv
type: decision
title: >-
  The public install path is verified end to end, including for users with no
  GitHub SSH key
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T06:11:40.013Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  This was the one blocking unknown before any public announcement, and it had
  been carried as unverified for the whole project; it is now settled by
  execution rather than assumption.
---

Verified 2026-09-03 against the published repo, in an isolated CLAUDE_CONFIG_DIR so the live directory-source install (a2qj) was never touched — which is also how to re-test it without disrupting a working setup.

  claude plugin marketplace add vikcena01/ai-continuity-plugin   -> validated
  claude plugin install continuity@continuity-marketplace       -> v1.1.1, enabled

The installed tree carries every component: dist/mcp.js, both hook bundles, hooks.json, skills/continuity/SKILL.md, commands/, .claude-plugin/plugin.json. The installed server initializes and lists 11 tools.

SSH is tried first, and it FALLS BACK to HTTPS automatically ('SSH clone failed, retrying with HTTPS'), confirmed by forcing GIT_SSH_COMMAND=/bin/false. So a stranger with no GitHub key installs fine — which was the specific worry, since the first successful run cloned over git@github.com and looked machine-specific.
