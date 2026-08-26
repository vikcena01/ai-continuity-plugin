---
id: d25zn
type: decision
title: >-
  The logo is a git graph encoding the data model, shipped as in-repo SVG with a
  light/dark pair
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T05:56:44.731Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  The mark should say what the project is rather than decorate it, and the state
  model already has a natural visual: a timeline with branches. Keeping the
  assets as SVG inside the repo also follows c1 — no binaries, no external image
  hosting that could rot or leak referrer data.
---

assets/logo-light.svg and assets/logo-dark.svg are the wordmark lockups, selected in the README with <picture> + prefers-color-scheme so both GitHub themes work; assets/mark.svg is the standalone glyph for avatar/icon use. Under 2.4 KB total, no raster assets.

The palette is semantic and should stay that way: #6366F1 (indigo) is CURRENT state — the solid vertical timeline and its three commit nodes; #94A3B8 (slate) is SUPERSEDED state — the thinner branch curving off to an archived node, set aside but never deleted. If the mark is ever redrawn, keep that two-colour meaning; it is the whole idea of the layer in one glyph.

Still open for the user: setting the mark as the GitHub repo avatar is a web-UI action, and README badges were deliberately not added.
