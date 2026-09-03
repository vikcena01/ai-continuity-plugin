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
var additionalContext = "Continuity capture check. Default to capturing NOTHING; most turns warrant nothing. Record only what a future session could not re-derive, in one of these shapes: (1) a DECISION the user settled; (2) a CONSTRAINT future work must respect; (3) an approach the user REJECTED, with why; (4) FRAMING \u2014 a statement that sets strategy, priority or what matters, e.g. 'X is the moat', 'Y is the real bottleneck', 'we are optimising for Z'. These do not look like decisions and are the most commonly missed; record as a decision; (5) a STANDING INSTRUCTION about how to operate or who decides, e.g. 'never do X without asking', 'you have full ownership here'. Record as a CONSTRAINT, never as a question \u2014 a question reads as an open topic, not a rule to obey. Do NOT record: your own explanations, restatements of existing claims, progress narration, or a next_action rewrite unless the next step actually changed. Prefer superseding an existing claim over adding a near-duplicate, and keep bodies short: they are re-read every session. If in doubt, stop without capturing.";
process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason: "continuity: end-of-turn capture check",
    hookSpecificOutput: { hookEventName: "Stop", additionalContext }
  })
);
