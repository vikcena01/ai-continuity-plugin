import matter from "gray-matter";

/** The vocabulary of project knowledge. Each type answers a different question. */
export const CLAIM_TYPES = [
  "mission",
  "requirement",
  "decision",
  "constraint",
  "architecture",
  "milestone",
  "hypothesis",
  "experiment",
  "risk",
  "question",
  "next_action",
  "rejected_alternative",
] as const;

/** Derived from CLAIM_TYPES so the runtime list and the type can never drift. */
export type ClaimType = (typeof CLAIM_TYPES)[number];

/**
 * Near-misses an LLM plausibly emits, mapped to the real type. Everything else is
 * REJECTED rather than coerced: capture used to accept any string and mint a
 * fallback id prefix from it (type "open_question" produced ids like `ope1`
 * instead of `q3`), silently forking the type vocabulary so claims stopped
 * landing in the right resume sections. Guessing is what caused that; aliasing
 * only the unambiguous cases keeps the vocabulary closed.
 */
const TYPE_ALIASES: Record<string, ClaimType> = {
  open_question: "question",
  question_open: "question",
  open: "question",
  rejected: "rejected_alternative",
  rejection: "rejected_alternative",
  alternative: "rejected_alternative",
  next: "next_action",
  action: "next_action",
  todo: "next_action",
  arch: "architecture",
  req: "requirement",
  invariant: "constraint",
};

/** Canonical ClaimType for a free-form string, or null if it is not a known type. */
export function normalizeType(input: string): ClaimType | null {
  const k = input.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((CLAIM_TYPES as readonly string[]).includes(k)) return k as ClaimType;
  return TYPE_ALIASES[k] ?? null;
}

/** Where a claim is in its lifecycle. Live statuses surface in the resume context. */
export type Status =
  | "active"
  | "accepted"
  | "frozen"
  | "open"
  | "superseded"
  | "invalidated"
  | "rejected"
  | "needs_review"
  | "completed"
  | "done"
  | "resolved";

/**
 * The status a claim starts in, decided by its type.
 *
 * This lives here because two write paths disagreed: record_open hardcoded
 * "open" while capture hardcoded "accepted", so a risk or question recorded by
 * AUTONOMOUS capture came out "accepted" — and renderResumeContext only surfaces
 * question/risk when they are "open". Every autonomously captured risk was
 * therefore silently absent from the resume context, which is precisely the
 * state a future session most needs to see.
 */
export function defaultStatusFor(type: ClaimType): Status {
  switch (type) {
    case "question":
    case "risk":
    case "milestone":
    case "next_action":
      return "open";
    case "rejected_alternative":
      return "rejected";
    case "mission":
      return "active";
    default:
      return "accepted";
  }
}

export type Confidence = "unverified" | "tentative" | "confirmed";

export interface Provenance {
  origin: "manual" | "auto" | "imported";
  session?: string;
  created: string;
  updated?: string;
}

/** One durable unit of project knowledge. Persisted as a single markdown file. */
export interface Claim {
  /** Claim-file schema version. See SCHEMA_VERSION. */
  schema: number;
  id: string;
  type: ClaimType;
  title: string;
  body: string;
  status: Status;
  confidence: Confidence;
  provenance: Provenance;
  supersedes: string[];
  superseded_by: string | null;
  superseded_reason?: string;
  depends_on: string[];
  /** For rejected_alternative: why it was rejected (so it is never re-proposed). */
  reason?: string;
  /** Set when the reconciler parked this claim: the claim it clashes with (e.g. a frozen one). */
  conflicts_with?: string;
  /** Why this claim was closed (resolved/done/rejected via the resolve verb). */
  resolution?: string;
  tags: string[];
}

/**
 * Current claim-file schema version.
 *
 * The file format is a public contract the moment anyone else's repo holds
 * claims, and this one moved three times in a week (the collision-safe id
 * suffix, the `resolution` field, per-type status defaults). A version marker
 * lives on EACH claim rather than in one .continuity/VERSION file so that every
 * file self-describes: two clones on different versions then merge without a
 * conflict, the same reasoning that made per-file claims the right unit.
 *
 * Absent means 1 — every claim written before versioning existed is, by
 * definition, shape 1.
 */
export const SCHEMA_VERSION = 1;

/**
 * A claim written by a NEWER build than this one. Thrown rather than tolerated:
 * quietly parsing a shape you do not understand is how state degrades without
 * anyone noticing, which is the exact failure the version marker exists to
 * prevent. Callers should surface this and tell the user to upgrade.
 */
export class SchemaTooNewError extends Error {
  constructor(
    readonly found: number,
    readonly supported: number,
    readonly source?: string,
  ) {
    super(
      `${source ?? "claim"} declares schema ${found}, but this build of continuity supports ${supported}. ` +
        "Upgrade continuity (or the plugin) to read it — refusing to guess at a newer format.",
    );
    this.name = "SchemaTooNewError";
  }
}

/**
 * Bring an older claim shape forward, in memory. Nothing to do at version 1;
 * the hook exists so a future bump has one obvious place to add a step, and so
 * reading old state never requires rewriting files on disk.
 */
function migrate(data: Record<string, unknown>, from: number): Record<string, unknown> {
  let d = data;
  let v = from;
  // while (v < SCHEMA_VERSION) { ... d = stepN(d); v++; }
  void v;
  return d;
}

export function parseClaim(raw: string, source?: string): Claim {
  const { data: raw_data, content } = matter(raw);
  const declared = Number(raw_data.schema ?? SCHEMA_VERSION);
  const found = Number.isFinite(declared) && declared >= 1 ? declared : SCHEMA_VERSION;
  if (found > SCHEMA_VERSION) throw new SchemaTooNewError(found, SCHEMA_VERSION, source);
  const data = migrate(raw_data as Record<string, unknown>, found) as typeof raw_data;
  return {
    schema: SCHEMA_VERSION,
    id: data.id,
    type: data.type,
    title: data.title,
    body: content.trim(),
    status: data.status ?? "accepted",
    confidence: data.confidence ?? "tentative",
    provenance: data.provenance ?? { origin: "manual", created: new Date().toISOString() },
    supersedes: data.supersedes ?? [],
    superseded_by: data.superseded_by ?? null,
    superseded_reason: data.superseded_reason,
    depends_on: data.depends_on ?? [],
    reason: data.reason,
    conflicts_with: data.conflicts_with,
    resolution: data.resolution,
    tags: data.tags ?? [],
  };
}

export function serializeClaim(c: Claim): string {
  const fm: Record<string, unknown> = {
    schema: SCHEMA_VERSION,
    id: c.id,
    type: c.type,
    title: c.title,
    status: c.status,
    confidence: c.confidence,
    provenance: c.provenance,
    supersedes: c.supersedes,
    superseded_by: c.superseded_by,
    depends_on: c.depends_on,
    tags: c.tags,
  };
  if (c.superseded_reason) fm.superseded_reason = c.superseded_reason;
  if (c.reason) fm.reason = c.reason;
  if (c.conflicts_with) fm.conflicts_with = c.conflicts_with;
  if (c.resolution) fm.resolution = c.resolution;
  // js-yaml (via gray-matter) throws on `undefined`; drop undefined keys.
  const clean = JSON.parse(JSON.stringify(fm));
  return matter.stringify(`\n${c.body}\n`, clean);
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
