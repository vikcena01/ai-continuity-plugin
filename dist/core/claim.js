import matter from "gray-matter";
export function parseClaim(raw) {
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
export function serializeClaim(c) {
    const fm = {
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
    if (c.superseded_reason)
        fm.superseded_reason = c.superseded_reason;
    if (c.reason)
        fm.reason = c.reason;
    // js-yaml (via gray-matter) throws on `undefined`; drop undefined keys.
    const clean = JSON.parse(JSON.stringify(fm));
    return matter.stringify(`\n${c.body}\n`, clean);
}
export function slugify(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}
