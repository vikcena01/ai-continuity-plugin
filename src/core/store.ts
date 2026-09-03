import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { Claim, ClaimType, Confidence, Provenance, SCHEMA_VERSION, Status, defaultStatusFor, parseClaim, serializeClaim } from "./claim.js";
import { isRepo } from "./git.js";

const STATE_DIR = ".continuity"; // repo-mode state dir
const CLAIMS = "claims";

/** Statuses at which a mission is the current one. */
const LIVE_FOR_MISSION = new Set<string>(["active", "accepted", "frozen"]);

/** Short, human-friendly id prefixes so `freeze d3` / `why c1` are typeable. */
const TYPE_PREFIX: Record<ClaimType, string> = {
  mission: "mission",
  decision: "d",
  architecture: "a",
  constraint: "c",
  requirement: "req",
  milestone: "m",
  hypothesis: "h",
  experiment: "e",
  risk: "rk",
  question: "q",
  next_action: "n",
  rejected_alternative: "x",
};

/** Where named (central) projects live — used by hosts with no project cwd (e.g. Claude Desktop). */
function projectsHome(): string {
  return process.env.CONTINUITY_HOME || join(homedir(), ".continuity", "projects");
}

/**
 * Two random chars, letter first. Letter-first matters: a digit would be absorbed
 * by the `^prefix(\d+)` sequence parse, so `d1` + "3k" would read back as d13.
 */
const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
function randomSuffix(): string {
  const b = randomBytes(2);
  return SUFFIX_ALPHABET[b[0] % 26] + SUFFIX_ALPHABET[b[1] % SUFFIX_ALPHABET.length];
}

/**
 * The store IS the filesystem. Two modes, one API:
 *  - repo mode:    <repo>/.continuity/   (found by walking up from cwd — Claude Code)
 *  - central mode: ~/.continuity/projects/<name>/   (named projects — Claude Desktop)
 * Git is the event log; nothing is ever deleted (supersession archives).
 */
export class Store {
  /** Directory that directly contains claims/. */
  readonly root: string;
  /** Directory to run git in. */
  readonly gitDir: string;
  /** Path (relative to gitDir) to stage on commit. */
  readonly gitPath: string;

  private constructor(root: string, gitDir: string, gitPath: string) {
    this.root = root;
    this.gitDir = gitDir;
    this.gitPath = gitPath;
  }

  /** repo mode keeps state inside the project; central mode keeps it in ~/.continuity. */
  get mode(): "repo" | "central" {
    return this.gitPath === "." ? "central" : "repo";
  }

  /** Human-readable location, for telling the user which store they are writing to. */
  get label(): string {
    return this.mode === "repo" ? this.gitDir : `central project "${basename(this.root)}"`;
  }

  /** Path to claims/ relative to gitDir — differs between repo and central mode. */
  get claimsGitPath(): string {
    return this.gitPath === "." ? CLAIMS : join(this.gitPath, CLAIMS);
  }

  private claimsDir(): string {
    return join(this.root, CLAIMS);
  }

  // ---- construction / resolution ----------------------------------

  /** Repo mode: walk up from `from` to a dir containing .continuity/. */
  static findRepo(from: string = process.cwd()): Store | null {
    let dir = from;
    while (true) {
      if (existsSync(join(dir, STATE_DIR))) {
        return new Store(join(dir, STATE_DIR), dir, STATE_DIR);
      }
      const parent = dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }

  static forRepoAt(dir: string): Store {
    return new Store(join(dir, STATE_DIR), dir, STATE_DIR);
  }

  /** Central mode: a named project under ~/.continuity/projects/<name>/. */
  static forProject(name: string): Store {
    const root = join(projectsHome(), name);
    return new Store(root, root, ".");
  }

  static listProjects(): string[] {
    const home = projectsHome();
    if (!existsSync(home)) return [];
    return readdirSync(home, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(home, d.name, CLAIMS)))
      .map((d) => d.name)
      .sort();
  }

  /**
   * Host-agnostic resolution:
   *  1. explicit project name        → central store
   *  2. a repo with .continuity/ above cwd → that repo
   *  3. exactly one central project exists → use it
   * Returns null when it genuinely can't decide.
   */
  static resolve(opts: { project?: string; cwd?: string } = {}): Store | null {
    if (opts.project) return Store.forProject(opts.project);
    const cwd = opts.cwd ?? process.cwd();
    const repo = Store.findRepo(cwd);
    if (repo) return repo;
    // Inside a git work tree with no .continuity/, refuse rather than silently
    // adopting an unrelated central project: that would write this repo's state
    // into ~/.continuity, where nobody cloning the repo can ever see it. Better
    // to make the user run `continuity init` and choose repo mode explicitly.
    if (isRepo(cwd)) return null;
    const projects = Store.listProjects();
    if (projects.length === 1) return Store.forProject(projects[0]);
    return null;
  }

