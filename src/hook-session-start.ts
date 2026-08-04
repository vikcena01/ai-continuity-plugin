// SessionStart hook: auto-inject the resume context into a new/resumed/compacted
// session. This is the "effortless resume" — the user never has to ask.
import { Store } from "./core/store.js";
import { renderResumeContext } from "./core/resume.js";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const store = Store.resolve({ cwd: root });
const claims = store?.list() ?? [];

if (claims.length) {
  const additionalContext =
    "Restored project state from the Continuity layer. Treat 🔒 FROZEN items and " +
    "🚫 rejected alternatives as authoritative — do not re-open or re-propose them.\n\n" +
    renderResumeContext(claims);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext,
      },
    }),
  );
}
// No state → print nothing, exit 0 (a hook that emits nothing is a no-op).
