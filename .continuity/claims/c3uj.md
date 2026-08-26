---
id: c3uj
type: constraint
title: 'Visual work must be verified by rendering it, never by reading the markup'
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:10:56.528Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Every logo failure in this project was invisible in the SVG source and obvious
  within seconds of looking at the render, so reviewing markup gives false
  confidence on anything visual.
---

Concrete misses, all of which read as correct code: an arc over a baseline became a CAR (roof and wheels); an opened-waist infinity became BRACKETS; a hand-rolled lemniscate became GOGGLES; a stroke-dasharray connector silently CLIPPED its final dot, so a 3-dot design shipped 2 dots (fixed by using explicit <circle> elements instead of dash patterns); and the preview harness itself stripped height="96" from a <rect>, making a perfectly good tile asset look broken. Method that works: generate the variants, render them side by side at several sizes on BOTH light and dark backgrounds, screenshot, and look. Add a centre-axis guide when checking alignment.
