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
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const THROTTLE_MS = 10_000;

let data = "";
process.stdin.on("data", (c) => (data += c));
process.stdin.on("end", () => {
  let input: { stop_hook_active?: boolean; session_id?: string } = {};
  try {
    input = JSON.parse(data || "{}");
  } catch {
    /* no/invalid stdin — treat as first fire */
  }

  const allowStop = () => process.exit(0);

  // Guard 1: already in a hook-induced continuation.
  if (input.stop_hook_active) allowStop();

  // Guard 2: time throttle (loop backstop, independent of guard 1).
  const marker = join(tmpdir(), `continuity-stop-${input.session_id ?? "default"}`);
  const now = Date.now();
  if (existsSync(marker)) {
    const last = Number(readFileSync(marker, "utf8")) || 0;
    if (now - last < THROTTLE_MS) allowStop();
  }
  try {
    writeFileSync(marker, String(now));
  } catch {
    /* if we can't write the marker, fall through — guard 1 still protects us */
  }

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
  process.exit(0);
});
