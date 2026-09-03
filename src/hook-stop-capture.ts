// Stop hook: the auto-capture trigger. Fires when the assistant finishes a turn.
// Once per turn it blocks and injects an instruction to capture any new project
// state, so capture is driven automatically instead of relying on the model to
// remember.
//
// TWO independent loop guards (belt and suspenders), because a runaway blocking
// Stop hook would degrade every session:
//   1. `stop_hook_active` — set by Claude Code when the stop was itself caused by
//      a Stop-hook continuation.
//   2. a per-session time throttle on disk — blocks at most once per window, so
//      even if (1) is ever missing, it physically cannot loop (a loop re-fires in
//      milliseconds; real turns are seconds apart).
import { readHookInput, throttle } from "./core/once.js";

const THROTTLE_MS = 10_000;

const input = await readHookInput<{ stop_hook_active?: boolean; session_id?: string }>();

// Guard 1: already in a hook-induced continuation.
// Guard 2: time throttle (loop backstop, independent of guard 1).
if (input.stop_hook_active || !throttle("stop", input.session_id, THROTTLE_MS)) process.exit(0);

// Deliberately biased AGAINST capturing. Measured on 2026-08-26: this hook fired
// on every turn, including pure Q&A turns with no project state in them, and
// produced ~20 next_action supersessions in a single day, each rewriting a long
// body. Volume is not evidence of value — a claim set that restates itself is
// harder to read than a small one, and every claim is paid for again in every
// future session's resume context.
// The category list matters more than the exhortation. The previous version named
// only DECISION / CONSTRAINT / REJECTED / milestone-or-next-step, and the audit
// (rk16it) found the predictable consequence: statements that set strategy or
// authority were dropped entirely, because they do not match any of those shapes.
// "The state engine is the moat" and "your call, I gave you full ownership" were
// both said plainly by the owner and captured nowhere.
const additionalContext =
  "Continuity capture check. Default to capturing NOTHING; most turns warrant nothing. " +
  "Record only what a future session could not re-derive, in one of these shapes: " +
  "(1) a DECISION the user settled; " +
  "(2) a CONSTRAINT future work must respect; " +
  "(3) an approach the user REJECTED, with why; " +
  "(4) FRAMING — a statement that sets strategy, priority or what matters, e.g. 'X is the moat', " +
  "'Y is the real bottleneck', 'we are optimising for Z'. These do not look like decisions and are " +
  "the most commonly missed; record as a decision; " +
  "(5) a STANDING INSTRUCTION about how to operate or who decides, e.g. 'never do X without asking', " +
  "'you have full ownership here'. Record as a CONSTRAINT, never as a question — a question reads as " +
  "an open topic, not a rule to obey. " +
  "Do NOT record: your own explanations, restatements of existing claims, progress narration, or a " +
  "next_action rewrite unless the next step actually changed. Prefer superseding an existing claim " +
  "over adding a near-duplicate, and keep bodies short: they are re-read every session. " +
  "If in doubt, stop without capturing.";

process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason: "continuity: end-of-turn capture check",
    hookSpecificOutput: { hookEventName: "Stop", additionalContext },
  }),
);
