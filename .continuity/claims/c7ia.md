---
id: c7ia
type: constraint
title: >-
  Verify rendered output, never markup — and decode GitHub's HTML before
  concluding a tag was stripped
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T07:11:40.942Z'
supersedes:
  - c3uj
superseded_by: null
depends_on: []
tags: []
---

Every logo failure in this project was invisible in the SVG source and obvious within seconds of looking at the render. Concrete misses, all of which read as correct code: an arc over a baseline became a CAR (roof and wheels); an opened-waist infinity became BRACKETS; a hand-rolled lemniscate became GOGGLES; a stroke-dasharray connector silently CLIPPED its final dot so a 3-dot design shipped 2; and the preview harness itself stripped height="96" from a <rect>, making a good tile asset look broken. Method that works: generate the variants, render them side by side at several sizes on BOTH light and dark backgrounds, screenshot, and look. Add a centre-axis guide when checking alignment.

Corollary for GitHub-rendered markdown: the README is delivered inside a JSON-escaped payload (\u003c rather than <), so grepping the page HTML for `<picture` finds nothing even when the element is present and working. Decode first, or check counts of the bare token. Verified 2026-08-26 that GitHub KEEPS <picture> with a prefers-color-scheme <source> (wrapping it in its own <themed-picture> element) and keeps align/hspace on <img>, adding style="max-width: 100%" and dropping vspace. Also: give curl an explicit -m timeout — a malformed invocation that treats a filename as a URL hangs for minutes rather than failing.
