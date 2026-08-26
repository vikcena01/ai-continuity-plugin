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
const additionalContext =
  "Continuity capture check. Default to capturing NOTHING; most turns warrant nothing. " +
  "Record only if this turn produced something a future session could not re-derive: a DECISION the user " +
  "settled, a CONSTRAINT they set, an approach they REJECTED, or a genuinely new finding. " +
  "Do NOT record: your own explanations, restatements of existing claims, progress narration, or a " +
  "next_action rewrite unless the next step actually changed. " +
  "Before adding, check whether an existing claim already covers it — prefer superseding one claim over " +
  "adding a near-duplicate. Keep each claim to one crisp fact with its reason, and keep bodies short: " +
  "they are re-read in every future session. If in doubt, stop without capturing.";

process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason: "continuity: end-of-turn capture check",
    hookSpecificOutput: { hookEventName: "Stop", additionalContext },
  }),
);
