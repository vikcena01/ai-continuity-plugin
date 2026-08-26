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

/**
 * Budget for the projection. The resume context is injected into EVERY session
 * before the user types anything, so an unbounded projection turns the tool into
 * the cost it exists to remove (measured at 41KB / 49 claims before this existed).
 *
 * Degradation is tiered and always truthful: what got trimmed is stated, never
 * silently dropped. Four things are never touched at any level — the mission,
 * the milestone, frozen claims, and parked conflicts — because those are the
 * items whose absence would let a session do harm.
 */
export interface ResumeOptions {
  /** Target size for the whole projection, in bytes. */
  maxBytes?: number;
  /** Per-claim body cap. Reasons are never capped: they are the payload. */
  maxBodyChars?: number;
}

// 16KB chosen by measurement, not taste: on this project's own 49 claims the
// levels come out at 20.0KB / 12.2KB / 12.2KB / 11.3KB, so 16KB lands on level 1
// — every claim still listed, only verbose bodies dropped. 12KB would have
// tipped into level 3 and omitted the open risks entirely for 0.9KB of gain.
const DEFAULTS: Required<ResumeOptions> = { maxBytes: 16_000, maxBodyChars: 240 };

/** Env overrides, read OUTSIDE the pure renderer so the projection stays deterministic (d9). */
export function resumeOptionsFromEnv(): ResumeOptions {
  const n = (v: string | undefined) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? x : undefined;
  };
  return {
    maxBytes: n(process.env.CONTINUITY_RESUME_BYTES),
    maxBodyChars: n(process.env.CONTINUITY_RESUME_BODY),
  };
}

const LIVE = new Set<string>(["active", "accepted", "frozen", "open"]);

/** Truncate on a word boundary, marking that it happened. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).trimEnd()} …`;
}

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
/**
 * Degradation levels, applied in order until the projection fits:
 *   0  full, bodies clipped
 *   1  questions/risks lose their bodies
 *   2  decisions/constraints lose their bodies too (titles and lineage stay)
 *   3  questions/risks omitted entirely, with a count
 */
function project(claims: Claim[], meta: ResumeMeta, o: Required<ResumeOptions>, level: number): string {
  const clipBody = (c: Claim, max = o.maxBodyChars) => (c.body ? clip(c.body, max) : "");
  const trimmed: string[] = [];
  const L: string[] = [];
  const predecessors = (id: string) => claims.filter((c) => c.superseded_by === id);

  const mission = by(claims, ["mission"], LIVE)[0];
  const milestone = by(claims, ["milestone"], new Set(["open"]))[0];
  const next = by(claims, ["next_action"], new Set(["open"]))[0];

  L.push(`# RESUME CONTEXT${mission ? ` — ${mission.title}` : ""}`);
  if (mission?.body) L.push(`_${mission.body}_`);
  L.push("");
  if (milestone) L.push(`**Current milestone:** ${milestone.title}`);
  if (next) {
    // The most useful single line in the projection, so it gets a wider allowance
    // than other bodies — but still bounded; the full text is in the claim file.
    const nb = next.body ? clip(next.body, o.maxBodyChars * 3) : "";
    L.push(`**Resume at:** ${next.title}${nb ? ` — ${nb}` : ""}`);
  }
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
    L.push(
      "_Close each with the `resolve_claim` tool (or `continuity resolve <id> --accept|--reject --reason \"...\"`): " +
        'accept makes the new claim win, reject turns it into a guardrail. Accepting over a FROZEN claim needs an explicit unfreeze._',
    );
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
      const b = level >= 2 ? "" : clipBody(c);
      L.push(`- [${c.id}] ${c.title}${b ? ` — ${b}` : ""}  _(confidence: ${c.confidence})_`);
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
      const b = level >= 2 ? "" : clipBody(c);
      L.push(`- [${c.id}] ${c.title}${b ? ` — ${b}` : ""}  _(confidence: ${c.confidence})_`);
    }
    L.push("");
  }

  // Any claim rejected via the resolve verb becomes a guardrail, whatever its type —
  // a constraint rejected after being parked must not come back either. Map keyed by
  // id so a rejected_alternative is not listed twice.
  const rejected = [
    ...new Map(
      claims.filter((c) => c.type === "rejected_alternative" || c.status === "rejected").map((c) => [c.id, c]),
    ).values(),
  ];
  if (rejected.length) {
    L.push("## 🚫 Do NOT revisit (already rejected — do not re-propose)");
    for (const c of rejected) {
      L.push(`- [${c.id}] ${c.title} — REJECTED because: ${clip(c.reason ?? c.resolution ?? c.body, o.maxBodyChars * 2)}`);
    }
    L.push("");
  }

  const opens = by(claims, ["question", "risk"], new Set(["open"]));
  if (opens.length && level >= 3) {
    trimmed.push(`${opens.length} open question${opens.length === 1 ? "" : "s"}/risks omitted`);
  } else if (opens.length) {
    L.push("## Open questions / risks");
    for (const c of opens) {
      const b = level >= 1 ? "" : clipBody(c);
      L.push(`- [${c.id}] ${c.title}${b ? ` — ${b}` : ""}`);
    }
    L.push("");
  }
  if (level >= 1) trimmed.push("bodies shortened");
  if (trimmed.length) {
    L.push(`_Trimmed to fit: ${trimmed.join("; ")}. Full text in .continuity/claims/ — \`continuity list\` or \`continuity why <id>\`._`);
    L.push("");
  }

  const hasContent = L.some((l) => l.startsWith("- ") || l.startsWith("**"));
  if (!hasContent) L.push("_No project state captured yet. Record decisions as you make them._");

  return `${L.join("\n").trimEnd()}\n`;
}

/**
 * Deterministic projection of the claim set into the compact context a fresh
 * session needs. Pure function, NO LLM — this is the trustworthy core (d9).
 *
 * Surfaces only current state, but deliberately keeps two things a naive summary
 * drops: rejected alternatives (as guardrails) and, under each current decision,
 * the reason it replaced an earlier one (so the reversal can't be re-litigated).
 *
 * Renders at the least-degraded level that fits the byte budget, and says so
 * when it had to degrade.
 */
export function renderResumeContext(
  claims: Claim[],
  meta: ResumeMeta = {},
  opts: ResumeOptions = {},
): string {
  const o: Required<ResumeOptions> = {
    maxBytes: opts.maxBytes ?? DEFAULTS.maxBytes,
    maxBodyChars: opts.maxBodyChars ?? DEFAULTS.maxBodyChars,
  };
  let out = "";
  for (let level = 0; level <= 3; level++) {
    out = project(claims, meta, o, level);
    if (Buffer.byteLength(out, "utf8") <= o.maxBytes) return out;
  }
  return out; // level 3 is the floor: frozen, conflicts and direction are never dropped
}
