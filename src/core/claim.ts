import matter from "gray-matter";

/** The vocabulary of project knowledge. Each type answers a different question. */
export type ClaimType =
  | "mission"
  | "requirement"
  | "decision"
  | "constraint"
  | "architecture"
  | "milestone"
  | "hypothesis"
  | "experiment"
  | "risk"
  | "question"
  | "next_action"
  | "rejected_alternative";

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

export type Confidence = "unverified" | "tentative" | "confirmed";

export interface Provenance {
  origin: "manual" | "auto" | "imported";
  session?: string;
  created: string;
  updated?: string;
}

/** One durable unit of project knowledge. Persisted as a single markdown file. */
export interface Claim {
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
  tags: string[];
}

export function parseClaim(raw: string): Claim {
  const { data, content } = matter(raw);
  return {
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
    tags: data.tags ?? [],
  };
}

export function serializeClaim(c: Claim): string {
  const fm: Record<string, unknown> = {
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
