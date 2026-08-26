---
id: rk3
type: risk
title: >-
  git clone carries the state but does not activate it — no tracked
  .claude/settings.json registers the hooks
status: resolved
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T05:17:40.530Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  The distribution story assumes plugin install, but the natural collaborator
  action is git clone; without self-activation the automation that makes
  Continuity valuable is invisible to a new person.
---

Verified 2026-08-25 with a real clone into a temp dir: .continuity/claims/*.md is fully tracked (31 files) and `node dist/cli.js resume` renders the complete context with NO node_modules present, confirming d13's zero-install claim. But the only file under .claude/ is settings.local.json, which is untracked (and holds stale POC permissions). Nothing in the repo registers the SessionStart hook, the Stop hook, or the MCP server, so a collaborator who clones gets no auto-resume and no auto-capture until they separately run the /plugin install steps — the state sits unread. Fix is small: commit a .claude/settings.json wiring the hooks so the repo self-activates on clone.

FIXED in cb00387: .claude/settings.json registers both hooks against the repo's own committed bundles via $CLAUDE_PROJECT_DIR, so a plain clone self-activates. Both hooks de-duplicate per session (src/core/once.ts) so a developer who also has the plugin installed is not double-fired.
