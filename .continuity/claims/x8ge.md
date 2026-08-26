---
schema: 1
id: x8ge
type: rejected_alternative
title: Submitting to the OpenAI plugin directory in the current architecture
status: superseded
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T08:27:55.008Z'
supersedes: []
superseded_by: x9nq
depends_on: []
tags: []
superseded_reason: >-
  Rejected on architecture AND on cost. Their submission requires a production
  MCP server URL publicly reachable over HTTPS plus a domain-verification token
  at /.well-known/openai-apps-challenge; this plugin's server is local stdio by
  design (d5 local-first, d6 state in the user's repo or ~/.continuity), so
  there is nothing for a remote service to reach. On top of that the platform
  gates the flow behind a PAYMENT METHOD AND PURCHASED CREDITS and a verified
  individual-or-business publisher identity — so proceeding today means paying
  to reach a form that cannot be completed. Their quality bar additionally
  requires functionality not natively supported by the assistant's own
  conversational capabilities, which a hosted version would have to argue
  against a first-party memory feature. Revisit only once the hosted tier x1
  deferred actually exists; the full step list is kept in the body for that day.
reason: >-
  Their submission requires a PRODUCTION MCP SERVER URL THAT IS PUBLICLY
  REACHABLE OVER HTTPS, plus a domain-verification token served at
  /.well-known/openai-apps-challenge. This plugin's server is local stdio by
  design: d5 makes it local-first and d6 keeps state either inside the user's
  repo or under ~/.continuity, so there is nothing for a remote service to reach
  and git-as-the-event-log has no counterpart. That is architecture, not
  packaging. Submitting would mean first building the hosted variant that x1
  deliberately deferred, with auth, multi-tenancy and a privacy policy attached.
  Their quality bar also requires functionality not natively supported by the
  assistant's own conversational capabilities, which a hosted version would have
  to argue against a first-party memory feature — a harder review than one where
  the plugin runs locally and the distinction is self-evident. Revisit only
  after the hosted tier exists and adoption justifies it; the steps themselves
  are recorded in the claim body for whenever that day comes.
---

For reference when the hosted tier exists — submission runs through the OpenAI Developer Platform, and as of 2026-07-09 the ChatGPT app directory was merged into the Plugin directory. Steps: create plugin; choose skills-only / MCP-only / combined; listing info plus a VERIFIED publisher identity; MCP settings; skills; starter prompts and test cases; availability regions; policy attestations; submit. Required materials: name, descriptions, logo, category, website / support / privacy-policy / terms URLs; the public production MCP URL; authentication details and demo credentials; a content security policy naming exact domains; the domain-verification token; readOnlyHint / openWorldHint / destructiveHint annotations on every tool; five positive and three negative test cases; release notes. No review timeline is published.
