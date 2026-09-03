#!/usr/bin/env bash
# Asserts claim search (rk19rn): the claim set must be reachable directly, not
# only through the budgeted projection.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
export CONTINUITY_HOME="$TMP/projects"
C() { node "$ROOT/dist/cli.js" "$@"; }

pass=0; fail=0
ok() { if eval "$2"; then echo "  ok: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

C init "Search demo" --project se >/dev/null
C record-decision "PostgreSQL is the source of truth" --body "ops already runs it at scale" --project se >/dev/null
C record-constraint "Codes are exactly 7-char base62" --project se >/dev/null
C reject "DynamoDB as primary store" --reason "KV overhead unjustified" --project se >/dev/null
C record --type risk "A risk worth tracking" --project se >/dev/null
# supersede links two EXISTING claims, so the replacement must be recorded first
C record-decision "MySQL is the source of truth" --project se >/dev/null
C supersede "PostgreSQL is the source" "MySQL is the source" --reason "licensing" --project se >/dev/null

ok "no args lists everything"        '[[ $(C list --project se | wc -l | tr -d " ") -ge 6 ]]'
ok "query matches a title"           'C list --query "DynamoDB" --project se | grep -q "DynamoDB"'
ok "query matches a BODY, not just title" 'C list --query "ops already runs" --project se | grep -q "PostgreSQL"'
ok "query matches an id"             'C list --query "c1" --project se | grep -qE " c1[a-z]"'
ok "query is case-insensitive"       'C list --query "dynamodb" --project se | grep -q "DynamoDB"'
ok "no match says so"                '[[ -z "$(C list --query "zzzznope" --project se)" ]]'

ok "type filter works"               '[[ $(C list --type constraint --project se | wc -l | tr -d " ") -eq 1 ]]'
ok "type filter excludes others"     '! C list --type constraint --project se | grep -q "DynamoDB"'
ok "status filter works"             'C list --status superseded --project se | grep -q "PostgreSQL"'

# The whole point. A superseded claim is NOT invisible - its title shows as lineage
# under the successor, which is d10 working. A RESOLVED claim is the one that
# vanishes from the projection entirely, and that is what search has to reach.
C resolve "A risk worth tracking" --reason "handled elsewhere" --project se >/dev/null
ok "projection drops a resolved claim" '! C resume --project se | grep -q "A risk worth tracking"'
ok "search still finds it"             'C list --query "risk worth" --project se | grep -q "A risk worth tracking"'
ok "and shows its resolved status"     'C list --query "risk worth" --project se | grep -q "resolved"'
ok "superseded shows as lineage (d10)" 'C resume --project se | grep -q "PostgreSQL is the source"'
ok "but not as a top-level bullet"     '! C resume --project se | grep -qE "^- \[.*PostgreSQL is the source"'

ok "limit caps results"              '[[ $(C list --limit 2 --project se | wc -l | tr -d " ") -eq 2 ]]'

# determinism (d9): same query, same order
a="$(C list --query "o" --project se)"; b="$(C list --query "o" --project se)"
ok "search is deterministic"         '[[ "$a" == "$b" ]]'

# the MCP surface
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | node "$ROOT/dist/mcp.js" > "$TMP/tools.json" 2>/dev/null || true
ok "search_claims is exposed"        'grep -q search_claims "$TMP/tools.json"'
ok "tool count is now 13"            '[[ $(grep -o "\"name\":\"[a-z_]*\"" "$TMP/tools.json" | wc -l | tr -d " ") -ge 13 ]]'
ok "it is marked read-only"          'python3 -c "
import json
for line in open(\"$TMP/tools.json\"):
    m=json.loads(line)
    if m.get(\"id\")!=2: continue
    t=[x for x in m[\"result\"][\"tools\"] if x[\"name\"]==\"search_claims\"][0]
    raise SystemExit(0 if t[\"annotations\"][\"readOnlyHint\"] else 1)
raise SystemExit(1)
"'

# record_decision now discloses the reconciler bypass (its Parameters were 3/5)
ok "record_decision warns re dedupe" 'grep -q "does not go through the reconciler" "$TMP/tools.json"'
ok "and explains title vs body"      'grep -q "belongs in the title, not the body" "$TMP/tools.json"'
ok "the bypass claim is TRUE"         '[[ $(C record-decision "Dup me" --project se >/dev/null; C record-decision "Dup me" --project se >/dev/null; C list --query "Dup me" --project se | wc -l | tr -d " ") -eq 2 ]]'

echo ""
echo "search: $pass passed, $fail failed"
rm -rf "$TMP"
[[ $fail -eq 0 ]]
