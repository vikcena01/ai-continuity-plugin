---
schema: 1
id: c14iq
type: constraint
title: >-
  Verify against the source before reporting a finding — a summary of a page is
  not the page
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T05:33:38.085Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  This project runs on repeatedly checking external status pages, and acting on
  a summarizer's editorialising has already produced two wrong diagnoses that
  cost real time.
---

A fetched page comes back as a model's summary, and that model adds observations of its own. Relayed as fact, they become confident and wrong.

Concretely on 2026-09-03: a summary of Glama's schema page reported 'missing input schemas: no parameter specifications for any tool'. The page contained every schema — mission, unfreeze, conflicts_with, ops — and the server demonstrably emits typed properties with required arrays for all 11 tools. The finding was invented by the summarizer.

Same family as the Dockerfile episode, where a mechanism was inferred twice from a stack trace when the answer was one line of config in a file not yet seen.

Rule: before reporting an external system's verdict, check the artifact itself — grep the raw page, probe the server, read the config. Cheap, and it is the difference between a finding and a guess.
