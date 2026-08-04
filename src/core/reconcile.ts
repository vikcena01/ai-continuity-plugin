import { Store } from "./store.js";
import { Claim, ClaimType } from "./claim.js";

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
  superseded: string[];
  parked: string[];
  duplicates: string[];
  notes: string[];
}

const LIVE = new Set<string>(["active", "accepted", "frozen", "open"]);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function findOne(store: Store, q: string): Claim | undefined {
  const m = store.resolveClaims(q);
  return m.length === 1 ? m[0] : undefined;
}

export function reconcile(store: Store, ops: CaptureOp[]): CaptureResult {
  const res: CaptureResult = { applied: [], superseded: [], parked: [], duplicates: [], notes: [] };

  for (const op of ops) {
    const live = store.list().filter((c) => LIVE.has(c.status));

    if (op.op === "add" || op.op === "reject") {
      const dup = live.find((c) => norm(c.title) === norm(op.title));
      if (dup) {
        res.duplicates.push(`${dup.id} ("${op.title}")`);
        continue;
      }

      // frozen guard: an add flagged as conflicting with a frozen claim is parked.
      if (op.conflicts_with) {
        const target = findOne(store, op.conflicts_with);
        if (target && target.status === "frozen") {
          const c = store.record({
            type: op.op === "reject" ? "rejected_alternative" : ((op.type as ClaimType) ?? "decision"),
            title: op.title,
            body: op.body,
            reason: op.reason,
            status: "needs_review",
            confidence: "tentative",
            origin: "auto",
            conflicts_with: target.id,
          });
          res.parked.push(`${c.id} conflicts with FROZEN ${target.id} — parked for review`);
          continue;
        }
      }

      const c = store.record({
        type: op.op === "reject" ? "rejected_alternative" : ((op.type as ClaimType) ?? "decision"),
        title: op.title,
        body: op.body,
        reason: op.reason,
        status: op.op === "reject" ? "rejected" : "accepted",
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
      // frozen guard: never auto-supersede a frozen claim; park the proposal.
      if (old.status === "frozen") {
        const c = store.record({
          type: (op.type as ClaimType) ?? old.type,
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
      const fresh = store.record({
        type: (op.type as ClaimType) ?? old.type,
        title: op.title,
        body: op.body,
        status: "accepted",
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
