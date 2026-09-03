<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo-light.svg" alt="Continuity" width="180">
  </picture>
</p>

<p align="center"><em>Resume any AI session without losing your decisions, constraints, or direction.</em></p>

<p align="center">
  <a href="https://github.com/vikcena01/ai-continuity-plugin/releases"><img src="https://img.shields.io/github/v/tag/vikcena01/ai-continuity-plugin?label=version&color=6366f1" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/vikcena01/ai-continuity-plugin?color=6366f1" alt="License"></a>
  <a href="#install-as-a-claude-plugin"><img src="https://img.shields.io/badge/Claude%20Code-plugin-8b5cf6" alt="Claude Code plugin"></a>
  <a href="#use-it-in-claude-desktop-mcp"><img src="https://img.shields.io/badge/MCP-server-8b5cf6" alt="MCP server"></a>
  <a href="https://github.com/vikcena01/ai-continuity-plugin/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/vikcena01/ai-continuity-plugin/ci.yml?branch=main&label=ci" alt="CI"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/dependencies-zero-3fb950" alt="Zero dependencies"></a>
  <a href="https://glama.ai/mcp/servers/vikcena01/ai-continuity-plugin"><img src="https://glama.ai/mcp/servers/vikcena01/ai-continuity-plugin/badges/score.svg" alt="Glama score"></a>
</p>

---

Portable, git-backed **project-state** for long-running AI work — in Claude Code, Cursor, or anything that speaks MCP.

It is **not a memory tool.** A memory tool answers *"what did we talk about?"* Continuity answers a different question: *"what is true about this project **now**, and what must not be touched?"*

## Why it's built this way

- **State lives as plain markdown files, tracked by git.** Git *is* the event log: history = `git log`, rollback = `git revert`, audit = `git blame`. Every claim is human-readable, diffable, and hand-editable. You review what the AI captured the same way you review generated code — as a diff, whenever you want. There is **no approval gate** at capture time.
- **Two storage modes, one API.** *Repo mode* (`<repo>/.continuity/`, found by walking up from the working dir) suits editor/agent tools with a project cwd like Claude Code. *Central mode* (`~/.continuity/projects/<name>/`, named projects) suits tools with no project cwd like **Claude Desktop** — you just refer to a project by name.
- **The resume context is a deterministic projection** of those files (no LLM in the read path) — frozen constraints, active decisions *with the reasons they superseded older ones*, rejected paths you shouldn't re-propose, open questions, and the next step.
- **Trust comes from honesty, not blind faith.** Every claim carries `confidence` + `provenance`, so a fresh session knows what's confirmed vs. AI-inferred and calibrates instead of trusting everything.

See [`DESIGN.md`](DESIGN.md) for the full architecture and [`poc/`](poc/) for the validation that motivated it.

## Install (as a Claude plugin)

Continuity is a Claude Code plugin, distributed as its own plugin marketplace — this repo is the marketplace. It runs everywhere Claude Code runs: the **terminal, the desktop app, and web**. In Claude Code:

```
/plugin marketplace add vikcena01/ai-continuity-plugin
/plugin install continuity@continuity-marketplace
```

That's it — the bundled MCP server, the `continuity` skill (auto-resume + auto-capture), the SessionStart hook, and the `/resume` `/freeze` `/why` commands all install together. `dist/` is committed and dependency-free, so there's no build step on install.

### Local development

```bash
npm install
npm run build   # typecheck + bundle to dist/
npm test        # build + 186 assertions across ten suites
```

## The loop (CLI)

```bash
continuity init "Build Snip, an internal URL shortener"
continuity record-decision "PostgreSQL is the source of truth" --body "ops knows it; volume is modest"
continuity reject "DynamoDB as primary store" --reason "KV overhead unjustified at our volume"
continuity record-constraint "Short codes are exactly 7-char base62" --body "printed in marketing + partner contract"
continuity freeze "7-char base62"     # lock an invariant — fuzzy: id OR title substring
continuity resume                     # <- the compact state a new session gets
continuity why "301"                  # <- what a decision replaced, and why
continuity resolve "8-char codes" --reject --reason "separate namespace"
continuity mission "..." --reason "why it changed"   # replacing one needs a reason
continuity list --query "base62"      # search id, title AND body
continuity list                       # ids are short: d1k3, c2m9, x1p4, ...
continuity log                        # the git-backed event log
```

Claims get short, typeable ids — a type prefix, a sequence number, and a two-char suffix: `d1k3`, `c2m9`, `x1p4`. The suffix is what makes concurrent work safe: without it, two developers who each record the 16th decision both write `claims/d16.md` and collide on merge. `freeze` / `why` / `supersede` / `resolve` accept an id **or** a title substring. State is written under `claims/` and auto-committed to git on every change — but never auto-pushed, so `resume` warns you when captured commits are sitting unpushed.

### Closing a claim

`resolve` is the only way a claim reaches a terminal status, and the reason is mandatory — a claim that just disappears teaches the next session nothing:

```bash
continuity resolve <id-or-text> --accept --reason "..."   # a parked conflict wins
continuity resolve <id-or-text> --reject --reason "..."   # it becomes a guardrail
continuity resolve <id-or-text> --close  --reason "..."   # a settled risk/question
```

Accepting a claim parked against a **frozen** one additionally requires `--unfreeze`. Freezing is the single human act in the model, so overriding it has to be a second deliberate one.

## Use it in Claude Desktop (MCP)

