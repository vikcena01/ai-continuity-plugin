#!/usr/bin/env python3
"""Minimal continuity state engine for the 2-agent POC.

Not the product — just enough of the real design to test the thesis:
  - typed Claims with a status lifecycle
  - append-only events (nothing is ever destroyed)
  - autonomous capture (no approval gate); `freeze` is the one deliberate act
  - deterministic resume-context projection with confidence + a "Do NOT revisit" section
"""
import json
import sys
from datetime import datetime, timezone

CLAIM_TYPES = {
    "mission", "requirement", "decision", "constraint", "architecture",
    "milestone", "hypothesis", "experiment", "risk", "question",
    "next_action", "rejected_alternative",
}

# Which statuses are "current" (surfaced as authoritative) vs archived.
LIVE_STATUSES = {"active", "accepted", "frozen", "open"}


class Store:
    def __init__(self):
        self.events = []      # append-only log = source of truth
        self.claims = {}      # materialized projection, folded from events
        self.conflicts = []   # unresolved contradictions raised by the reconciler
        self.cascade = []     # dependents undermined when a foundation changed

    def _now(self, stamp):
        return stamp

    def apply(self, op, stamp):
        """Fold one capture op into state. Ops are additive/non-destructive."""
        kind = op["op"]
        self.events.append({"op": op, "at": stamp})
        if kind == "add":
            cid = op["id"]
            self.claims[cid] = {
                "id": cid,
                "type": op["type"],
                "title": op["title"],
                "body": op.get("body", ""),
                "status": op.get("status", "accepted"),
                "confidence": op.get("confidence", "tentative"),
                "provenance": op.get("provenance", {"origin": "auto"}),
                "supersedes": op.get("supersedes"),
                "superseded_by": None,
                "superseded_reason": "",
                "depends_on": list(op.get("depends_on", [])),
                "reason": op.get("reason", ""),
            }
        elif kind == "supersede":
            old, new = op["old_id"], op["new_id"]
            # lineage preserved: old claim is archived, never deleted
            self.claims[old]["status"] = "superseded"
            self.claims[old]["superseded_by"] = new
            self.claims[old]["superseded_reason"] = op.get("reason", "")
            self._cascade(old, new)
        elif kind == "freeze":
            # the ONE deliberate human act — an unbreakable promise
            self.claims[op["id"]]["status"] = "frozen"
        elif kind == "link":
            # record that one claim rests on another (from depends_on to)
            deps = self.claims[op["from_id"]]["depends_on"]
            if op["to_id"] not in deps:
                deps.append(op["to_id"])
        elif kind == "flag_conflict":
            # reconciler hit a contradiction it must NOT auto-resolve
            # (e.g. against a frozen claim). Park the newcomer, keep the
            # authoritative claim untouched, surface it loudly. No deletion.
            self.claims[op["loser_id"]]["status"] = "needs_review"
            self.conflicts.append({
                "loser_id": op["loser_id"],
                "against_id": op["against_id"],
                "note": op.get("note", ""),
            })

    def load_ops(self, ops, stamp):
        for op in ops:
            if op.get("op") == "add" and op["type"] not in CLAIM_TYPES:
                raise ValueError(f"unknown claim type: {op['type']}")
            self.apply(op, stamp)

    # ---- projections -------------------------------------------------
    def _by(self, *types, statuses=None):
        out = []
        for c in self.claims.values():
            if c["type"] in types and (statuses is None or c["status"] in statuses):
                out.append(c)
        return out

    def _predecessors(self, cid):
        """Claims this one replaced — so the resume context can carry the WHY."""
        return [c for c in self.claims.values() if c["superseded_by"] == cid]

    def _cascade(self, changed_id, new_id):
        """A foundation changed. Flag live claims that rest on it for re-evaluation.
        We do NOT auto-invalidate them — some may still hold — we surface them."""
        for c in self.claims.values():
            if changed_id in c["depends_on"] and c["status"] in LIVE_STATUSES:
                self.cascade.append({"dependent_id": c["id"],
                                     "changed_id": changed_id, "new_id": new_id})

    def render_resume_context(self):
        L = []
        mission = self._by("mission", statuses=LIVE_STATUSES)
        milestone = self._by("milestone", statuses={"open"})
        nxt = self._by("next_action", statuses={"open"})

        L.append(f"# RESUME CONTEXT — {mission[0]['title'] if mission else 'Project'}")
        if mission:
            L.append(f"_{mission[0]['body']}_")
        L.append("")
        if milestone:
            L.append(f"**Current milestone:** {milestone[0]['title']}")
        if nxt:
            L.append(f"**Resume at:** {nxt[0]['title']} — {nxt[0]['body']}")
        L.append("")

        if self.cascade:
            seen = set()
            L.append("## ⚠️ DEPENDENCY IMPACTS (a foundation changed — RE-EVALUATE, do not just build on these)")
            for imp in self.cascade:
                dep = self.claims[imp["dependent_id"]]
                if dep["id"] in seen or dep["status"] not in LIVE_STATUSES:
                    continue
                seen.add(dep["id"])
                changed, new = self.claims[imp["changed_id"]], self.claims[imp["new_id"]]
                L.append(f"- [{dep['id']}] \"{dep['title']}\" rests on [{changed['id']}] "
                         f"\"{changed['title']}\", which was just superseded by "
                         f"[{new['id']}] \"{new['title']}\". Re-evaluate before acting on it.")
            L.append("")

        if self.conflicts:
            L.append("## ⚠️ CONFLICTS NEEDING ATTENTION (unresolved — do not act blindly)")
            for cf in self.conflicts:
                loser = self.claims[cf["loser_id"]]
                against = self.claims[cf["against_id"]]
                L.append(f"- [{loser['id']}] \"{loser['title']}\" conflicts with "
                         f"[{against['id']}] \"{against['title']}\" ({against['status']})")
                L.append(f"    → {cf['note']}")
            L.append("")

        frozen = self._by("decision", "constraint", "architecture", statuses={"frozen"})
        if frozen:
            L.append("## 🔒 FROZEN — MUST NOT change")
            for c in frozen:
                L.append(f"- [{c['id']}] {c['title']} — {c['body']}  _(confidence: {c['confidence']})_")
            L.append("")

        decisions = self._by("decision", "architecture", statuses={"accepted", "active"})
        if decisions:
            L.append("## Active decisions & architecture")
            for c in decisions:
                L.append(f"- [{c['id']}] {c['title']} — {c['body']}  _(confidence: {c['confidence']})_")
                for p in self._predecessors(c["id"]):
                    # carry the reason the decision changed, so it can't be re-litigated
                    L.append(f"    ↳ replaced [{p['id']}] \"{p['title']}\" — because: {p['superseded_reason']}")
            L.append("")

        cons = self._by("constraint", statuses={"active", "accepted"})
        if cons:
            L.append("## Active constraints")
            for c in cons:
                L.append(f"- [{c['id']}] {c['title']} — {c['body']}  _(confidence: {c['confidence']})_")
            L.append("")

        rejected = self._by("rejected_alternative") + self._by("hypothesis", statuses={"rejected"})
        if rejected:
            L.append("## 🚫 Do NOT revisit (already rejected — do not re-propose)")
            for c in rejected:
                L.append(f"- [{c['id']}] {c['title']} — REJECTED because: {c['reason'] or c['body']}")
            L.append("")

        opens = self._by("question", "risk", statuses={"open"})
        if opens:
            L.append("## Open questions / risks")
            for c in opens:
                L.append(f"- [{c['id']}] {c['title']} — {c['body']}")
            L.append("")

        done = self._by("milestone", statuses={"completed"})
        if done:
            L.append("## Completed")
            for c in done:
                L.append(f"- {c['title']}")
            L.append("")

        return "\n".join(L).rstrip() + "\n"


