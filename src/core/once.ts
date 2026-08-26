import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Per-session, per-event throttle shared by the hooks: returns true at most once
 * per `windowMs` for a given (kind, session), false when it should be skipped.
 *
 * Two callers, same shape, different reasons:
 *  - Stop hook — a loop backstop. A runaway blocking Stop hook re-fires in
 *    milliseconds while real turns are seconds apart, so the window makes a loop
 *    physically impossible even if `stop_hook_active` were ever missing.
 *  - SessionStart hook — de-duplication. The plugin registers the hooks AND the
 *    repo's own .claude/settings.json registers them for people who only cloned,
 *    so a developer with both would otherwise get the resume context twice.
 *
 * Best-effort: if the marker can't be read or written we allow the run rather
 * than silently disabling a hook.
 */
export function throttle(kind: string, sessionId: string | undefined, windowMs: number): boolean {
  const marker = join(tmpdir(), `continuity-${kind}-${sessionId ?? "default"}`);
  const now = Date.now();
  try {
    if (existsSync(marker)) {
      const last = Number(readFileSync(marker, "utf8")) || 0;
      if (now - last < windowMs) return false;
    }
  } catch {
    /* unreadable marker — fall through and allow */
  }
  try {
    writeFileSync(marker, String(now));
  } catch {
    /* can't persist — allow; the caller's other guards still apply */
  }
  return true;
}

/** Read a hook's JSON payload from stdin. Never rejects — bad/absent input is `{}`. */
export function readHookInput<T = Record<string, unknown>>(): Promise<T> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({} as T);
      }
    });
    process.stdin.on("error", () => resolve({} as T));
  });
}
