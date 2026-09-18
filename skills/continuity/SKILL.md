---
name: continuity
description: Persist and resume long-running project state across AI sessions. Use at the start of work on an ongoing project to load prior decisions, constraints, and rejected approaches; and whenever the user makes a decision, sets a constraint, rejects an approach, freezes something, or reaches a milestone — to record it so future sessions don't lose it or contradict it.
---

# Continuity — keep long-running project state

A continuity MCP server stores durable project state (decisions, constraints, rejected
alternatives, open questions, next steps) as versioned claims. Your job is to keep it
current and to honor it — so a future session resumes correctly instead of re-litigating
settled decisions.

## At the start of a session on an ongoing project
Call `resume_context` (pass `project` if the user names one). Treat the result as authoritative:
- **🔒 FROZEN** items must not be changed or reopened.
- **🚫 Do NOT revisit** items are already rejected — do not re-propose them.
- Continue from the **Resume at** next step.
If nothing is returned and the work is clearly a new ongoing project, offer to `create_project`.

## While working — capture autonomously (do not ask permission)
**Default to capturing NOTHING. Most turns warrant nothing.** Record only what a future
session could not re-derive, in one of these shapes:
- A decision the user settles on → `record_decision` (include the reasoning in the body).
- A constraint future work must respect → `record_constraint`.
- An alternative considered and rejected → `record_rejection` **with the reason**. A rejection
  without a reason is refused: the reason is what stops it being re-proposed.
- An open question, risk, milestone, or next action → `record_open`.
- **FRAMING** — a statement setting strategy or what matters ("X is the moat", "Y is the real
  bottleneck"). These do not look like decisions and are the most commonly missed. Record as a
  decision.
- **A STANDING INSTRUCTION** about how to operate or who decides ("never do X without asking",
  "you have full ownership"). Record as a **constraint**, never as a question — a question reads
  as an open topic rather than a rule to obey.

Do NOT record: your own explanations, restatements of existing claims, progress narration, or a
rewrite of the next step unless the next step actually changed. Prefer superseding an existing
claim over adding a near-duplicate, and keep bodies short — they are re-read in every future
session. If in doubt, stop without capturing.

Discussion is not decision, and agreement between assistants is not approval. Only the user's
commitment makes something durable project state.

For several claims at once prefer `capture`, which de-duplicates and parks anything contradicting
a frozen claim. The individual `record_*` tools write straight through and do neither.

## Deliberate acts — only on explicit user request
- "freeze X" / "lock X" → `freeze_claim`.
- "why did we change X?" → `why`.
- Closing a claim → `resolve_claim`, always with a reason.
- Setting or changing the mission → `record_mission`; replacing one needs a reason.
- Finding a claim the resume context does not show → `search_claims`. The projection is budgeted
  and never lists superseded, rejected or resolved claims.

## Principles
- **Record the REASON**, not just the decision — a future session must know *why* a path was
  chosen or rejected, or it will be argued back into a reversal.
- **Never silently contradict a frozen claim.** If the user's new direction conflicts with a
  frozen item, surface the conflict and confirm before proceeding.
