import { Store } from "./store.js";
import { Status, defaultStatusFor } from "./claim.js";

/**
 * The one verb that closes a claim.
 *
 * Everything else in the write path either creates claims or supersedes them, so
 * two different dead ends had formed: a claim parked as `needs_review` by the
 * reconciler's frozen-guard could never leave that state (q4), and a risk or
 * question that had actually been dealt with could only be closed by hand-editing
 * the markdown (q5). Both are the same missing operation — move a claim to a
 * terminal status, with the reason recorded — so they get one verb rather than two
 * flows.
 *
 * The reason is mandatory. A claim that simply vanishes from the resume context
 * teaches a future session nothing; the point of the layer is that the WHY travels
 * with the state (d10).
 */
export type ResolveAction = "accept" | "reject" | "close";

export interface ResolveInput {
  /** Claim id, or a title substring (same fuzzy handles as the rest of the CLI). */
  query: string;
  /** Omit to close a live claim; parked claims must say accept or reject explicitly. */
  action?: ResolveAction;
  reason: string;
  /**
   * Required to accept a claim parked against a FROZEN one. Freezing is the single
   * human act in the model (d4), so overriding it must be a second deliberate one —
   * never a side effect of resolving a queue.
   */
  unfreeze?: boolean;
}

export interface ResolveOutcome {
  id: string;
  title: string;
  from: Status;
  to: Status;
  action: ResolveAction;
  /** Set when accepting a parked claim superseded the claim it conflicted with. */
  superseded?: string;
}

/** Statuses a claim cannot be moved out of — the log is append-only (d1). */
const TERMINAL = new Set<Status>([
  "superseded",
  "invalidated",
  "rejected",
  "completed",
  "done",
  "resolved",
]);

export function resolveClaim(store: Store, input: ResolveInput): ResolveOutcome {
  if (!input.reason?.trim()) {
    throw new Error(
      "resolve needs a reason — the reason a claim was closed is exactly what a future session needs (d10).",
    );
  }

  const matches = store.resolveClaims(input.query);
  if (matches.length === 0) throw new Error(`No claim matches "${input.query}".`);
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous "${input.query}" — matches: ${matches.map((c) => `${c.id} (${c.title})`).join("; ")}`,
    );
  }

  const claim = matches[0];
  const from = claim.status;
  if (TERMINAL.has(from)) {
    throw new Error(`[${claim.id}] is already ${from} — nothing to resolve.`);
  }

  const parked = from === "needs_review";
  const action = input.action ?? (parked ? undefined : "close");
  if (!action) {
    throw new Error(
      `[${claim.id}] is parked against ${claim.conflicts_with ?? "another claim"} — say accept ` +
        "(the new claim wins) or reject (it becomes a guardrail so it is never re-proposed).",
    );
  }
  if (action === "accept" && !parked) {
    throw new Error(`[${claim.id}] is not parked (status: ${from}) — accept only applies to a parked claim.`);
  }
  if (action === "close" && parked) {
    throw new Error(`[${claim.id}] is parked — close is ambiguous here; say accept or reject.`);
  }

  let superseded: string | undefined;

  if (action === "accept") {
    const target = claim.conflicts_with ? store.get(claim.conflicts_with) : undefined;
    if (target) {
      if (target.status === "frozen" && !input.unfreeze) {
        throw new Error(
          `[${claim.id}] is parked against FROZEN [${target.id}] "${target.title}". Accepting it ` +
            "would break a frozen invariant, which is a deliberate human act — re-run with unfreeze " +
            "to replace it, or reject the newcomer instead.",
        );
      }
      // Archives the old claim and records the lineage both ways; never deletes (d1).
      store.supersede(target.id, claim.id, input.reason);
      superseded = target.id;
    }
  }

  // Re-read: supersede() above wrote this claim's `supersedes` array, so the
  // in-memory copy is stale and writing it back would drop the lineage.
  const fresh = store.get(claim.id)!;
  const to: Status =
    action === "accept"
      ? defaultStatusFor(fresh.type)
      : action === "reject"
        ? "rejected"
        : fresh.type === "next_action" || fresh.type === "milestone"
          ? "done"
          : "resolved";

  fresh.status = to;
  fresh.resolution = input.reason;
  if (action === "reject") {
    // Surfaces under "Do NOT revisit" as the reason it must not come back.
    fresh.reason = input.reason;
  }
  if (action === "accept") fresh.conflicts_with = undefined;
  fresh.provenance.updated = new Date().toISOString();
  store.write(fresh);

  return { id: fresh.id, title: fresh.title, from, to, action, superseded };
}
