import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { Claim, ClaimType, Confidence, Provenance, Status, parseClaim, serializeClaim } from "./claim.js";
import { isRepo } from "./git.js";

const STATE_DIR = ".continuity"; // repo-mode state dir
const CLAIMS = "claims";

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
      .map((f) => parseClaim(readFileSync(join(dir, f), "utf8")));
  }

  get(id: string): Claim | undefined {
    const p = join(this.claimsDir(), `${id}.md`);
    return existsSync(p) ? parseClaim(readFileSync(p, "utf8")) : undefined;
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

  init(mission?: string): void {
    mkdirSync(this.claimsDir(), { recursive: true });
    if (mission) this.record({ type: "mission", title: mission, status: "active", confidence: "confirmed" });
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
      id,
      type: input.type,
      title: input.title,
      body: input.body ?? "",
      status: input.status ?? "accepted",
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
