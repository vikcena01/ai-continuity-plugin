import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parseClaim, serializeClaim } from "./claim.js";
const STATE_DIR = ".continuity"; // repo-mode state dir
const CLAIMS = "claims";
/** Short, human-friendly id prefixes so `freeze d3` / `why c1` are typeable. */
const TYPE_PREFIX = {
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
function projectsHome() {
    return process.env.CONTINUITY_HOME || join(homedir(), ".continuity", "projects");
}
/**
 * The store IS the filesystem. Two modes, one API:
 *  - repo mode:    <repo>/.continuity/   (found by walking up from cwd — Claude Code)
 *  - central mode: ~/.continuity/projects/<name>/   (named projects — Claude Desktop)
 * Git is the event log; nothing is ever deleted (supersession archives).
 */
export class Store {
    /** Directory that directly contains claims/. */
    root;
    /** Directory to run git in. */
    gitDir;
    /** Path (relative to gitDir) to stage on commit. */
    gitPath;
    constructor(root, gitDir, gitPath) {
        this.root = root;
        this.gitDir = gitDir;
        this.gitPath = gitPath;
    }
    claimsDir() {
        return join(this.root, CLAIMS);
    }
    // ---- construction / resolution ----------------------------------
    /** Repo mode: walk up from `from` to a dir containing .continuity/. */
    static findRepo(from = process.cwd()) {
        let dir = from;
        while (true) {
            if (existsSync(join(dir, STATE_DIR))) {
                return new Store(join(dir, STATE_DIR), dir, STATE_DIR);
            }
            const parent = dirname(dir);
            if (parent === dir)
                return null;
            dir = parent;
        }
    }
    static forRepoAt(dir) {
        return new Store(join(dir, STATE_DIR), dir, STATE_DIR);
    }
    /** Central mode: a named project under ~/.continuity/projects/<name>/. */
    static forProject(name) {
        const root = join(projectsHome(), name);
        return new Store(root, root, ".");
    }
    static listProjects() {
        const home = projectsHome();
        if (!existsSync(home))
            return [];
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
    static resolve(opts = {}) {
        if (opts.project)
            return Store.forProject(opts.project);
        const repo = Store.findRepo(opts.cwd ?? process.cwd());
        if (repo)
            return repo;
        const projects = Store.listProjects();
        if (projects.length === 1)
            return Store.forProject(projects[0]);
        return null;
    }
    exists() {
        return existsSync(this.claimsDir());
    }
    // ---- reads -------------------------------------------------------
    list() {
        const dir = this.claimsDir();
        if (!existsSync(dir))
            return [];
        return readdirSync(dir)
            .filter((f) => f.endsWith(".md"))
            .map((f) => parseClaim(readFileSync(join(dir, f), "utf8")));
    }
    get(id) {
        const p = join(this.claimsDir(), `${id}.md`);
        return existsSync(p) ? parseClaim(readFileSync(p, "utf8")) : undefined;
    }
    /** Find claims by exact id, else case-insensitive id/title substring (fuzzy handles). */
    resolveClaims(query) {
        const all = this.list();
        const exact = all.find((c) => c.id === query);
        if (exact)
            return [exact];
        const q = query.toLowerCase();
        return all.filter((c) => c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
    }
    // ---- writes ------------------------------------------------------
    init(mission) {
        mkdirSync(this.claimsDir(), { recursive: true });
        if (mission)
            this.record({ type: "mission", title: mission, status: "active", confidence: "confirmed" });
    }
    write(c) {
        mkdirSync(this.claimsDir(), { recursive: true });
        writeFileSync(join(this.claimsDir(), `${c.id}.md`), serializeClaim(c));
    }
    record(input) {
        const id = input.id ?? this.nextId(input.type);
        const claim = {
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
            tags: [],
        };
        this.write(claim);
        return claim;
    }
    freeze(id) {
        const c = this.must(id);
        c.status = "frozen";
        c.provenance.updated = new Date().toISOString();
        this.write(c);
        return c;
    }
    supersede(oldId, newId, reason) {
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
    must(id) {
        const c = this.get(id);
        if (!c)
            throw new Error(`no such claim: ${id}`);
        return c;
    }
    nextId(type) {
        const prefix = TYPE_PREFIX[type] ?? type.replace(/[^a-z]/g, "").slice(0, 3);
        const ids = new Set(this.list().map((c) => c.id));
        if (type === "mission" && !ids.has("mission"))
            return "mission";
        let n = 1;
        while (ids.has(`${prefix}${n}`))
            n++;
        return `${prefix}${n}`;
    }
}
