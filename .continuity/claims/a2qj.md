---
id: a2qj
type: architecture
title: >-
  Locally the plugin is installed from a DIRECTORY-source marketplace pointing
  at the working copy, and its name collides with the published one
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:46:33.678Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Non-obvious and it changes the advice: a future session would otherwise tell
  the user to simply add the GitHub marketplace, which fails because a
  marketplace name can only be registered once per user.
---

~/.claude/settings.json holds extraKnownMarketplaces.continuity-marketplace with source {source: directory, path: /Users/vikash/ai-work/ai-continuity-layer} and enabledPlugins['continuity@continuity-marketplace'] = true. So the plugin in use tracks the working copy — edits apply with no reinstall, which is why development has worked all along, and also why the PUBLIC install path has never been exercised.

The repo's own .claude-plugin/marketplace.json declares the same name, `continuity-marketplace`. Per the official docs each user may register only one marketplace per name, so testing the GitHub path requires `/plugin marketplace remove continuity-marketplace` FIRST, then `/plugin marketplace add vikcena01/ai-continuity-plugin` and `/plugin install continuity@continuity-marketplace`. Switching means running published code, so local edits stop taking effect until pushed — switch back to the directory source to resume development.

Related: inside this working copy the hooks register twice, once from the installed plugin and once from the committed .claude/settings.json self-activation (d19). Harmless — both de-duplicate per session via src/core/once.ts — and visible in transcripts as the Stop hook firing from ${CLAUDE_PLUGIN_ROOT} on some turns and $CLAUDE_PROJECT_DIR on others.
