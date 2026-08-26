import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Store } from "./store.js";
import { Claim } from "./claim.js";
import { lsFiles, revListSince, showBlob } from "./git.js";
import { parseClaim } from "./claim.js";

/**
 * The review ritual, made into one command.
 *
 * Capture is autonomous with no approval gate (d4), and the stated safeguard is
 * that the human reviews the git history afterwards. That safeguard was fiction:
 * three bad captures on 2026-08-26 (a wrong mechanism recorded, a body inverted
 * by a string rewrite, personal infrastructure published) were all caught by
 * accident, never by anyone reading a diff. Nobody reads `git log -p` over YAML
 * frontmatter for pleasure.
 *
 * So this shows a SEMANTIC diff instead: which claims appeared, changed status,
 * or were superseded since the last review, and the reason attached to each. It
 * is the difference between "you can audit this" and "auditing this is one
 * command and takes a minute".
 */
const MARKER = "REVIEWED";

export type ChangeKind = "added" | "status" | "superseded" | "edited";

export interface Change {
  kind: ChangeKind;
  claim: Claim;
  from?: string;
  detail?: string;
}

export interface ReviewReport {
  /** Commit the last review stopped at, if any. */
  since: string | null;
  /** Capture commits since then. */
  commits: number;
  changes: Change[];
}

/** The claim set as it stood at a commit. Unparseable files are skipped, not fatal. */
function claimsAt(s: Store, ref: string): Map<string, Claim> {
  const m = new Map<string, Claim>();
  for (const f of lsFiles(s.gitDir, ref, s.claimsGitPath)) {
    if (!f.endsWith(".md")) continue;
    const raw = showBlob(s.gitDir, ref, f);
    if (!raw) continue;
    try {
      const c = parseClaim(raw, f);
      m.set(c.id, c);
    } catch {
      /* a shape this build cannot read, or malformed at that commit — skip it */
    }
  }
  return m;
}

function markerPath(s: Store): string {
  return join(s.root, MARKER);
}

export function lastReviewed(s: Store): string | null {
  const p = markerPath(s);
  if (!existsSync(p)) return null;
  const v = readFileSync(p, "utf8").trim();
  return v || null;
}

export function markReviewed(s: Store, ref: string): void {
  writeFileSync(markerPath(s), `${ref}\n`);
}

/** Compare the claim set now against the claim set at the last reviewed commit. */
export function review(s: Store): ReviewReport {
  const since = lastReviewed(s);
  const now = s.list();
  const before = since ? claimsAt(s, since) : new Map<string, Claim>();
  const changes: Change[] = [];

  for (const c of now) {
    const old = before.get(c.id);
    if (!since) continue; // first run: nothing to compare against, see `commits`
    if (!old) {
      changes.push({ kind: "added", claim: c, detail: c.reason ?? c.body });
      continue;
    }
    if (old.status !== c.status) {
      changes.push({
        kind: c.status === "superseded" ? "superseded" : "status",
        claim: c,
        from: old.status,
        detail: c.superseded_reason ?? c.resolution ?? undefined,
      });
      continue;
    }
    if (old.title !== c.title || old.body !== c.body) {
      changes.push({ kind: "edited", claim: c, detail: old.title !== c.title ? `was: "${old.title}"` : undefined });
    }
  }

  return { since, commits: revListSince(s.gitDir, s.gitPath, since), changes };
}

const LABEL: Record<ChangeKind, string> = {
  added: "NEW",
  status: "STATUS",
  superseded: "REPLACED",
  edited: "EDITED",
};

export function renderReview(r: ReviewReport, total: number): string {
  const L: string[] = [];
  if (!r.since) {
    L.push(`No review marker yet — ${total} claims currently on record.`);
    L.push("Read them with `continuity list`, then `continuity review --accept` to start tracking");
    L.push("changes from here. After that this command shows only what moved since.");
    return `${L.join("\n")}\n`;
  }
  L.push(`Since ${r.since} — ${r.commits} commit${r.commits === 1 ? "" : "s"} touching state.`);
  L.push("");
  if (!r.changes.length) {
    L.push("Nothing changed. State is as you last reviewed it.");
    return `${L.join("\n")}\n`;
  }
  for (const c of r.changes) {
    const from = c.from ? ` (${c.from} -> ${c.claim.status})` : "";
    L.push(`${LABEL[c.kind].padStart(9)}  [${c.claim.id}] ${c.claim.title}${from}`);
    if (c.detail) L.push(`           why: ${c.detail.replace(/\s+/g, " ").slice(0, 300)}`);
  }
  L.push("");
  L.push(`${r.changes.length} change${r.changes.length === 1 ? "" : "s"}. Wrong? Fix the markdown in .continuity/claims/ or`);
  L.push("`continuity resolve <id> --reject --reason \"...\"`. Happy? `continuity review --accept`.");
  return `${L.join("\n")}\n`;
}
