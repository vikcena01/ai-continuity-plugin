import { Store } from "./store.js";
import { CLAIM_TYPES, Claim, ClaimType, normalizeType } from "./claim.js";

/**
 * The reconciler: the safety net that makes autonomous capture trustworthy.
 *
 * The (host) model proposes a batch of ops after seeing resume_context, so it
 * knows existing ids and which are frozen. The reconciler enforces the
 * deterministic invariants the model must not be trusted to enforce itself:
 *   - frozen guard: nothing auto-supersedes or silently contradicts a frozen
 *     claim — the newcomer is PARKED (needs_review), the frozen claim untouched;
 *   - lineage: supersede archives the old claim, never deletes it;
 *   - dedupe: a near-identical add is skipped rather than duplicated.
 * This is the piece that stops autonomous capture from degrading to flat memory.
 */
export interface CaptureOp {
  op: "add" | "reject" | "supersede";
  type?: string;
  title: string;
  body?: string;
  reason?: string;
  confidence?: "confirmed" | "tentative";
  /** supersede: the existing claim being replaced (id or title substring). */
  old?: string;
  /** add/reject: an existing claim this one conflicts with (id or title substring). */
  conflicts_with?: string;
}

export interface CaptureResult {
  applied: string[];
  /** next_action claims rewritten in place rather than superseded — see Store.amend. */
  amended: string[];
  superseded: string[];
  parked: string[];
  duplicates: string[];
  notes: string[];
}

const LIVE = new Set<string>(["active", "accepted", "frozen", "open"]);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Resolve a caller-supplied type string to a real ClaimType, or record a note and
 * return null. The reconciler's job is to keep autonomous capture from degrading
 * the state, and an unvalidated type does exactly that: it used to be cast
 * straight to ClaimType, so "open_question" slipped past the union and minted
 * ids like `ope1` instead of `q3`, quietly forking the vocabulary so those claims
 * never appeared in the right resume section.
 */
function resolveType(
  raw: string | undefined,
  fallback: ClaimType,
  title: string,
  res: CaptureResult,
): ClaimType | null {
  if (!raw) return fallback;
  const t = normalizeType(raw);
  if (!t) {
    res.notes.push(`skipped "${title}": unknown type "${raw}" — valid types: ${CLAIM_TYPES.join(", ")}`);
    return null;
  }
  return t;
}

function findOne(store: Store, q: string): Claim | undefined {
  const m = store.resolveClaims(q);
  return m.length === 1 ? m[0] : undefined;
}

export function reconcile(store: Store, ops: CaptureOp[]): CaptureResult {
  const res: CaptureResult = { applied: [], amended: [], superseded: [], parked: [], duplicates: [], notes: [] };

  for (const op of ops) {
    const live = store.list().filter((c) => LIVE.has(c.status));

    if (op.op === "add" || op.op === "reject") {
      // A rejection without a reason is inert: it lands under "Do NOT revisit" with
      // nothing after "because:", so a future session learns that something was
      // rejected but not why — which is exactly what lets it be re-proposed. The
      // reason IS the guardrail (d10), so refuse rather than record a hollow one.
      if (op.op === "reject" && !op.reason?.trim()) {
        res.notes.push(`skipped "${op.title}": a rejection needs a reason — without it the claim cannot stop a re-proposal`);
        continue;
      }
      const type =
        op.op === "reject"
          ? "rejected_alternative"
          : resolveType(op.type, "decision", op.title, res);
      if (!type) continue;

      const dup = live.find((c) => norm(c.title) === norm(op.title));
      if (dup) {
        res.duplicates.push(`${dup.id} ("${op.title}")`);
        continue;
      }

      // Frozen guard. This used to FAIL OPEN: it resolved the reference with
      // findOne, which returns undefined when a substring matches more than one
      // claim, and `if (target && ...)` then skipped the guard entirely — so a
      // claim contradicting a FROZEN one applied silently, with nothing parked and
      // no note. Reported externally 2026-09-18 and reproduced.
      //
      // Now it resolves ALL candidates and parks if ANY of them is frozen. An
      // ambiguous reference must fail closed: the whole point of the guard is that
      // freezing is the one human act (d4), so a guard that can be bypassed by an
      // imprecise reference is not a guard.
      if (op.conflicts_with) {
        const candidates = store.resolveClaims(op.conflicts_with);
        const frozen = candidates.filter((c) => c.status === "frozen");
        if (frozen.length) {
          const target = frozen[0];
          const c = store.record({
            type,
            title: op.title,
            body: op.body,
            reason: op.reason,
            status: "needs_review",
            confidence: "tentative",
            origin: "auto",
            conflicts_with: target.id,
          });
          res.parked.push(
            frozen.length === 1
              ? `${c.id} conflicts with FROZEN ${target.id} — parked for review`
              : `${c.id} declared a conflict matching ${frozen.length} FROZEN claims (${frozen
                  .map((f) => f.id)
                  .join(", ")}) — ambiguous, parked for review`,
          );
          continue;
        }
        // Not frozen, but say so rather than swallowing it: a declared conflict
        // that resolves to nothing, or to several claims, is worth surfacing.
        if (!candidates.length) {
          res.notes.push(
            `"${op.title}": conflicts_with "${op.conflicts_with}" matched no claim — applied without a guard`,
          );
        } else if (candidates.length > 1) {
          res.notes.push(
            `"${op.title}": conflicts_with "${op.conflicts_with}" is ambiguous (${candidates
              .map((c) => c.id)
              .join(", ")}), none frozen — applied`,
          );
        }
      }

      const c = store.record({
        type,
        title: op.title,
        body: op.body,
        reason: op.reason,
        confidence: op.confidence ?? "tentative",
        origin: "auto",
      });
      res.applied.push(c.id);
      continue;
    }

    if (op.op === "supersede") {
      const old = op.old ? findOne(store, op.old) : undefined;
      if (!old) {
        res.notes.push(`supersede skipped: could not uniquely resolve "${op.old}"`);
        continue;
      }
      if (!op.reason?.trim()) {
        res.notes.push(
          `skipped "${op.title}": superseding ${old.id} needs a reason — the reason a decision was replaced is what stops it being re-litigated (d10)`,
        );
        continue;
      }
      const type = resolveType(op.type, old.type, op.title, res);
      if (!type) continue;

      // frozen guard: never auto-supersede a frozen claim; park the proposal.
      if (old.status === "frozen") {
        const c = store.record({
          type,
          title: op.title,
          body: op.body,
          reason: op.reason,
          status: "needs_review",
          confidence: "tentative",
          origin: "auto",
          conflicts_with: old.id,
        });
        res.parked.push(`${c.id} would supersede FROZEN ${old.id} — parked for review`);
        continue;
      }
      // Direction is state, not a decision with lineage. Superseding it spawned a
      // fresh claim per revision and left 29 archived to-do lists behind, so an
      // amend keeps the id and lets git carry the history instead.
      if (old.type === "next_action" && type === "next_action") {
        const c = store.amend(old.id, {
          title: op.title,
          body: op.body,
          confidence: op.confidence ?? "confirmed",
        });
        res.amended.push(`${c.id} (direction updated in place)`);
        continue;
      }

      const fresh = store.record({
        type,
        title: op.title,
        body: op.body,
        confidence: op.confidence ?? "confirmed",
        origin: "auto",
      });
      store.supersede(old.id, fresh.id, op.reason ?? "");
      res.applied.push(fresh.id);
      res.superseded.push(`${old.id} → ${fresh.id}`);
      continue;
    }
  }
  return res;
}
