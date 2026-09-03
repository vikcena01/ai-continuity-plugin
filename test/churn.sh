#!/usr/bin/env bash
# Asserts the direction-churn fix (rk16it): superseding a next_action amends it in
# place instead of spawning a claim per revision.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
export CONTINUITY_HOME="$TMP/projects"
C() { node "$ROOT/dist/cli.js" "$@"; }
CLAIMS="$TMP/projects/ch/claims"

pass=0; fail=0
ok() { if eval "$2"; then echo "  ok: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

C init "Churn demo" --project ch >/dev/null
C record --type next_action "Ship the first thing" --body "original plan" --project ch >/dev/null
# list prints "[  status]  type  id  title"; the id is field 4
first_id="$(C list --project ch | grep next_action | awk '{print $4}')"

amend() {
  cat > "$TMP/ops.json" <<JSON
{"ops":[{"op":"supersede","old":"$1","type":"next_action","title":"$2","body":"$3","reason":"direction moved"}]}
JSON
  C capture --file "$TMP/ops.json" --project ch
}

out="$(amend "$first_id" "Ship the second thing" "revised plan")"
ok "an amend is reported as amended"    'echo "$out" | grep -q "\"amended\""'
ok "and NOT as a new applied claim"     'echo "$out" | grep -q "\"applied\": \[\]"'
ok "and NOT as a supersession"          'echo "$out" | grep -q "\"superseded\": \[\]"'
ok "the id is preserved"                '[[ "$(C list --project ch | grep next_action | awk "{print \$4}")" == "$first_id" ]]'
ok "the new title is live"              'C resume --project ch | grep -q "Ship the second thing"'
ok "the old title is gone from state"   '! C list --project ch | grep -q "Ship the first thing"'
ok "the body was replaced too"          'grep -q "revised plan" "$CLAIMS/$first_id.md"'
ok "provenance records the update"      'grep -q "updated:" "$CLAIMS/$first_id.md"'

# the point of the fix: no claim accumulation across many revisions
for i in 3 4 5 6 7; do amend "$first_id" "Ship thing $i" "plan $i" >/dev/null; done
ok "still exactly ONE next_action file" '[[ $(grep -l "type: next_action" "$CLAIMS"/*.md | wc -l | tr -d " ") -eq 1 ]]'
ok "six revisions, one claim"           '[[ $(ls "$CLAIMS" | wc -l | tr -d " ") -eq 2 ]]'
ok "history survives in git (d1)"       '[[ $(C log --project ch | grep -c "capture") -ge 5 ]]'
# grep -q closes the pipe, git log gets SIGPIPE, and pipefail then fails the
# pipeline despite the match — capture first (same trap as test/schema.sh)
hist="$(git -C "$TMP/projects/ch" log -p --all || true)"
ok "git still holds the first title" 'echo "$hist" | grep -q "Ship the first thing"'

# decisions must STILL supersede properly — the fix is scoped to direction only
C record-decision "Use 302 redirects" --project ch >/dev/null
cat > "$TMP/ops2.json" <<'JSON'
{"ops":[{"op":"supersede","old":"302 redirects","title":"Use 301 permanent redirects","reason":"302 hook obsolete"}]}
JSON
out2="$(C capture --file "$TMP/ops2.json" --project ch)"
ok "decisions are NOT amended in place" 'echo "$out2" | grep -q "\"amended\": \[\]"'
ok "decisions still supersede"          '! echo "$out2" | grep -q "\"superseded\": \[\]"'
ok "decision lineage is kept"           'C why "301 permanent" --project ch | grep -q "302 hook obsolete"'

echo ""
echo "churn: $pass passed, $fail failed"
rm -rf "$TMP"
[[ $fail -eq 0 ]]
