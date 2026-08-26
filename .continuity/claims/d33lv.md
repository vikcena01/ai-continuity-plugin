---
id: d33lv
type: decision
title: >-
  The README header follows the the reference project house style, with two deliberate
  deviations
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

Adopted from a reference project the user chose: centred hero, centred badge row with EVERY badge wrapped in a link, then a --- rule before the body copy. Both projects already use #6366f1 as the brand indigo, so the badges match the mark with no adjustment. Each badge links somewhere real rather than decorating: version to releases, license to LICENSE, Claude Code to the install section, MCP to the Desktop section, tests to test/, dependencies to package.json. In-README anchor targets were verified against the actual headings rather than assuming GitHub's slug rules.

Deviation 1 — version and license badges are DYNAMIC (shields reads github/v/tag and github/license). the reference project hardcodes 'version-v0.3.1', which needs a manual edit every release or it silently lies. Do not replace ours with a static badge.

Deviation 2 — no `<h1 align="center">Continuity</h1>` under the logo. the reference project's hero is an 800px illustrated banner that a text heading complements; ours is a 180px WORDMARK lockup that already renders the name, so an H1 would print 'Continuity' twice. The cost is a missing top-level anchor and slightly worse screen-reader landmarks — accepted, revisit only if the hero changes to a mark-only image.
