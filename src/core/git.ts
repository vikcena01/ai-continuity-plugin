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

/** Commit a path. Identity is forced inline so it works with no global git config. */
export function commit(dir: string, addPath: string, message: string): void {
  try {
    git(dir, ["add", "--", addPath]);
    git(dir, [
      "-c", "user.email=continuity@local",
      "-c", "user.name=continuity",
      "commit", "-q", "-m", message, "--", addPath,
    ]);
  } catch {
    /* nothing staged / no git — event log is best-effort */
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
  git(dir, ["-c", "user.email=continuity@local", "-c", "user.name=continuity", "revert", "--no-edit", ref]);
}
