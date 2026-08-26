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

const additionalContext =
  "Continuity auto-capture check. Review what happened in THIS turn. " +
  "If the user settled a DECISION, set a CONSTRAINT, or REJECTED an approach — or a milestone/next step changed — " +
  "record each now via the continuity MCP tools (record_decision / record_constraint / record_rejection / record_open), " +
  "including the reasoning; use the `capture` tool for several at once. Keep each claim to one crisp fact and capture " +
  "only what a future session would need — skip idle chatter. If there is nothing worth capturing, just stop.";

process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason: "continuity: end-of-turn capture check",
    hookSpecificOutput: { hookEventName: "Stop", additionalContext },
  }),
);