def _extract_json(text):
    """Be lenient: pull the first {...} or [...] block out of an agent's reply."""
    text = text.strip()
    start = min([i for i in (text.find("{"), text.find("[")) if i != -1])
    depth, instr, esc = 0, False, False
    for i in range(start, len(text)):
        ch = text[i]
        if instr:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                instr = False
            continue
        if ch == '"':
            instr = True
        elif ch in "{[":
            depth += 1
        elif ch in "}]":
            depth -= 1
            if depth == 0:
                return json.loads(text[start:i + 1])
    raise ValueError("no complete JSON block found")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "render"
    path = sys.argv[2]
    raw = open(path).read()
    data = _extract_json(raw)
    ops = data["claims"] if isinstance(data, dict) else data
    store = Store()
    store.load_ops(ops, stamp="2026-08-04T00:00:00Z")
    if cmd == "render":
        sys.stdout.write(store.render_resume_context())
    elif cmd == "stats":
        print(f"{len(store.claims)} claims from {len(store.events)} events")
        for c in store.claims.values():
            print(f"  [{c['status']:>12}] {c['type']:>20}  {c['title']}")
    elif cmd == "candidates":
        # Recall step: the set of live claims a new capture must be checked against.
        # (Production does embedding-nearest recall; the POC returns all live ones.)
        live = [c for c in store.claims.values()
                if c["type"] in ("decision", "constraint", "architecture")
                and c["status"] in ("accepted", "active", "frozen")]
        print(json.dumps([{"id": c["id"], "title": c["title"], "body": c["body"],
                           "frozen": c["status"] == "frozen"} for c in live], indent=2))
    elif cmd == "why":
        # "which was replaced, and why" — the query flat memory can't answer
        cid = sys.argv[3]
        cur = store.claims[cid]
        print(f"CURRENT: [{cur['id']}] {cur['title']}  (status: {cur['status']})")
        replaced = [c for c in store.claims.values() if c["superseded_by"] == cid]
        if not replaced:
            print("  (supersedes nothing — original decision)")
        while replaced:
            nxt = []
            for r in replaced:
                print(f"  ↑ replaced [{r['id']}] {r['title']}")
                print(f"      because: {r['superseded_reason']}")
                nxt += [c for c in store.claims.values() if c["superseded_by"] == r["id"]]
            replaced = nxt
