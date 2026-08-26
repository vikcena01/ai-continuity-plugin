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
var additionalContext = "Continuity capture check. Default to capturing NOTHING; most turns warrant nothing. Record only if this turn produced something a future session could not re-derive: a DECISION the user settled, a CONSTRAINT they set, an approach they REJECTED, or a genuinely new finding. Do NOT record: your own explanations, restatements of existing claims, progress narration, or a next_action rewrite unless the next step actually changed. Before adding, check whether an existing claim already covers it \u2014 prefer superseding one claim over adding a near-duplicate. Keep each claim to one crisp fact with its reason, and keep bodies short: they are re-read in every future session. If in doubt, stop without capturing.";
process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason: "continuity: end-of-turn capture check",
    hookSpecificOutput: { hookEventName: "Stop", additionalContext }
  })
);