Any host that speaks MCP but has no project cwd can use the **MCP server** with **named projects**. (Note: the Claude *desktop app* runs Claude Code inside it, so the full plugin — hooks, commands, skill — works there; this path is for plain-MCP hosts.) Build (`npm run build`), then add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "continuity": {
      "command": "node",
      "args": ["/absolute/path/to/ai-continuity-plugin/dist/mcp.js"],
      "env": { "CONTINUITY_HOME": "/Users/you/.continuity/projects" }
    }
  }
}
```

Then in chat: *"create a continuity project called snip"* → `create_project`; *"resume snip"* → `resume_context`; the model records decisions/constraints/rejections as you go. A user-invokable **`resume` prompt** is the Desktop substitute for Claude Code's auto-resume hook. Tools: `list_projects`, `create_project`, `resume_context`, `search_claims`, `record_decision`, `record_constraint`, `record_rejection`, `record_open`, `record_mission`, `capture`, `resolve_claim`, `freeze_claim`, `why`.

## As a Claude Code plugin (bonus)

This repo **is** also a Claude Code plugin (manifest at `.claude-plugin/plugin.json`). There, on top of the MCP server, you get things Claude Desktop can't do:

- a **SessionStart hook** (`hooks/hooks.json`) that auto-injects `resume_context` on new / resumed / post-compact sessions — you never have to ask;
- a **Stop hook** that runs an end-of-turn capture check, so decisions get recorded without anyone remembering to ask. Two independent guards (`stop_hook_active` plus a time throttle) make a loop impossible;
- slash commands `/resume`, `/freeze`, `/why`.

The repo also ships `.claude/settings.json`, which registers the same hooks against its own committed `dist/`. A collaborator who just runs `git clone` therefore gets auto-resume and auto-capture without installing anything. Both hooks de-duplicate per session, so having the plugin installed *and* cloning the repo is harmless.

## Claim format

Each `.continuity/claims/<id>.md`:

```markdown
---
id: d4k7
type: decision            # decision | constraint | rejected_alternative | mission | milestone | question | next_action | ...
status: accepted          # accepted | frozen | superseded | rejected | open | needs_review | resolved | done
resolution:               # set by `resolve`: why this claim was closed
confidence: confirmed     # confirmed | tentative | unverified
provenance:
  origin: manual
  created: 2026-08-04T00:00:00.000Z
supersedes: []
superseded_by: null
depends_on: []
tags: []
---
Postgres is the primary datastore; a Redis read cache may come later.
```

## The claim format (a contract)

Once anyone else's repo holds claims, the file format is a contract — so it carries a version:

```yaml
---
schema: 1              # absent means 1
id: d16k3              # <type prefix><n><2-char suffix>; the suffix keeps concurrent clones from colliding
type: decision         # mission requirement decision constraint architecture milestone
                       # hypothesis experiment risk question next_action rejected_alternative
title: One crisp fact
status: accepted       # accepted active frozen open superseded invalidated rejected
                       # needs_review completed done resolved
confidence: confirmed  # unverified tentative confirmed
provenance: { origin: auto, created: ... }
supersedes: []
superseded_by: null
superseded_reason: ""  # why the replacement happened — travels with the claim
resolution: ""         # why it was closed, set by `continuity resolve`
---

Prose body. The reason, the context, whatever a future session needs.
```

**Stability promise.** A claim written by an older Continuity always reads: absent `schema` means 1, and older shapes migrate forward in memory without rewriting your files. A claim written by a *newer* Continuity is **refused by name**, loudly, rather than half-parsed — guessing at a shape we do not understand is how state degrades silently. `continuity migrate` rewrites files at the current schema when you want the version explicit on disk.

## Reviewing what was captured

Capture is autonomous, so the safeguard is that you can see what it wrote:

```bash
continuity review            # semantic diff: what appeared, changed status, or was edited — and why
continuity review --accept   # mark it reviewed
```

It catches hand edits as well as tool writes, and the resume context tells you when changes are waiting.

## Changelog

See [CHANGELOG.md](CHANGELOG.md). Claim-file schema has remained 1 across every release.

## Status

**v1.4 — deterministic core + CLI + MCP server + Claude Code plugin.** Versioned claim files, collision-safe ids, fuzzy lookup, a budgeted resume projection, git-backed event log, and 186 assertions across ten suites (`npm test`).

Working today:

- **Autonomous capture**, driven by a Stop hook at the end of each turn — not by the model remembering to.
- **A reconciler** behind every batch capture: dedupe, lineage-preserving supersession, and a frozen-guard that parks anything contradicting a frozen claim as `needs_review` instead of applying it.
- **A `resolve` verb** to close what the reconciler parks, and to close risks/questions once they are settled.

Known limits, tracked as claims in this repo's own `.continuity/`: the Stop-hook capture check is throttled to at most once per 10s, so a decision settled in a very fast exchange can still be missed (`q3`); and reliable status extraction from messy sessions remains the open technical risk (`q2`).

## Listed on

<a href="https://glama.ai/mcp/servers/vikcena01/ai-continuity-plugin">
  <img src="https://glama.ai/mcp/servers/vikcena01/ai-continuity-plugin/badges/card.svg" alt="Continuity on Glama" width="380">
</a>

## The mark

<img src="assets/mark.svg" alt="" width="26" align="left" hspace="12" vspace="2">

A **C** drawn as one unbroken arc — the thread that survives between sessions — terminating in a node, a single captured claim. `assets/icon.svg` is the same mark on a rounded tile for an avatar or favicon; `assets/logo-light.svg` and `assets/logo-dark.svg` are the wordmark lockups, picked by `prefers-color-scheme` so both GitHub themes work.

<br clear="left">

## License

MIT — see [`LICENSE`](LICENSE). Copyright (c) 2026 Vikash.