  exists(): boolean {
    return existsSync(this.claimsDir());
  }

  // ---- reads -------------------------------------------------------

  list(): Claim[] {
    const dir = this.claimsDir();
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => parseClaim(readFileSync(join(dir, f), "utf8"), f));
  }

  get(id: string): Claim | undefined {
    const p = join(this.claimsDir(), `${id}.md`);
    return existsSync(p) ? parseClaim(readFileSync(p, "utf8"), `${id}.md`) : undefined;
  }

  /**
   * List or search claims. The MCP surface previously exposed only the budgeted
   * projection (rk19rn), so an agent could not reach a claim the projection had
   * trimmed — which is exactly when it needs to.
   *
   * Searches id, title AND body, because a claim is often remembered by a detail
   * in its reasoning rather than its title. Returns claims sorted by id so the
   * same query always yields the same order (d9).
   */
  search(q: { query?: string; type?: string; status?: string; limit?: number } = {}): Claim[] {
    const needle = q.query?.trim().toLowerCase();
    return this.list()
      .filter((c) => (!q.type || c.type === q.type) && (!q.status || c.status === q.status))
      .filter((c) =>
        !needle ||
        c.id.toLowerCase().includes(needle) ||
        c.title.toLowerCase().includes(needle) ||
        c.body.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, q.limit ?? 50);
  }

  /** Find claims by exact id, else case-insensitive id/title substring (fuzzy handles). */
  resolveClaims(query: string): Claim[] {
    const all = this.list();
    const exact = all.find((c) => c.id === query);
    if (exact) return [exact];
    const q = query.toLowerCase();
    return all.filter((c) => c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
  }

  // ---- writes ------------------------------------------------------

  /**
   * Create the claims directory and, on a genuinely new project, its mission.
   *
   * Idempotent by contract, which it previously was not: init recorded a mission
   * unconditionally, so calling create_project twice produced two mission claims.
   * The duplicate was invisible in the projection — renderResumeContext takes the
   * first live mission — so it accumulated silently while the tool advertised
   * idempotentHint: true. An annotation that lies is worse than none.
   *
   * An existing mission is left alone rather than replaced: changing a mission is
   * what record_mission is for, and it requires a reason.
   */
  init(mission?: string): void {
    mkdirSync(this.claimsDir(), { recursive: true });
    if (!mission) return;
    const existing = this.list().find((c) => c.type === "mission" && LIVE_FOR_MISSION.has(c.status));
    if (existing) return;
    this.record({ type: "mission", title: mission, status: "active", confidence: "confirmed" });
  }

  write(c: Claim): void {
    mkdirSync(this.claimsDir(), { recursive: true });
    writeFileSync(join(this.claimsDir(), `${c.id}.md`), serializeClaim(c));
  }

  record(input: {
    type: ClaimType;
    title: string;
    body?: string;
    status?: Status;
    confidence?: Confidence;
    reason?: string;
    depends_on?: string[];
    conflicts_with?: string;
    origin?: Provenance["origin"];
    session?: string;
    id?: string;
  }): Claim {
    const id = input.id ?? this.nextId(input.type);
    const claim: Claim = {
      schema: SCHEMA_VERSION,
      id,
      type: input.type,
      title: input.title,
      body: input.body ?? "",
      status: input.status ?? defaultStatusFor(input.type),
      confidence: input.confidence ?? "tentative",
      provenance: { origin: input.origin ?? "manual", session: input.session, created: new Date().toISOString() },
      supersedes: [],
      superseded_by: null,
      depends_on: input.depends_on ?? [],
      reason: input.reason,
      conflicts_with: input.conflicts_with,
      tags: [],
    };
    this.write(claim);
    return claim;
  }

  /**
   * Rewrite a claim in place, keeping its id.
   *
   * Used for `next_action`, where superseding produces pure churn: the audit
   * measured 30 next_action claims of which 29 were superseded — a quarter of
   * the whole corpus was stale to-do lists, each one a separate file re-read in
   * every projection until replaced.
   *
   * This does NOT violate d1. That decision says git commits are the log and
   * nothing is deleted from it; an in-place rewrite still appends a commit, and
   * the previous text stays recoverable by `git log -p`. What it drops is a
   * separate CLAIM per revision, which for direction is noise rather than
   * lineage — nobody needs to re-litigate a superseded to-do list the way they
   * might re-litigate a reversed decision.
   */
  amend(id: string, input: { title: string; body?: string; confidence?: Confidence }): Claim {
    const c = this.must(id);
    c.title = input.title;
    if (input.body !== undefined) c.body = input.body;
    if (input.confidence) c.confidence = input.confidence;
    c.provenance.updated = new Date().toISOString();
    this.write(c);
    return c;
  }

  /**
   * Set or replace the project's mission — the one line at the top of every
   * resume context.
   *
   * Replacing supersedes rather than amending in place, unlike next_action
   * (a3kw). A mission change is a strategic pivot, and "why did the mission
   * change?" is exactly the question someone asks later, so the predecessor and
   * the reason are kept as claims.
   */
  setMission(input: { title: string; body?: string; reason?: string }): { claim: Claim; replaced?: Claim } {
    const live = this.list().filter((c) => c.type === "mission" && LIVE_FOR_MISSION.has(c.status));
    const current = live[0];

    if (!current) {
      return { claim: this.record({ type: "mission", title: input.title, body: input.body, status: "active", confidence: "confirmed" }) };
    }
    if (current.title.trim() === input.title.trim() && (input.body ?? current.body) === current.body) {
      return { claim: current };
    }
    if (!input.reason?.trim()) {
      throw new Error(
        `A mission already exists: "${current.title}". Replacing it needs a reason — a pivot without a recorded why is exactly what this tool exists to prevent.`,
      );
    }
    const fresh = this.record({ type: "mission", title: input.title, body: input.body, status: "active", confidence: "confirmed" });
    this.supersede(current.id, fresh.id, input.reason);
    return { claim: fresh, replaced: current };
  }

  freeze(id: string): Claim {
    const c = this.must(id);
    c.status = "frozen";
    c.provenance.updated = new Date().toISOString();
    this.write(c);
    return c;
  }

  supersede(oldId: string, newId: string, reason: string): void {
    const old = this.must(oldId);
    old.status = "superseded";
    old.superseded_by = newId;
    old.superseded_reason = reason;
    this.write(old);
    const fresh = this.must(newId);
    if (!fresh.supersedes.includes(oldId)) {
      fresh.supersedes.push(oldId);
      this.write(fresh);
    }
  }

  private must(id: string): Claim {
    const c = this.get(id);
    if (!c) throw new Error(`no such claim: ${id}`);
    return c;
  }

  /**
   * Ids are `<prefix><n><suffix>` — e.g. `d16k3`. The sequence number keeps them
   * readable and roughly ordered; the two-char suffix (always letter-then-alnum,
   * so it can never be mistaken for part of the number) makes them safe for
   * concurrent writers.
   *
   * Without the suffix, two developers who each record the 16th decision on their
   * own clone BOTH write `.continuity/claims/d16.md` — the same path — and the
   * merge fails with an add/add conflict in a file neither of them consciously
   * wrote. The natural resolution is to keep one side, which silently discards
   * the other developer's claim and violates the append-only guarantee (d1).
   * With the suffix they get `d16k3` and `d16m9`: two files, no conflict, both
   * claims preserved.
   */
  private nextId(type: ClaimType): string {
    const prefix = TYPE_PREFIX[type];
    // No silent fallback: an unknown type used to mint a garbage prefix from the
    // string itself, forking the id space. Callers validate via normalizeType().
    if (!prefix) throw new Error(`unknown claim type: ${type}`);

    const ids = this.list().map((c) => c.id);
    if (type === "mission" && !ids.includes("mission")) return "mission";

    const seq = new RegExp(`^${prefix}(\\d+)`);
    let max = 0;
    for (const id of ids) {
      const m = seq.exec(id);
      if (m) max = Math.max(max, Number(m[1]));
    }
    const n = max + 1;

    const taken = new Set(ids);
    for (let i = 0; i < 100; i++) {
      const id = `${prefix}${n}${randomSuffix()}`;
      if (!taken.has(id)) return id;
    }
    throw new Error(`could not allocate an id for ${type}${n} after 100 attempts`);
  }
}
