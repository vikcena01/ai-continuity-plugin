import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Store } from "./core/store.js";
import { renderResumeContext } from "./core/resume.js";
import { commit, ensureRepo } from "./core/git.js";

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

/** Resolve the target store from an optional project name (Desktop) or cwd/repo (Claude Code). */
function resolveStore(project?: string): Store {
  const s = Store.resolve({ project });
  if (!s) {
    const known = Store.listProjects().join(", ") || "none";
    throw new Error(
      `No project selected. Call create_project, or pass project=<name>. Known projects: ${known}`,
    );
  }
  return s;
}

function save(s: Store, msg: string): void {
  commit(s.gitDir, s.gitPath, msg);
}

const server = new McpServer(
  { name: "continuity", version: "0.1.0" },
  {
    instructions:
      "Continuity maintains durable, versioned project state across sessions. " +
      "At the START of working on an ongoing project, call resume_context (pass `project` if the user names one) and honor it: " +
      "treat FROZEN items and rejected alternatives as authoritative — do not re-open or re-propose them. " +
      "As the user makes decisions, sets constraints, or rejects alternatives, capture them with record_decision / record_constraint / record_rejection " +
      "(capture is autonomous — no need to ask permission; the user reviews the git history later). " +
      "Only call freeze_claim when the user explicitly wants something locked as unchangeable.",
  },
);

const projectArg = { project: z.string().optional().describe("Named project (central store). Omit inside a Claude Code repo.") };

server.tool(
  "list_projects",
  "List the named continuity projects available in the central store.",
  {},
  async () => text(Store.listProjects().join("\n") || "(no projects yet — call create_project)"),
);

server.tool(
  "create_project",
  "Create a new named project (or initialize an existing name) with an optional mission statement.",
  { name: z.string(), mission: z.string().optional() },
  async ({ name, mission }) => {
    const s = Store.forProject(name);
    ensureRepo(s.gitDir);
    s.init(mission);
    save(s, `continuity: init project ${name}`);
    return text(`Created project "${name}" at ${s.root}`);
  },
);

server.tool(
  "resume_context",
  "Return the current project state to resume work: mission, frozen constraints, active decisions (with the reasons they superseded older ones), rejected paths not to re-propose, open questions, and the next step. Call at the start of a session.",
  { ...projectArg },
  async ({ project }) => text(renderResumeContext(resolveStore(project).list())),
);

server.tool(
  "record_decision",
  "Record a decision the project has settled on. Capture autonomously as you observe it.",
  { ...projectArg, title: z.string(), body: z.string().optional(), confidence: z.enum(["confirmed", "tentative"]).optional() },
  async ({ project, title, body, confidence }) => {
    const s = resolveStore(project);
    const c = s.record({ type: "decision", title, body, confidence: confidence ?? "tentative", origin: "auto" });
    save(s, `continuity: record decision ${c.id}`);
    return text(`Recorded decision [${c.id}] (${c.confidence})`);
  },
);

server.tool(
  "record_constraint",
  "Record a constraint future work must respect.",
  { ...projectArg, title: z.string(), body: z.string().optional() },
  async ({ project, title, body }) => {
    const s = resolveStore(project);
    const c = s.record({ type: "constraint", title, body, confidence: "confirmed", origin: "auto" });
    save(s, `continuity: record constraint ${c.id}`);
    return text(`Recorded constraint [${c.id}]`);
  },
);

server.tool(
  "record_rejection",
  "Record an alternative that was considered and rejected, and WHY — so no future session re-proposes it.",
  { ...projectArg, title: z.string(), reason: z.string() },
  async ({ project, title, reason }) => {
    const s = resolveStore(project);
    const c = s.record({ type: "rejected_alternative", title, status: "rejected", reason, confidence: "confirmed", origin: "auto" });
    save(s, `continuity: reject ${c.id}`);
    return text(`Recorded rejection [${c.id}]`);
  },
);

server.tool(
  "record_open",
  "Record an open question, risk, milestone, or next action. type is one of: question | risk | milestone | next_action.",
  { ...projectArg, type: z.enum(["question", "risk", "milestone", "next_action"]), title: z.string(), body: z.string().optional() },
  async ({ project, type, title, body }) => {
    const s = resolveStore(project);
    const c = s.record({ type, title, body, status: "open", confidence: "confirmed", origin: "auto" });
    save(s, `continuity: record ${type} ${c.id}`);
    return text(`Recorded ${type} [${c.id}]`);
  },
);

server.tool(
  "freeze_claim",
  "Freeze a claim so it must never change — the one deliberate lock. Use only on explicit user request. Accepts an id or a title substring.",
  { ...projectArg, id: z.string() },
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

server.tool(
  "why",
  "Explain what a claim replaced and why (supersession lineage). Accepts an id or a title substring.",
  { ...projectArg, id: z.string() },
  async ({ project, id }) => {
    const s = resolveStore(project);
    const matches = s.resolveClaims(id);
    if (matches.length !== 1) return text(matches.length === 0 ? `No claim matches "${id}".` : `Ambiguous: ${matches.map((c) => c.id).join(", ")}`);
    const cur = matches[0];
    const replaced = s.list().filter((c) => c.superseded_by === cur.id);
    const lines = [`CURRENT: [${cur.id}] ${cur.title} (status: ${cur.status})`];
    if (!replaced.length) lines.push("  (supersedes nothing — original decision)");
    for (const r of replaced) lines.push(`  ↑ replaced [${r.id}] ${r.title} — because: ${r.superseded_reason ?? ""}`);
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
            renderResumeContext(resolveStore(project).list()),
        },
      },
    ],
  }),
);

await server.connect(new StdioServerTransport());
