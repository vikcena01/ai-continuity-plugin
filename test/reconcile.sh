#!/usr/bin/env bash
# Asserts the reconciler's safety invariants — the piece that makes autonomous
# capture trustworthy. Ports the POC's contradiction scenario.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
export CONTINUITY_HOME="$TMP/projects"
C() { node "$ROOT/dist/cli.js" "$@"; }

pass=0; fail=0
ok() { if eval "$2"; then echo "  ok: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

C init "Reconciler demo" --project r >/dev/null
C record-decision "Use 302 redirects" --project r >/dev/null
C record-constraint "Short codes are exactly 7-char base62" --project r >/dev/null
C freeze "7-char base62" --project r >/dev/null

# A blind autonomous batch: (1) an 8-char constraint that CONTRADICTS the frozen one,
# (2) a legit supersession of the non-frozen 302 decision, (3) a duplicate of the frozen claim.
cat > "$TMP/ops.json" <<'JSON'
{"ops":[
  {"op":"add","type":"constraint","title":"Support 8-char campaign codes","body":"new namespace","conflicts_with":"7-char base62"},
  {"op":"supersede","old":"302 redirects","type":"decision","title":"Use 301 permanent redirects","reason":"302 hook obsolete once analytics moved async"},
  {"op":"add","type":"constraint","title":"short codes are exactly 7-char base62"}
]}
JSON

out="$(C capture --file "$TMP/ops.json" --project r)"
resume="$(C resume --project r)"
list="$(C list --project r)"

ok "frozen-clash parked (parked non-empty)" '! echo "$out" | grep -q "\"parked\": \[\]"'
ok "non-frozen supersede applied"          '! echo "$out" | grep -q "\"superseded\": \[\]"'
ok "duplicate of frozen skipped"           '! echo "$out" | grep -q "\"duplicates\": \[\]"'
ok "frozen claim still frozen (untouched)" 'echo "$list" | grep -q "frozen.*7-char base62"'
ok "8-char only appears in CONFLICTS"      '! echo "$resume" | grep "8-char campaign codes" | grep -vq "conflicts with"'
ok "8-char surfaced in CONFLICTS section"  'echo "$resume" | grep -q "CONFLICTS NEEDING ATTENTION" && echo "$resume" | grep -q "8-char campaign codes"'
ok "301 is an active decision"             'echo "$resume" | grep -qE "^- .*Use 301 permanent redirects"'
ok "302 not a top-level active bullet"     '! echo "$resume" | grep -qE "^- .*Use 302 redirects"'
ok "302 lineage kept (why shows reason)"   'C why "301 permanent" --project r | grep -q "302 hook obsolete"'

echo ""
echo "reconcile: $pass passed, $fail failed"
rm -rf "$TMP"
[[ $fail -eq 0 ]]
