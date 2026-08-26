---
id: d22rb
type: decision
title: >-
  Distribute as a self-hosted plugin marketplace at
  github.com/vikcena01/ai-continuity-plugin — there is no public listing to
  apply for
status: superseded
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T05:43:55.058Z'
supersedes:
  - d11
superseded_by: d31t2
depends_on: []
tags: []
superseded_reason: >-
  The superseded version asserted there is no public listing to apply for. That
  was WRONG and it overturned d11, which had been right. The error came from
  checking only the plugin-marketplaces docs page, which does not mention
  submission, and treating one source's silence as proof of absence.
  claude.com/plugins states 'Submit your plugin: we'll review it for the
  directory', and the plugins docs describe the pipeline in full.
---

A Claude Code marketplace IS just a git repo containing .claude-plugin/marketplace.json — publishing the repo is publishing to the marketplace, and there is no queue, review, or directory to apply to. Discovery is word-of-mouth or an organization's own settings (Team/Enterprise admins distribute via Organization settings > Plugins). Canonical remote: git@github.com:vikcena01/ai-continuity-plugin.git. Install is `/plugin marketplace add vikcena01/ai-continuity-plugin` then `/plugin install continuity@continuity-marketplace`. Required schema fields, all satisfied: name, owner.name, plugins[].name, plugins[].source. The marketplace name continuity-marketplace is not among the Anthropic-reserved ones. The rest of the superseded decision still holds: same model as Superpowers, and it runs on every Claude Code surface including the desktop app.
