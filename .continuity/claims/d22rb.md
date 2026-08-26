---
id: d22rb
type: decision
title: >-
  Distribute as a self-hosted plugin marketplace at
  github.com/vikcena01/ai-continuity-plugin — there is no public listing to
  apply for
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T05:43:55.058Z'
supersedes:
  - d11
superseded_by: null
depends_on: []
tags: []
---

A Claude Code marketplace IS just a git repo containing .claude-plugin/marketplace.json — publishing the repo is publishing to the marketplace, and there is no queue, review, or directory to apply to. Discovery is word-of-mouth or an organization's own settings (Team/Enterprise admins distribute via Organization settings > Plugins). Canonical remote: git@github.com:vikcena01/ai-continuity-plugin.git. Install is `/plugin marketplace add vikcena01/ai-continuity-plugin` then `/plugin install continuity@continuity-marketplace`. Required schema fields, all satisfied: name, owner.name, plugins[].name, plugins[].source. The marketplace name continuity-marketplace is not among the Anthropic-reserved ones. The rest of the superseded decision still holds: same model as Superpowers, and it runs on every Claude Code surface including the desktop app.
