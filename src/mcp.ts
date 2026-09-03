#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Store } from "./core/store.js";
import { renderResumeContext, resumeOptionsFromEnv } from "./core/resume.js";
import { commit, ensureRepo, unpushedCount } from "./core/git.js";
import { reconcile, CaptureOp } from "./core/reconcile.js";
import { resolveClaim } from "./core/resolve.js";
import { review } from "./core/review.js";

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

/** Resolve the target store from an optional project name (Desktop) or cwd/repo (Claude Code). */
function resolveStore(project?: string): Store {
  const s = Store.resolve({ project });
  if (!s) {
    const known = Store.listProjects().join(", ") || "none";
    throw new Error(
      "No continuity state here. Inside a project repo, run `continuity init \"<mission>\"` " +
        "(or ask the user to) so state lives in .continuity/ and ships with the repo. " +
        `Otherwise call create_project or pass project=<name>. Known central projects: ${known}`,
    );
  }
  return s;
}

/** Resume context plus the where-does-this-live facts (central-mode + unpushed warnings). */
function renderFor(s: Store): string {
  return renderResumeContext(s.list(), { mode: s.mode, unpushed: unpushedCount(s.gitDir, s.gitPath), unreviewed: review(s).changes.length }, resumeOptionsFromEnv());
}

function save(s: Store, msg: string): void {
  commit(s.gitDir, s.gitPath, msg);
}

const server = new McpServer(
  { name: "continuity", version: "1.3.0" },
  {
    instructions:
      "Continuity maintains durable, versioned project state across sessions. " +
      "At the START of working on an ongoing project, call resume_context (pass `project` if the user names one) and honor it: " +
      "treat FROZEN items and rejected alternatives as authoritative — do not re-open or re-propose them. " +
      "As the user makes decisions, sets constraints, or rejects alternatives, capture them with record_decision / record_constraint / record_rejection. " +
      "Two shapes are missed most often and are worth watching for: FRAMING statements that set strategy or what matters ('X is the moat', "
      + "'Y is the real bottleneck') belong as a decision; and STANDING INSTRUCTIONS about how to operate or who decides "
      + "('never do X without asking', 'you have full ownership') belong as a CONSTRAINT, not a question, because a question reads as an open topic rather than a rule. " +
      "(capture is autonomous — no need to ask permission). Capture SPARINGLY: only what a future session could not re-derive, never " +
      "restatements of existing claims or progress narration, and keep bodies short because they are re-read every session. " +
      "Prefer superseding an existing claim over adding a near-duplicate. " +
      "Only call freeze_claim when the user explicitly wants something locked as unchangeable. " +
      "If resume_context shows CONFLICTS NEEDING ATTENTION, or a risk/question there has actually been settled, close it with resolve_claim and a reason.",
  },
);

const projectArg = { project: z.string().optional().describe("Named project (central store). Omit inside a Claude Code repo.") };

