// SessionStart hook: auto-inject the resume context into a new/resumed/compacted
// session. This is the "effortless resume" — the user never has to ask.
import { Store } from "./core/store.js";
import { renderResumeContext } from "./core/resume.js";
import { unpushedCount } from "./core/git.js";
import { readHookInput, throttle } from "./core/once.js";

const input = await readHookInput<{ session_id?: string }>();

// The plugin and the repo's own .claude/settings.json may both register this
// hook (the latter exists so a plain `git clone` still self-activates). Both
// fire back-to-back for the same session, so drop the duplicate. Only throttle
// when we actually know the session — otherwise two genuinely different sessions
// starting at once would share the "default" key and one would lose its resume.
if (input.session_id && !throttle("start", input.session_id, 5_000)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const store = Store.resolve({ cwd: root });
const claims = store?.list() ?? [];

if (claims.length) {
  const additionalContext =
    "Restored project state from the Continuity layer. Treat 🔒 FROZEN items and " +
    "🚫 rejected alternatives as authoritative — do not re-open or re-propose them.\n\n" +
    renderResumeContext(
      claims,
      store ? { mode: store.mode, unpushed: unpushedCount(store.gitDir, store.gitPath) } : {},
    );

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
