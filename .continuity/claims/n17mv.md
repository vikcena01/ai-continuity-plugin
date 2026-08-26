---
id: n17mv
type: next_action
title: >-
  Everything actionable from a terminal is done — poll the catalogue, then
  verify install from a fresh session
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T07:13:03.592Z'
supersedes:
  - n16u8
superseded_by: null
depends_on: []
tags: []
---

Verified live 2026-08-26 via api.github.com/repos/vikcena01/ai-continuity-plugin: description set ('Durable project state across AI sessions — decisions, constraints, and rejected paths, versioned in git. Not a memory tool.'), topics ai-agents / claude-code / claude-code-plugin / git / mcp / project-state, licence MIT detected, public, default branch main. Rendered README verified earlier the same day: <picture> with prefers-color-scheme survives GitHub's sanitiser, align=left survives, all four assets serve 200. Attribution live: Contributors 1 — vikcena01 Vikash Singh.

Nothing further can be done from a terminal session. Remaining, all requiring something else:
  1. WAIT on review, then poll: curl -s https://raw.githubusercontent.com/anthropics/claude-plugins-community/main/.claude-plugin/marketplace.json | grep -c '"name": "continuity"' — 0 now, 1 once live. No SLA is published; the catalogue syncs nightly, so allow a day after approval.
  2. FRESH SESSION: exercise the public install path, removing the directory-source marketplace first because the name collides (a2qj). Also the first chance to confirm resolve_claim is exposed — the server in the session that built it runs a pre-fix bundle.
  3. COWORK APP: answer q8w6 by installing there rather than reasoning about it.
  4. Optional, the user's own file: a `Host github.com` block in ~/.ssh/config pinning the personal-account key, so the an unrelated private repo deploy key stops winning by default (d29ka).

New commits stay safe; only rewriting history breaks the SHA pin (c6vg).
