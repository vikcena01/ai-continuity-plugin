#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { Store } from "./core/store.js";
import { renderResumeContext } from "./core/resume.js";
import { ClaimType, Claim, Confidence, SCHEMA_VERSION, SchemaTooNewError, Status } from "./core/claim.js";
import { commit, ensureRepo, log as gitLog, revert, unpushedCount } from "./core/git.js";
import { reconcile, CaptureOp } from "./core/reconcile.js";
import { resolveClaim, ResolveAction } from "./core/resolve.js";

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

process.on("uncaughtException", (e) => {
  if (e instanceof SchemaTooNewError) fail(`continuity: ${e.message}`);
  throw e;
});

const [cmd, ...rest] = process.argv.slice(2);

/** Flags that take no value — positionals() must not swallow the next argument. */
const BOOLEAN_FLAGS = new Set(["accept", "reject", "close", "unfreeze"]);

function bool(name: string): boolean {
  return rest.includes(`--${name}`);
}

function flag(name: string): string | undefined {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
}

function positionals(): string[] {
  const out: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith("--")) {
      if (!BOOLEAN_FLAGS.has(rest[i].slice(2))) i++; // skip flag value
      continue;
    }
    out.push(rest[i]);
  }
  return out;
}

function getStore(): Store {
  const s = Store.resolve({ project: flag("project") });
  if (!s) {
    const known = Store.listProjects().join(", ") || "none";
    fail(`No project selected. Use --project <name>, or run 'continuity init' in a repo. Known projects: ${known}`);
  }
  return s;
}

function saveMsg(s: Store, msg: string): void {
  commit(s.gitDir, s.gitPath, msg);
}

function resolveOne(s: Store, query: string): Claim {
  const matches = s.resolveClaims(query);
  if (matches.length === 0) fail(`No claim matches "${query}".`);
  if (matches.length > 1) {
    console.error(`Ambiguous "${query}" — matches:`);
    for (const c of matches) console.error(`  ${c.id}  ${c.title}`);
    process.exit(1);
  }
  return matches[0];
}

