---
id: d33lv
type: decision
title: >-
  README header layout: centred hero, linked badge row, rule before the body
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T07:17:40.190Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  The user pointed at a reference project the user chose as the reference, so
  matching it is intentional cross-project consistency — and the two places we
  depart from it are improvements rather than oversights, which needs recording
  or a future session will 'correct' them back.
---

Header layout: centred hero, then a centred badge row with EVERY badge wrapped in a link, then a
`---` rule before the body copy. Each badge points somewhere real rather than decorating: version to
releases, license to LICENSE, Claude Code to the install section, MCP to the Desktop section, tests
to test/, dependencies to package.json. In-README anchor targets were verified against the actual
headings rather than assuming GitHub's slug rules.

Deviation 1 — the version and license badges are DYNAMIC (shields reads github/v/tag and
github/license) rather than hardcoded strings, so they follow the repo instead of needing a manual
edit every release. Do not replace them with static badges.

Deviation 2 — no `<h1 align="center">Continuity</h1>` under the logo. That pattern suits an
illustrated banner hero; ours is a 180px WORDMARK lockup that already renders the name, so an H1
would print 'Continuity' twice. The cost is a missing top-level anchor and slightly worse
screen-reader landmarks — accepted, revisit only if the hero becomes a mark-only image.
