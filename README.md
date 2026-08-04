# Continuity

Portable, git-backed **project-state** for long-running AI work. Resume any AI session — in Claude Code, Cursor, or anything that speaks MCP — without re-explaining your decisions, constraints, and direction.

It is **not a memory tool.** A memory tool answers *"what did we talk about?"* Continuity answers a different question: *"what is true about this project **now**, and what must not be touched?"*

## Why it's built this way

- **State lives as plain markdown files, tracked by git.** Git *is* the event log: history = `git log`, rollback = `git revert`, audit = `git blame`. Every claim is human-readable, diffable, and hand-editable. You review what the AI captured the same way you review generated code — as a diff, whenever you want. There is **no approval gate** at capture time.
- **Two storage modes, one API.** *Repo mode* (`<repo>/.continuity/`, found by walking up from the working dir) suits editor/agent tools with a project cwd like Claude Code. *Central mode* (`~/.continuity/projects/<name>/`, named projects) suits tools with no project cwd like **Claude Desktop** — you just refer to a project by name.
- **The resume context is a deterministic projection** of those files (no LLM in the read path) — frozen constraints, active decisions *with the reasons they superseded older ones*, rejected paths you shouldn't re-propose, open questions, and the next step.
- **Trust comes from honesty, not blind faith.** Every claim carries `confidence` + `provenance`, so a fresh session knows what's confirmed vs. AI-inferred and calibrates instead of trusting everything.

See [`DESIGN.md`](DESIGN.md) for the full architecture and [`poc/`](poc/) for the validation that motivated it.

## Install (dev)

```bash
npm install
npm run build
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
continuity list                       # ids are short: d1, c1, x1, q1, ...
continuity log                        # the git-backed event log
```

Claims get short, typeable ids (`d1`, `c2`, `x1` …); `freeze`/`why`/`supersede` accept an id **or** a title substring. State is written under `claims/` and auto-committed to git on every change.

## Use it in Claude Desktop (MCP)

Claude Desktop has no hooks and no project cwd, so it uses the **MCP server** with **named projects**. Build (`npm run build`), then add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "continuity": {
      "command": "node",
      "args": ["/absolute/path/to/ai-continuity-layer/dist/mcp.js"],
      "env": { "CONTINUITY_HOME": "/Users/you/.continuity/projects" }
    }
  }
}
```

Then in chat: *"create a continuity project called snip"* → `create_project`; *"resume snip"* → `resume_context`; the model records decisions/constraints/rejections as you go. A user-invokable **`resume` prompt** is the Desktop substitute for Claude Code's auto-resume hook. Tools: `list_projects`, `create_project`, `resume_context`, `record_decision`, `record_constraint`, `record_rejection`, `record_open`, `freeze_claim`, `why`.

## As a Claude Code plugin (bonus)

This repo **is** also a Claude Code plugin (manifest at `.claude-plugin/plugin.json`). There, on top of the MCP server, you get things Claude Desktop can't do:

- a **SessionStart hook** (`hooks/hooks.json`) that auto-injects `resume_context` on new / resumed / post-compact sessions — you never have to ask;
- slash commands `/resume`, `/freeze`, `/why`.

Build first (`npm run build`) so `dist/` exists, then load it as a plugin. (Hooks and slash commands are Claude-Code-only; in Claude Desktop use the MCP tools + `resume` prompt above.)

## Claim format

Each `.continuity/claims/<id>.md`:

```markdown
---
id: postgres-primary-store
type: decision            # decision | constraint | rejected_alternative | mission | milestone | question | next_action | ...
status: accepted          # accepted | frozen | superseded | rejected | open | needs_review | ...
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

## Status

**v0.1 — deterministic core + CLI + MCP server (named projects) + Claude Code plugin.** Short ids, fuzzy lookup, git-backed event log, and an asserted smoke test (`npm test`). No automatic extraction or contradiction-reconciler yet; capture is explicit (CLI, or the AI calling the record tools). Auto-capture and the reconciler are the next milestones.