switch (cmd) {
  case "init": {
    const project = flag("project");
    const s = project ? Store.forProject(project) : Store.forRepoAt(process.cwd());
    ensureRepo(s.gitDir);
    s.init(positionals().join(" ") || undefined);
    saveMsg(s, `continuity: init${project ? ` project ${project}` : ""}`);
    console.log(project ? `Initialized project "${project}" at ${s.root}` : `Initialized .continuity/ (repo mode) at ${s.root}`);
    break;
  }

  case "resume": {
    {
      const s = getStore();
      process.stdout.write(renderResumeContext(s.list(), { mode: s.mode, unpushed: unpushedCount(s.gitDir, s.gitPath) }));
    }
    break;
  }

  case "projects": {
    const ps = Store.listProjects();
    console.log(ps.length ? ps.join("\n") : "(no named projects yet — `continuity init --project <name>`)");
    break;
  }

  case "record-decision":
  case "record-constraint": {
    const title = positionals().join(" ");
    if (!title) fail(`Usage: continuity ${cmd} "title" [--body "..."] [--confidence confirmed|tentative]`);
    const type: ClaimType = cmd === "record-constraint" ? "constraint" : "decision";
    const s = getStore();
    const c = s.record({ type, title, body: flag("body"), confidence: (flag("confidence") as Confidence) ?? "confirmed" });
    saveMsg(s, `continuity: record ${type} ${c.id}`);
    console.log(`Recorded ${type} [${c.id}]`);
    break;
  }

  case "record": {
    const title = positionals().join(" ");
    const type = flag("type") as ClaimType | undefined;
    if (!title || !type) fail('Usage: continuity record --type <type> "title" [--status open] [--body "..."] [--confidence ...] [--reason "..."]');
    const s = getStore();
    const c = s.record({
      type,
      title,
      body: flag("body"),
      status: flag("status") as Status | undefined,
      confidence: flag("confidence") as Confidence | undefined,
      reason: flag("reason"),
    });
    saveMsg(s, `continuity: record ${type} ${c.id}`);
    console.log(`Recorded ${type} [${c.id}] (${c.status})`);
    break;
  }

  case "reject": {
    const title = positionals().join(" ");
    if (!title) fail('Usage: continuity reject "alternative" --reason "why"');
    const s = getStore();
    const c = s.record({ type: "rejected_alternative", title, status: "rejected", reason: flag("reason"), confidence: "confirmed" });
    saveMsg(s, `continuity: reject ${c.id}`);
    console.log(`Recorded rejection [${c.id}]`);
    break;
  }

  case "freeze": {
    const q = positionals()[0];
    if (!q) fail("Usage: continuity freeze <id-or-text>");
    const s = getStore();
    const c = resolveOne(s, q);
    s.freeze(c.id);
    saveMsg(s, `continuity: freeze ${c.id}`);
    console.log(`Froze [${c.id}] ${c.title} — will not change without an explicit override.`);
    break;
  }

  case "supersede": {
    const [oldQ, newQ] = positionals();
    if (!oldQ || !newQ) fail('Usage: continuity supersede <old-id-or-text> <new-id-or-text> --reason "why"');
    const s = getStore();
    const oldC = resolveOne(s, oldQ);
    const newC = resolveOne(s, newQ);
    s.supersede(oldC.id, newC.id, flag("reason") ?? "");
    saveMsg(s, `continuity: supersede ${oldC.id} -> ${newC.id}`);
    console.log(`[${oldC.id}] superseded by [${newC.id}] (archived, not deleted)`);
    break;
  }

  case "why": {
    const q = positionals()[0];
    if (!q) fail("Usage: continuity why <id-or-text>");
    const s = getStore();
    const cur = resolveOne(s, q);
    console.log(`CURRENT: [${cur.id}] ${cur.title}  (status: ${cur.status})`);
    const replaced = s.list().filter((c) => c.superseded_by === cur.id);
    if (!replaced.length) console.log("  (supersedes nothing — original decision)");
    for (const r of replaced) {
      console.log(`  ↑ replaced [${r.id}] ${r.title}`);
      console.log(`      because: ${r.superseded_reason ?? ""}`);
    }
    if (cur.resolution) console.log(`  resolved: ${cur.resolution}`);
    break;
  }

  case "resolve": {
    const q = positionals()[0];
    const reason = flag("reason");
    if (!q || !reason) {
      fail('Usage: continuity resolve <id-or-text> [--accept|--reject|--close] --reason "why" [--unfreeze]');
    }
    const action: ResolveAction | undefined = bool("accept")
      ? "accept"
      : bool("reject")
        ? "reject"
        : bool("close")
          ? "close"
          : undefined;
    const s = getStore();
    let out;
    try {
      out = resolveClaim(s, { query: q, action, reason, unfreeze: bool("unfreeze") });
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
    saveMsg(s, `continuity: resolve ${out.id} ${out.from} -> ${out.to} (${out.action})`);
    console.log(`[${out.id}] ${out.from} -> ${out.to}`);
    if (out.superseded) console.log(`  superseded [${out.superseded}] — lineage kept, run 'continuity why ${out.id}'`);
    break;
  }

  case "migrate": {
    // Rewrites every claim at the current schema. Reading old state never
    // requires this - absent means 1 and migration happens in memory - but it
    // makes the version explicit on disk, and the diff shows exactly what moved.
    const s = getStore();
    const claims = s.list();
    for (const c of claims) s.write(c);
    saveMsg(s, `continuity: migrate ${claims.length} claims to schema ${SCHEMA_VERSION}`);
    console.log(`Rewrote ${claims.length} claims at schema ${SCHEMA_VERSION}.`);
    break;
  }

  case "list": {
    for (const c of getStore().list()) {
      console.log(`[${c.status.padStart(12)}] ${c.type.padStart(20)}  ${c.id.padEnd(8)}  ${c.title}`);
    }
    break;
  }

  case "capture": {
    const file = flag("file");
    if (!file) fail('Usage: continuity capture --file ops.json   (JSON: {"ops":[...]} — runs the reconciler)');
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const ops: CaptureOp[] = Array.isArray(parsed) ? parsed : parsed.ops;
    const s = getStore();
    const r = reconcile(s, ops);
    saveMsg(s, `continuity: capture (${r.applied.length} applied, ${r.superseded.length} superseded, ${r.parked.length} parked)`);
    console.log(JSON.stringify(r, null, 2));
    break;
  }

  case "log": {
    const s = getStore();
    const out = gitLog(s.gitDir, s.gitPath);
    console.log(out || "(no git history — is this a git repo?)");
    break;
  }

  case "rollback": {
    const ref = positionals()[0];
    if (!ref) fail("Usage: continuity rollback <commit-ref>   (creates a revert commit)");
    const s = getStore();
    revert(s.gitDir, ref);
    console.log(`Reverted ${ref} (a new commit undoing it was created).`);
    break;
  }

  default:
    console.log(`continuity — portable, git-backed project-state for AI sessions

  continuity init ["mission"] [--project <name>]
  continuity projects
  continuity resume [--project <name>]
  continuity record-decision "title" [--body "..."] [--confidence confirmed|tentative]
  continuity record-constraint "title" [--body "..."]
  continuity record --type <type> "title" [--status open] [--body "..."]
  continuity reject "alternative" --reason "why"
  continuity capture --file ops.json    (batch capture through the reconciler)
  continuity freeze <id-or-text>
  continuity supersede <old> <new> --reason "why"
  continuity resolve <id-or-text> [--accept|--reject|--close] --reason "why" [--unfreeze]
  continuity why <id-or-text>
  continuity migrate                    (rewrite all claims at the current schema)
  continuity list
  continuity log
  continuity rollback <commit-ref>

  --project <name> selects a named central project (~/.continuity/projects/<name>);
  omit it inside a repo that has .continuity/.`);
}
