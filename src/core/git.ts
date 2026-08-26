import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

// Git is the event log. All calls are best-effort: if git is missing or there's
// nothing to commit, the store still works — it just loses history/rollback.

function git(dir: string, args: string[]): string {
  return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

export function isRepo(dir: string): boolean {
  try {
    git(dir, ["rev-parse", "--is-inside-work-tree"]);
    return true;
  } catch {
    return false;
  }
}

export function ensureRepo(dir: string): void {
  try {
    mkdirSync(dir, { recursive: true }); // `git -C` needs the dir to exist first
  } catch {
    /* ignore */
  }
  if (!isRepo(dir)) {
    try {
      git(dir, ["init", "-q"]);
    } catch {
      /* no git binary — carry on without history */
    }
  }
}

/**
 * The identity to commit under: git's own, when the user has configured one.
 *
 * The fallback exists so capture still works in a repo with no git identity at
 * all. It used to be applied UNCONDITIONALLY, which meant every autonomously
 * written commit was authored `continuity <continuity@local>` — an address tied
 * to no account, so on a public repo none of those commits attribute to their
 * author and the contributor graph reads as empty. Overriding a configured
 * identity was never the intent; falling back was.
 */
function identity(dir: string): string[] {
  try {
    const email = git(dir, ["config", "user.email"]).trim();
    const name = git(dir, ["config", "user.name"]).trim();
    if (email && name) return []; // configured — let git use it
  } catch {
    /* nothing configured — fall through to the placeholder */
  }
  return ["-c", "user.email=continuity@local", "-c", "user.name=continuity"];
}

/** Commit a path, under the repo's own identity where one is configured. */
export function commit(dir: string, addPath: string, message: string): void {
  try {
    git(dir, ["add", "--", addPath]);
    git(dir, [
      ...identity(dir),
      "commit", "-q", "-m", message, "--", addPath,
    ]);
  } catch {
    /* nothing staged / no git — event log is best-effort */
  }
}

/**
 * Commits touching `addPath` that exist locally but not on the tracked upstream.
 * Returns null when there is no upstream at all — nothing to warn about, and a
 * solo repo should never be nagged. Best-effort like everything else here.
 *
 * This exists because capture COMMITS but deliberately never pushes: pushing is
 * an outbound action nobody asked for. The cost is that autonomously-written
 * commits can sit unpushed while a teammate pulls stale state, so resume shows
 * the count instead.
 */
export function unpushedCount(dir: string, addPath: string): number | null {
  try {
    git(dir, ["rev-parse", "--abbrev-ref", "@{u}"]);
  } catch {
    return null; // no upstream configured
  }
  try {
    const n = Number(git(dir, ["rev-list", "--count", "@{u}..HEAD", "--", addPath]).trim());
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function log(dir: string, addPath: string, n = 20): string {
  try {
    return git(dir, ["log", `-n${n}`, "--oneline", "--", addPath]).trimEnd();
  } catch {
    return "";
  }
}

export function revert(dir: string, ref: string): void {
  git(dir, [...identity(dir), "revert", "--no-edit", ref]);
}
