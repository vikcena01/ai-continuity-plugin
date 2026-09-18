---
schema: 1
id: c23yd
type: constraint
title: >-
  Confirm a Glama release from the page's latestRelease.version field — tool
  count only works when the surface changed
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-18T07:24:02.572Z'
supersedes:
  - c21su
superseded_by: null
depends_on: []
tags: []
---

Fetch the server page cache-busted and read the structured value: "latestRelease",...,"version","1.5.0". That comes from the deployed release record.

Do NOT use, in order of how badly each misleads:
  - the displayed 'Latest release' text, which renders this repo's README status line verbatim, so it tracks the README rather than the deployment;
  - a version-shaped regex over the page, which matches that same README line;
  - tool COUNT, which only discriminates when a release changed the tool surface. It worked for 1.3.0 (12) and 1.4.0 (13) and is useless for 1.5.0, which added a security fix and no tools.

Append a changing query param: repeated fetches of one URL can return a cached pre-deploy copy.

And do not record a deployment as fact until one of these confirms it. Asserting it from a report alone put a falsehood into state once already.
