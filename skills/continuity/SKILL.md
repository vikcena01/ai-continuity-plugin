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
As the conversation produces durable facts, record them right away:
- A decision the user settles on → `record_decision` (include the reasoning in the body).
- A constraint future work must respect → `record_constraint`.
- An alternative considered and rejected → `record_rejection` **with the reason**.
- An open question, risk, milestone, or next action → `record_open`.
Keep each claim to one crisp fact. Capture is non-destructive and reviewed later via git,
so err toward capturing rather than skipping. Do not capture idle chatter — only things a
future session would need to continue correctly.

## Deliberate acts — only on explicit user request
- "freeze X" / "lock X" → `freeze_claim`.
- "why did we change X?" → `why`.

## Principles
- **Record the REASON**, not just the decision — a future session must know *why* a path was
  chosen or rejected, or it will be argued back into a reversal.
- **Never silently contradict a frozen claim.** If the user's new direction conflicts with a
  frozen item, surface the conflict and confirm before proceeding.
