# Changelog

Every release so far keeps **claim-file schema 1**, so state written by any
version reads in every other. See [The claim format](README.md#the-claim-format-a-contract)
for the stability promise.

## v1.4.0 — 2026-09-03

**`search_claims`** — the claim set is now reachable directly, not only through
the resume projection. The projection is budgeted, so under a tight budget bodies
are dropped and open questions omitted; and it never shows superseded, rejected
or resolved claims at all, which are exactly the ones worth checking before
re-proposing something. Searches id, title **and** body, because a claim is often
remembered by a detail in its reasoning. `continuity list` gained the same
`--query` / `--type` / `--status` / `--limit` filters, so both surfaces agree.

Also disclosed rather than changed: **the individual `record_*` tools bypass the
reconciler**, so they neither de-duplicate nor park conflicts with frozen claims —
calling `record_decision` twice with the same title creates two claims, where
`capture` would skip it. That was true since 1.0 and undocumented. Their
descriptions now say so, and explain how `title` and `body` divide the work:
`title` survives every projection, `body` may be trimmed, so anything that must
reach a future session belongs in the title.

## v1.3.0 — 2026-09-03

**`record_mission`** closes the one gap in the tool surface. The mission is the
first line of every resume context, and it previously had no route from MCP:
`create_project` accepted one at creation only, which doesn't help in repo mode
or when a mission changes. Available as the `record_mission` tool and
`continuity mission`.

Replacing a mission **supersedes** rather than amending in place — a strategic
pivot is exactly what gets asked about later, so the predecessor and reason are
kept. A replace without a reason is refused; identical text is a no-op.

Fixed:

- **`create_project` was not idempotent despite advertising it.** `init` recorded
  a mission unconditionally, so repeated calls left duplicate mission claims —
  invisible in the projection, which takes the first live mission, so they
  accumulated silently. Annotations are now asserted behaviourally in tests.
- **`why` didn't say what it returns.** Its description now covers all four
  cases: a claim with lineage, one that replaced nothing (which says so
  explicitly, so a blank answer always means the lookup failed), a resolved
  claim's closing reason, and an ambiguous match returning candidates rather
  than guessing.

## v1.2.0 — 2026-09-03

Fixes both capture defects found by auditing the tool's own history — 89 real
user turns checked against 119 claims.

- **Framing statements were dropped entirely.** The capture prompt enumerated
  only decisions, constraints, rejections and next steps, so statements setting
  strategy or authority matched nothing. "The state engine is the moat" had been
  said plainly and captured nowhere for a month. Framing and standing
  instructions are now named explicitly, with standing instructions routed to
  **constraint** rather than question — a question reads as an open topic, not a
  rule.
- **Direction churned.** Superseding a `next_action` spawned a fresh claim per
  revision: 30 of 119 claims were direction, 29 of them superseded. Direction now
  amends in place, keeping its id. Git still holds every previous version, so the
  log stays append-only; what's dropped is a separate *claim* per revision.
  Scoped to `next_action` — decisions still supersede with full lineage.

## v1.1.1 — 2026-09-03

Tool definitions rewritten for agent consumption: titles, annotations
(`readOnlyHint` / `destructiveHint` / `idempotentHint` / `openWorldHint`), and a
description on **every** parameter including nested `capture` ops — 25% → 100%
coverage. Descriptions now disclose persistence semantics and side effects.

`resolve_claim` is the only tool marked destructive, because accepting a claim
parked against a frozen one can override an invariant the user deliberately
locked. Everything else is append-only, so marking it destructive would train
clients to ignore the hint.

## v1.1.0 — 2026-09-03

**`continuity review`** — a semantic diff of what autonomous capture wrote: which
claims appeared, changed status, were superseded or edited by hand, each with its
reason. Capture has no approval gate by design, and the stated safeguard was that
you review the history afterwards; this turns that from an implied habit into one
command. Hand edits are caught as well as tool writes.

- **Resume budget.** The projection is injected into every session before you
  type anything, and had grown to 41KB across 49 claims. Now tiered and capped,
  landing at 12.2KB with every claim still listed. Degradation is always
  disclosed; the mission, milestone, direction, frozen claims and parked
  conflicts are never dropped.
- **Schema versioning.** Each claim carries its version; absent means 1. A claim
  from a *newer* build is refused by filename rather than half-parsed.
  `continuity migrate` makes the version explicit on disk.
- **CI** on Node 20 and 22, including a gate that rebuilds the bundle and fails
  if committed `dist/` differs from `src/`.
- **Entry points** — `main`, `exports`, `index.js` and a `continuity-mcp` binary,
  so the server starts under any launcher rather than only from an absolute path.

## v1.0.0 — 2026-08-26

First public release.

- **Deterministic resume projection** with no model in the read path, so the same
  state always produces the same context.
- **Typed claims** with a status lifecycle, stored one per plain-markdown file,
  with git as the append-only event log. Nothing is ever deleted: superseding
  archives the predecessor along with the reason it was replaced.
- **Autonomous capture** driven by a Stop hook, run through a reconciler that
  de-duplicates, preserves lineage, and parks anything contradicting a frozen
  claim for human review rather than applying it.
- **`resolve`** — one verb to close a parked conflict or a settled risk, with a
  mandatory reason.
- **Collision-safe ids** so two people capturing on separate clones merge
  cleanly, **self-activation** on `git clone`, and a warning when captured
  commits are unpushed.

MIT licensed.
