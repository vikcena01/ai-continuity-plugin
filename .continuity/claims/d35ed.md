---
schema: 1
id: d35ed
type: decision
title: The state engine is the moat
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T07:38:41.714Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Stated plainly by the owner, twice — first in the original build session and
  again on 2026-09-03. It is the thesis that decides what is worth building, so
  it outranks any individual feature decision.
---

The defensible asset is the state model itself: typed claims with a status lifecycle, the deterministic projection, and the reconciler that keeps autonomous capture from degrading it. Everything else — markdown storage, MCP transport, the plugin wrapper, directory listings, hosting — is replaceable surface.

Practical consequence: when choosing what to build, prefer work that makes the state engine more correct or more trustworthy over work that adds surface.

Provenance note: this statement went uncaptured for a month. It was said in the same sentence that produced d3, capture took the propositional half and dropped this one, and it was recovered only by auditing real history (rk16it). It survived that whole time only in an assistant memory file, outside the product.
