---
schema: 1
id: x9nq
type: rejected_alternative
title: Submitting to the OpenAI plugin directory in the current architecture
status: rejected
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T08:30:03.444Z'
supersedes:
  - x8ge
superseded_by: null
depends_on: []
tags: []
---

Reference for when the hosted tier exists. Submission runs through the OpenAI Developer Platform, and as of 2026-07-09 the ChatGPT app directory was merged into the Plugin directory. Steps: create plugin; choose skills-only / MCP-only / combined; listing info plus a verified publisher identity; MCP settings; skills; starter prompts and test cases; availability regions; policy attestations; submit.

Required materials: name, descriptions, logo, category, website / support / privacy-policy / terms URLs; the public production MCP URL; authentication details and demo credentials; a content security policy naming exact domains; the domain-verification token; readOnlyHint / openWorldHint / destructiveHint annotations on every tool; five positive and three negative test cases; release notes. No review timeline is published.

Gates to budget for, beyond the engineering: a funded platform account (payment method plus credits) and verified publisher identity. Adding either before a public endpoint exists spends money for nothing — that is the specific mistake this claim exists to prevent. Note also that entering payment details is not something the assistant does; that step is always the user's own.
