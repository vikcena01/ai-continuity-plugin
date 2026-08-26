#!/usr/bin/env bash
# Asserts the resolve verb — the one operation that closes a claim (q4 + q5).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
export CONTINUITY_HOME="$TMP/projects"
C() { node "$ROOT/dist/cli.js" "$@"; }

pass=0; fail=0
ok() { if eval "$2"; then echo "  ok: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

C init "Resolve demo" --project rv >/dev/null
C record-constraint "Short codes are exactly 7-char base62" --project rv >/dev/null
C freeze "7-char base62" --project rv >/dev/null

# Two blind captures that both clash with the frozen constraint -> both parked.
cat > "$TMP/ops.json" <<'JSON'
{"ops":[
  {"op":"add","type":"constraint","title":"Support 8-char campaign codes","conflicts_with":"7-char base62"},
  {"op":"add","type":"constraint","title":"Support 9-char partner codes","conflicts_with":"7-char base62"}
]}
JSON
C capture --file "$TMP/ops.json" --project rv >/dev/null
C record --type risk "A risk that gets dealt with" --project rv >/dev/null
C record --type next_action "A step that gets finished" --project rv >/dev/null

# ---- q4: a parked claim must be closable, and must not slip past the freeze ----
ok "parked claim starts in the queue"    'C resume --project rv | grep -q "8-char campaign codes"'
ok "resume names the resolve verb"       'C resume --project rv | grep -q "resolve_claim"'

no_action="$(C resolve "8-char campaign" --reason "trying without an action" --project rv 2>&1; echo rc=$?)"
ok "parked needs an explicit action"     'echo "$no_action" | grep -q "rc=1" && echo "$no_action" | grep -q "accept"'

refused="$(C resolve "8-char campaign" --accept --reason "we want 8-char" --project rv 2>&1; echo rc=$?)"
ok "accept over FROZEN is refused"       'echo "$refused" | grep -q "rc=1" && echo "$refused" | grep -qi "frozen"'
ok "refusal leaves the frozen claim be"  'C list --project rv | grep -qE "frozen.* c1"'
ok "refusal leaves the newcomer parked"  'C list --project rv | grep -q "needs_review"'

# reject: becomes a guardrail rather than disappearing
C resolve "9-char partner" --reject --reason "partner codes get a separate namespace" --project rv >/dev/null
ok "rejected leaves the conflict queue"  '! C resume --project rv | sed -n "/CONFLICTS NEEDING/,/^## /p" | grep -q "9-char partner"'
ok "rejected becomes a guardrail"        'C resume --project rv | sed -n "/Do NOT revisit/,\$p" | grep -q "9-char partner codes"'
ok "rejection reason travels"            'C resume --project rv | grep -q "partner codes get a separate namespace"'

# accept with an explicit unfreeze: the deliberate human act
C resolve "8-char campaign" --accept --unfreeze --reason "marketing signed off on 8-char" --project rv >/dev/null
ok "accepted claim is now live"          'C resume --project rv | grep -qE "^- .*8-char campaign codes"'
ok "the frozen claim was superseded"     'C list --project rv | grep -qE "superseded.*7-char base62"'
ok "lineage is kept, not deleted"        'C why "8-char campaign" --project rv | grep -q "7-char base62"'
ok "supersession reason travels"         'C why "8-char campaign" --project rv | grep -q "marketing signed off"'
ok "conflict queue is now empty"         '! C resume --project rv | grep -q "CONFLICTS NEEDING ATTENTION"'

# ---- q5: closing a risk/question that has actually been dealt with ----
ok "open risk shows before closing"      'C resume --project rv | grep -q "A risk that gets dealt with"'
C resolve "risk that gets dealt" --reason "fixed in abc123" --project rv >/dev/null
ok "closed risk leaves the resume"       '! C resume --project rv | grep -q "A risk that gets dealt with"'
ok "closed risk is resolved, not gone"   'C list --project rv | grep -qE "resolved.*A risk that gets dealt with"'
ok "the closing reason is recorded"      'C why "risk that gets dealt" --project rv | grep -q "fixed in abc123"'

C resolve "step that gets finished" --reason "shipped" --project rv >/dev/null
ok "next_action closes as done"          'C list --project rv | grep -qE "done.*A step that gets finished"'

again="$(C resolve "risk that gets dealt" --reason "again" --project rv 2>&1; echo rc=$?)"
ok "already-closed claim is refused"     'echo "$again" | grep -q "rc=1" && echo "$again" | grep -q "already"'

noreason="$(C resolve "step that gets finished" --project rv 2>&1; echo rc=$?)"
ok "a reason is mandatory"               'echo "$noreason" | grep -q "rc=1"'

echo ""
echo "resolve: $pass passed, $fail failed"
rm -rf "$TMP"
[[ $fail -eq 0 ]]
