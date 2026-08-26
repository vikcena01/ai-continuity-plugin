import { Claim } from "./claim.js";

/**
 * Facts about WHERE the state lives. Kept separate from the claims so
 * renderResumeContext stays a pure function of its inputs (d9).
 */
export interface ResumeMeta {
  /** repo mode ships state with the project; central mode keeps it on one machine. */
  mode?: "repo" | "central";
  /** Captured commits not yet on the upstream, or null if there is no upstream. */
  unpushed?: number | null;
}

const LIVE = new Set<string>(["active", "accepted", "frozen", "open"]);

function by(claims: Claim[], types: string[], statuses?: Set<string>): Claim[] {
  return claims.filter((c) => types.includes(c.type) && (!statuses || statuses.has(c.status)));
}

/**
 * Deterministic projection of the claim set into the compact context a fresh
 * session needs. Pure function, NO LLM — this is the trustworthy core.
 *
 * Surfaces only current state, but deliberately keeps two things a naive
 * summary drops: rejected alternatives (as guardrails) and, under each current
 * decision, the reason it replaced an earlier one (so the reversal can't be
 * re-litigated).
 */
export function renderResumeContext(claims: Claim[], meta: ResumeMeta = {}): string {
  const L: string[] = [];
  const predecessors = (id: string) => claims.filter((c) => c.superseded_by === id);

  const mission = by(claims, ["mission"], LIVE)[0];
  const milestone = by(claims, ["milestone"], new Set(["open"]))[0];
  const next = by(claims, ["next_action"], new Set(["open"]))[0];

  L.push(`# RESUME CONTEXT${mission ? ` — ${mission.title}` : ""}`);
  if (mission?.body) L.push(`_${mission.body}_`);
  L.push("");
  if (milestone) L.push(`**Current milestone:** ${milestone.title}`);
  if (next) L.push(`**Resume at:** ${next.title}${next.body ? ` — ${next.body}` : ""}`);
  L.push("");

  // Only rendered when something is actually wrong — a clean solo repo sees nothing.
  const sync: string[] = [];
  if (meta.mode === "central") {
    sync.push(
      "State is in a CENTRAL project (~/.continuity), not in the repo — it will NOT " +
        "reach anyone who clones this project. Use repo mode for shared work.",
    );
  }
  if (meta.unpushed && meta.unpushed > 0) {
    sync.push(
      `${meta.unpushed} captured commit${meta.unpushed === 1 ? "" : "s"} not pushed — ` +
        "teammates pulling now will see stale state. Push when convenient.",
    );
  }
  if (sync.length) {
    L.push("## ⚠️ STATE SYNC");
    for (const w of sync) L.push(`- ${w}`);
    L.push("");
  }

  const parked = claims.filter((c) => c.status === "needs_review");
  if (parked.length) {
    L.push("## ⚠️ CONFLICTS NEEDING ATTENTION (parked by the reconciler — resolve, don't act blindly)");
    for (const c of parked) {
      const against = c.conflicts_with ? claims.find((x) => x.id === c.conflicts_with) : undefined;
      const vs = against ? `[${against.id}] "${against.title}" (${against.status})` : "an existing claim";
      L.push(`- [${c.id}] "${c.title}" conflicts with ${vs}`);
      if (c.body) L.push(`    → ${c.body}`);
    }
    L.push("");
  }

  const frozen = by(claims, ["decision", "constraint", "architecture"], new Set(["frozen"]));
  if (frozen.length) {
    L.push("## 🔒 FROZEN — MUST NOT change");
    for (const c of frozen) {
      L.push(`- [${c.id}] ${c.title}${c.body ? ` — ${c.body}` : ""}  _(confidence: ${c.confidence})_`);
    }
    L.push("");
  }

  const decisions = by(claims, ["decision", "architecture"], new Set(["accepted", "active"]));
  if (decisions.length) {
    L.push("## Active decisions & architecture");
    for (const c of decisions) {
      L.push(`- [${c.id}] ${c.title}${c.body ? ` — ${c.body}` : ""}  _(confidence: ${c.confidence})_`);
      for (const p of predecessors(c.id)) {
        L.push(`    ↳ replaced [${p.id}] "${p.title}" — because: ${p.superseded_reason ?? ""}`);
      }
    }
    L.push("");
  }

  const cons = by(claims, ["constraint"], new Set(["accepted", "active"]));
  if (cons.length) {
    L.push("## Active constraints");
    for (const c of cons) {
      L.push(`- [${c.id}] ${c.title}${c.body ? ` — ${c.body}` : ""}  _(confidence: ${c.confidence})_`);
    }
    L.push("");
  }

  const rejected = [
    ...by(claims, ["rejected_alternative"]),
    ...by(claims, ["hypothesis"], new Set(["rejected"])),
  ];
  if (rejected.length) {
    L.push("## 🚫 Do NOT revisit (already rejected — do not re-propose)");
    for (const c of rejected) {
      L.push(`- [${c.id}] ${c.title} — REJECTED because: ${c.reason ?? c.body}`);
    }
    L.push("");
  }

  const opens = by(claims, ["question", "risk"], new Set(["open"]));
  if (opens.length) {
    L.push("## Open questions / risks");
    for (const c of opens) {
      L.push(`- [${c.id}] ${c.title}${c.body ? ` — ${c.body}` : ""}`);
    }
    L.push("");
  }

  const hasContent = L.some((l) => l.startsWith("- ") || l.startsWith("**"));
  if (!hasContent) L.push("_No project state captured yet. Record decisions as you make them._");

  return `${L.join("\n").trimEnd()}\n`;
}