server.registerTool(
  "list_projects",
  {
    title: "List projects",
    description:
      "List the named projects in the central store (~/.continuity/projects). Read-only; writes nothing. Use it " +
      "when the user names a project you have not seen, or to check whether central mode holds any state at " +
      "all. Inside a repo that has .continuity/ this is usually irrelevant — that state is found from the " +
      "working directory.",
    inputSchema: {},
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  async () => text(Store.listProjects().join("\n") || "(no projects yet — call create_project)"),
);

server.registerTool(
  "create_project",
  {
    title: "Create project",
    description:
      "Create or initialize a named project in the central store. Creates a directory and an initial git " +
      "commit. Safe to call on a name that already exists: existing claims are left untouched, so it is " +
      "effectively idempotent. For central mode only — hosts with no project directory. Inside a git repo, " +
      "state belongs in the repo instead, which the `continuity init` CLI sets up.",
    inputSchema: {
      name: z.string().describe("Short kebab-case project name. Becomes the directory under ~/.continuity/projects and the handle passed as `project` to every other tool."),
      mission: z.string().optional().describe("One sentence on what the project is for. Rendered as the resume context's title, so a future session sees it first."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ name, mission }) => {
    const s = Store.forProject(name);
    ensureRepo(s.gitDir);
    s.init(mission);
    save(s, `continuity: init project ${name}`);
    return text(`Created project "${name}" at ${s.root}`);
  },
);

server.registerTool(
  "resume_context",
  {
    title: "Resume context",
    description:
      "Return the current project state as a deterministic projection: mission, milestone, next step, frozen " +
      "constraints, active decisions each annotated with the reason it replaced its predecessor, rejected " +
      "alternatives, parked conflicts, and open questions. Read-only; writes nothing. Call this FIRST when " +
      "starting work on an ongoing project and honour it — frozen items and rejected alternatives are " +
      "authoritative, not suggestions. No model runs in this path, so the same state always yields the same " +
      "text. Output is budgeted to roughly 16KB and states explicitly when it had to trim.",
    inputSchema: { project: z
      .string()
      .optional()
      .describe("Named project in the central store. Omit inside a repo that has .continuity/, where state is found by walking up from the working directory.") },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  async ({ project }) => text(renderFor(resolveStore(project))),
);

server.registerTool(
  "record_decision",
  {
    title: "Record decision",
    description:
      "Append a decision the user has settled. Writes one markdown file plus a git commit; nothing is " +
      "overwritten or removed, so a mistaken entry is corrected by superseding it rather than by editing. The " +
      "decision then appears in every future resume context. Capture autonomously as you observe it — no " +
      "permission needed — but only for things a future session could not re-derive; skip restatements and " +
      "progress narration.",
    inputSchema: {
      project: z
      .string()
      .optional()
      .describe("Named project in the central store. Omit inside a repo that has .continuity/, where state is found by walking up from the working directory."),
      title: z.string().describe("One crisp fact, phrased as a statement. This exact text appears in every future resume context, so make it self-contained."),
      body: z.string().optional().describe("The reasoning behind it. Keep it short: bodies are re-read in every future session and count against the resume budget."),
      confidence: z
        .enum(["confirmed", "tentative"])
        .optional()
        .describe("'confirmed' when the user stated it plainly; 'tentative' when you inferred it. Defaults to tentative, which is the honest default for an inference."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ project, title, body, confidence }) => {
    const s = resolveStore(project);
    const c = s.record({ type: "decision", title, body, confidence: confidence ?? "tentative", origin: "auto" });
    save(s, `continuity: record decision ${c.id}`);
    return text(`Recorded decision [${c.id}] (${c.confidence})`);
  },
);

server.registerTool(
  "record_mission",
  {
    title: "Record mission",
    description:
      "Set or replace the project's mission \u2014 the single line rendered at the top of every resume " +
      "context, which is what a fresh session reads first. Creates it if none exists. Replacing an existing " +
      "mission REQUIRES a reason, and supersedes rather than overwrites: the previous mission is archived as " +
      "a claim with the reason, because a strategic pivot is exactly what someone asks 'why did this change?' " +
      "about later. Setting the identical text is a no-op. Use this rather than capture with type mission; " +
      "use create_project instead only when the project does not exist yet.",
    inputSchema: {
      project: z
        .string()
        .optional()
        .describe("Named project in the central store. Omit inside a repo that has .continuity/, where state is found by walking up from the working directory."),
      title: z
        .string()
        .describe("The mission in one line, phrased as what the project is for. Appears as the resume context's heading, so make it self-contained."),
      body: z.string().optional().describe("Optional elaboration. Rendered under the heading, so keep it to a sentence."),
      reason: z
        .string()
        .optional()
        .describe("Why the mission is changing. Required only when replacing an existing mission; omitted on first set. Travels with the superseded claim."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ project, title, body, reason }) => {
    const s = resolveStore(project);
    try {
      const { claim, replaced } = s.setMission({ title, body, reason });
      save(s, replaced ? `continuity: mission ${claim.id} replaces ${replaced.id}` : `continuity: set mission ${claim.id}`);
      return text(
        replaced
          ? `Mission set [${claim.id}], replacing [${replaced.id}] "${replaced.title}" \u2014 lineage kept, run why ${claim.id}`
          : `Mission set [${claim.id}]`,
      );
    } catch (e) {
      return text(e instanceof Error ? e.message : String(e));
    }
  },
);

server.registerTool(
  "record_constraint",
  {
    title: "Record constraint",
    description:
      "Append a constraint that future work must respect. Same persistence as record_decision: one file, one " +
      "commit, append-only. A constraint is a boundary rather than a choice — 'ids stay short and typeable' " +
      "rather than 'we chose X'. Use freeze_claim only if the user wants it to become unchangeable.",
    inputSchema: {
      project: z
      .string()
      .optional()
      .describe("Named project in the central store. Omit inside a repo that has .continuity/, where state is found by walking up from the working directory."),
      title: z.string().describe("The boundary, phrased as a rule future work must satisfy. Appears verbatim in every future resume context."),
      body: z.string().optional().describe("Why the constraint exists. Kept short — it is re-read every session."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ project, title, body }) => {
    const s = resolveStore(project);
    const c = s.record({ type: "constraint", title, body, confidence: "confirmed", origin: "auto" });
    save(s, `continuity: record constraint ${c.id}`);
    return text(`Recorded constraint [${c.id}]`);
  },
);

server.registerTool(
  "record_rejection",
  {
    title: "Record rejection",
    description:
      "Append an alternative that was considered and rejected, together with the reason. It is then listed " +
      "under 'Do NOT revisit' in every future resume context, which is the point: it stops the same idea being " +
      "re-proposed months later. Append-only, like the other record_* tools.",
    inputSchema: {
      project: z
      .string()
      .optional()
      .describe("Named project in the central store. Omit inside a repo that has .continuity/, where state is found by walking up from the working directory."),
      title: z.string().describe("The rejected approach, stated as the thing someone might otherwise propose."),
      reason: z.string().describe("Why it was rejected. Required, because the reason is what prevents it being re-proposed — a bare rejection teaches a future session nothing."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ project, title, reason }) => {
    const s = resolveStore(project);
    const c = s.record({ type: "rejected_alternative", title, status: "rejected", reason, confidence: "confirmed", origin: "auto" });
    save(s, `continuity: reject ${c.id}`);
    return text(`Recorded rejection [${c.id}]`);
  },
);

server.registerTool(
  "record_open",
  {
    title: "Record open item",
    description:
      "Append an open question, risk, milestone or next action. These are recorded with status 'open', so they " +
      "keep surfacing in the resume context until closed with resolve_claim. Only one milestone and one " +
      "next_action show at a time — recording a new next_action does not retire the old one, so supersede it " +
      "via capture when direction changes.",
    inputSchema: {
      project: z
      .string()
      .optional()
      .describe("Named project in the central store. Omit inside a repo that has .continuity/, where state is found by walking up from the working directory."),
      type: z
        .enum(["question", "risk", "milestone", "next_action"])
        .describe("question: something undecided. risk: something that could go wrong. milestone: the current goal. next_action: where to resume."),
      title: z.string().describe("The question, risk, goal or next step in one line."),
      body: z.string().optional().describe("Detail a future session needs. Keep it short — the next_action body is rendered in the resume header."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ project, type, title, body }) => {
    const s = resolveStore(project);
    const c = s.record({ type, title, body, status: "open", confidence: "confirmed", origin: "auto" });
    save(s, `continuity: record ${type} ${c.id}`);
    return text(`Recorded ${type} [${c.id}]`);
  },
);

server.registerTool(
  "capture",
  {
    title: "Capture batch",
    description:
      "Apply a BATCH of claim operations in one call, through the reconciler. Prefer this over several record_* " +
      "calls when a turn produced more than one thing. The reconciler enforces what you should not be trusted " +
      "to enforce yourself: a near-identical claim is skipped rather than duplicated, superseding archives the " +
      "old claim with the reason instead of deleting it, and anything that would contradict a FROZEN claim is " +
      "parked as needs_review for a human rather than applied. Append-only: nothing is removed, so the worst " +
      "case is a claim you later supersede. Call resume_context first so you know existing ids and which claims " +
      "are frozen.",
    inputSchema: {
      project: z
      .string()
      .optional()
      .describe("Named project in the central store. Omit inside a repo that has .continuity/, where state is found by walking up from the working directory."),
      ops: z
        .array(
          z.object({
            op: z.enum(["add", "reject", "supersede"]).describe("add: a new claim. reject: a rejected alternative, which becomes a guardrail. supersede: replace an existing claim, keeping its lineage."),
            type: z.string().optional().describe("Claim type: decision, constraint, architecture, question, risk, milestone, next_action, requirement, hypothesis, experiment, mission, rejected_alternative. Unknown types are REJECTED with a note rather than coerced. Defaults to decision for add."),
            title: z.string().describe("One crisp fact. Also the dedupe key: a live claim with the same normalised title is skipped."),
            body: z.string().optional().describe("Detail a future session needs. Keep short — re-read every session."),
            reason: z.string().optional().describe("For reject: why it must never be re-proposed. For supersede: why the old claim was replaced. This reason travels into future resume contexts."),
            confidence: z.enum(["confirmed", "tentative"]).optional().describe("'confirmed' only when the user stated it plainly."),
            old: z.string().optional().describe("supersede only: the claim being replaced, by id or unique title substring. If it cannot be resolved uniquely the op is skipped with a note."),
            conflicts_with: z.string().optional().describe("Flag that this claim contradicts an existing one, by id or title. If that claim is frozen, this one is PARKED for review instead of applied."),
          }),
        )
        .describe("The batch. Ops are applied in order against state that is re-read between each, so a supersede can target something added earlier in the same batch."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ project, ops }) => {
    const s = resolveStore(project);
    const r = reconcile(s, ops as CaptureOp[]);
    save(s, `continuity: capture (${r.applied.length} applied, ${r.amended.length} amended, ${r.superseded.length} superseded, ${r.parked.length} parked)`);
    const lines = [
      `applied: ${r.applied.join(", ") || "none"}`,
      `superseded: ${r.superseded.join("; ") || "none"}`,
      `parked (need review): ${r.parked.join("; ") || "none"}`,
      `duplicates skipped: ${r.duplicates.join("; ") || "none"}`,
    ];
    if (r.notes.length) lines.push(`notes: ${r.notes.join("; ")}`);
    return text(lines.join("\n"));
  },
);

server.registerTool(
  "freeze_claim",
  {
    title: "Freeze claim",
    description:
      "Mark a claim frozen: an invariant that must never change. This is the one deliberate lock in the model, " +
      "so call it ONLY when the user explicitly asks for something to be locked — never on your own initiative. " +
      "Once frozen, autonomous capture can no longer supersede it: a contradicting claim is parked for human " +
      "review instead. Overriding it later requires resolve_claim with unfreeze, which is also an explicit " +
      "human decision. Idempotent: freezing an already-frozen claim changes nothing.",
    inputSchema: {
      project: z
      .string()
      .optional()
      .describe("Named project in the central store. Omit inside a repo that has .continuity/, where state is found by walking up from the working directory."),
      id: z.string().describe("Claim id (for example c1) or a unique substring of its title — 'why' and 'freeze' both accept either."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ project, id }) => {
    const s = resolveStore(project);
    const matches = s.resolveClaims(id);
    if (matches.length === 0) return text(`No claim matches "${id}".`);
    if (matches.length > 1) return text(`Ambiguous "${id}": ${matches.map((c) => c.id).join(", ")}`);
    s.freeze(matches[0].id);
    save(s, `continuity: freeze ${matches[0].id}`);
    return text(`Froze [${matches[0].id}] ${matches[0].title}.`);
  },
);

server.registerTool(
  "resolve_claim",
  {
    title: "Resolve claim",
    description:
      "Close a claim, recording WHY. Two uses. (1) A claim parked as needs_review by the reconciler: action " +
      "'accept' makes it win, superseding whatever it conflicted with, or 'reject' turns it into a guardrail so " +
      "it is never re-proposed. (2) An open risk, question or next_action that has been dealt with: action " +
      "'close' moves it to resolved, or done for a next_action or milestone. The reason is mandatory — a claim " +
      "that simply vanishes from the resume context teaches a future session nothing. Nothing is deleted; " +
      "closing archives. Accepting a claim parked against a FROZEN one additionally requires unfreeze, because " +
      "breaking a frozen invariant is the user's decision: ask them first.",
    inputSchema: {
      project: z
      .string()
      .optional()
      .describe("Named project in the central store. Omit inside a repo that has .continuity/, where state is found by walking up from the working directory."),
      claim: z.string().describe("Claim id, or a unique substring of its title."),
      action: z
        .enum(["accept", "reject", "close"])
        .optional()
        .describe("Parked claims must say accept or reject; anything else defaults to close. accept applies only to a parked claim."),
      reason: z.string().describe("Why it is being closed. Required — this is the part a future session reads, and it is surfaced by the 'why' tool."),
      unfreeze: z
        .boolean()
        .optional()
        .describe("Only to accept a claim parked against a FROZEN one. Requires the user's explicit go-ahead; without it the call is refused rather than silently overriding the invariant."),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  },
  async ({ project, claim, action, reason, unfreeze }) => {
    const s = resolveStore(project);
    try {
      const r = resolveClaim(s, { query: claim, action, reason, unfreeze });
      save(s, `continuity: resolve ${r.id} ${r.from} -> ${r.to} (${r.action})`);
      const extra = r.superseded ? ` — superseded [${r.superseded}], lineage kept` : "";
      return text(`[${r.id}] ${r.from} -> ${r.to}${extra}`);
    } catch (e) {
      return text(e instanceof Error ? e.message : String(e));
    }
  },
);

server.registerTool(
  "why",
  {
    title: "Why",
    description:
      "Explain a claim's history. Read-only; writes nothing. Returns the claim's current title and status, " +
      "then one line per predecessor it replaced with the reason recorded at the time, then its closing reason " +
      "if it has been resolved. A claim that replaced nothing says so explicitly ('supersedes nothing \u2014 " +
      "original decision') rather than returning an empty result, so a blank answer always means the lookup " +
      "failed, never that the history is empty. Accepts a claim id or a unique substring of its title; an " +
      "ambiguous substring returns the candidate ids instead of guessing, and no match says so. " +
      "Call it before re-opening anything that looks settled \u2014 the answer is often that it was already " +
      "decided, reversed once, and why, which is the difference between a considered change and re-litigating " +
      "a closed question.",
    inputSchema: {
      project: z
      .string()
      .optional()
      .describe("Named project in the central store. Omit inside a repo that has .continuity/, where state is found by walking up from the working directory."),
      id: z
        .string()
        .describe("Claim id (for example d4) or a unique substring of its title. Substrings are matched case-insensitively against both id and title, so a distinctive few words are usually enough."),
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  async ({ project, id }) => {
    const s = resolveStore(project);
    const matches = s.resolveClaims(id);
    if (matches.length !== 1) return text(matches.length === 0 ? `No claim matches "${id}".` : `Ambiguous: ${matches.map((c) => c.id).join(", ")}`);
    const cur = matches[0];
    const replaced = s.list().filter((c) => c.superseded_by === cur.id);
    const lines = [`CURRENT: [${cur.id}] ${cur.title} (status: ${cur.status})`];
    if (!replaced.length) lines.push("  (supersedes nothing — original decision)");
    for (const r of replaced) lines.push(`  ↑ replaced [${r.id}] ${r.title} — because: ${r.superseded_reason ?? ""}`);
    if (cur.resolution) lines.push(`  resolved: ${cur.resolution}`);
    return text(lines.join("\n"));
  },
);

// A user-invokable prompt — the Claude Desktop substitute for the SessionStart hook.
server.prompt(
  "resume",
  "Load this project's continuity state into the conversation.",
  { ...projectArg },
  ({ project }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            "Here is the restored project state. Treat FROZEN items and rejected alternatives as authoritative — do not re-open them. Continue from the next step.\n\n" +
            renderFor(resolveStore(project)),
        },
      },
    ],
  }),
);

await server.connect(new StdioServerTransport());
