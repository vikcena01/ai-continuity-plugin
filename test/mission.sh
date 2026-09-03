#!/usr/bin/env bash
# Asserts the mission tool (rk18oo): the resume context's first line must be
# reachable from the tool surface, and a pivot must carry its reason.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
export CONTINUITY_HOME="$TMP/projects"
C() { node "$ROOT/dist/cli.js" "$@"; }

pass=0; fail=0
ok() { if eval "$2"; then echo "  ok: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

# a project with NO mission — the repo-mode case create_project cannot help with
C init --project ms >/dev/null
ok "starts with no mission"            '! C resume --project ms | head -1 | grep -q "—"'

C mission "Build a URL shortener" --project ms >/dev/null
ok "mission is set"                    'C resume --project ms | head -1 | grep -q "Build a URL shortener"'
ok "it is the resume heading"          '[[ "$(C resume --project ms | head -1)" == *"Build a URL shortener"* ]]'
ok "id is the readable 'mission'"      'C list --project ms | grep -q " mission  "'
ok "status is active"                  'C list --project ms | grep -qE "active\].*mission"'

# identical text is a no-op, not a spurious supersession
before="$(C list --project ms | grep -c mission)"
C mission "Build a URL shortener" --project ms >/dev/null
ok "identical text is a no-op"         '[[ "$(C list --project ms | grep -c mission)" -eq "$before" ]]'

# a pivot without a reason must be refused
refused="$(C mission "Build a link analytics platform" --project ms 2>&1; echo rc=$?)"
ok "pivot without a reason refused"    'echo "$refused" | grep -q "rc=1"'
ok "refusal explains why"              'echo "$refused" | grep -q "needs a reason"'
ok "refusal quotes the current one"    'echo "$refused" | grep -q "Build a URL shortener"'
ok "and changes nothing"               'C resume --project ms | head -1 | grep -q "Build a URL shortener"'

# a pivot WITH a reason supersedes and keeps lineage
C mission "Build a link analytics platform" --reason "shortening became a feature, not the product" --project ms >/dev/null
ok "the pivot took effect"             'C resume --project ms | head -1 | grep -q "link analytics platform"'
ok "old mission is superseded"         'C list --project ms | grep -qE "superseded.*Build a URL shortener"'
ok "only one live mission"             '[[ $(C resume --project ms | grep -c "^# RESUME CONTEXT") -eq 1 ]]'
ok "the pivot reason is retrievable"   'C why "link analytics" --project ms | grep -q "shortening became a feature"'
ok "lineage names the predecessor"     'C why "link analytics" --project ms | grep -q "Build a URL shortener"'

# the MCP surface exposes it — the actual gap rk18oo recorded
# NO backgrounding. In a non-interactive script job control is off, so a
# backgrounded process gets stdin from /dev/null and the server never sees the
# requests — 0 bytes, which cost four false failures. The stdio server exits on
# EOF anyway, so a plain pipe is both correct and simpler.
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | node "$ROOT/dist/mcp.js" > "$TMP/tools.json" 2>/dev/null || true

ok "record_mission is exposed"          'grep -q record_mission "$TMP/tools.json"'
ok "its params are described"            'grep -q "Required only when replacing" "$TMP/tools.json"'
ok "tool count is now 12"                '[[ $(grep -o "\"name\":\"[a-z_]*\"" "$TMP/tools.json" | wc -l | tr -d " ") -ge 12 ]]'
ok "it is not reachable only via capture" 'grep -q "rather than capture with type mission" "$TMP/tools.json"'

echo ""
echo "mission: $pass passed, $fail failed"
rm -rf "$TMP"
[[ $fail -eq 0 ]]
