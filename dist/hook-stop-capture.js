import{createRequire}from'module';const require=createRequire(import.meta.url);

// src/core/once.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
function throttle(kind, sessionId, windowMs) {
  const marker = join(tmpdir(), `continuity-${kind}-${sessionId ?? "default"}`);
  const now = Date.now();
  try {
    if (existsSync(marker)) {
      const last = Number(readFileSync(marker, "utf8")) || 0;
      if (now - last < windowMs) return false;
    }
  } catch {
  }
  try {
    writeFileSync(marker, String(now));
  } catch {
  }
  return true;
}
function readHookInput() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (c) => data += c);
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
    process.stdin.on("error", () => resolve({}));
  });
}

// src/hook-stop-capture.ts
var THROTTLE_MS = 1e4;
var input = await readHookInput();
if (input.stop_hook_active || !throttle("stop", input.session_id, THROTTLE_MS)) process.exit(0);
var additionalContext = "Continuity auto-capture check. Review what happened in THIS turn. If the user settled a DECISION, set a CONSTRAINT, or REJECTED an approach \u2014 or a milestone/next step changed \u2014 record each now via the continuity MCP tools (record_decision / record_constraint / record_rejection / record_open), including the reasoning; use the `capture` tool for several at once. Keep each claim to one crisp fact and capture only what a future session would need \u2014 skip idle chatter. If there is nothing worth capturing, just stop.";
process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason: "continuity: end-of-turn capture check",
    hookSpecificOutput: { hookEventName: "Stop", additionalContext }
  })
);
