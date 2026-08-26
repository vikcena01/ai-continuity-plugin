#!/usr/bin/env bash
# Asserts the review ritual (rk13tj): a semantic diff of what autonomous capture
# wrote, so the d4 safeguard is one command instead of an implied habit.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
export CONTINUITY_HOME="$TMP/projects"
C() { node "$ROOT/dist/cli.js" "$@"; }
CLAIMS="$TMP/projects/rv/claims"

pass=0; fail=0
ok() { if eval "$2"; then echo "  ok: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

C init "Review demo" --project rv >/dev/null
C record-decision "Use 302 redirects" --project rv >/dev/null

first="$(C review --project rv)"
ok "first run explains itself"      'echo "$first" | grep -q "No review marker yet"'
ok "first run counts the claims"    'echo "$first" | grep -q "claims currently on record"'
ok "first run does not invent changes" '! echo "$first" | grep -qE "^ *(NEW|EDITED|STATUS)"'

C review --accept --project rv >/dev/null
ok "accept writes the marker"       'test -f "$TMP/projects/rv/REVIEWED"'
ok "marker holds a commit sha"      'grep -qE "^[0-9a-f]{7,40}$" "$TMP/projects/rv/REVIEWED"'
ok "clean review says so"           'C review --project rv | grep -q "Nothing changed"'

# an autonomous batch: one add, one supersession
cat > "$TMP/ops.json" <<'JSON'
{"ops":[
  {"op":"add","type":"constraint","title":"Codes are 7-char base62","reason":"printed in partner contracts"},
  {"op":"supersede","old":"302 redirects","title":"Use 301 permanent redirects","reason":"302 hook obsolete once analytics moved async"}
]}
JSON
C capture --file "$TMP/ops.json" --project rv >/dev/null
out="$(C review --project rv)"

ok "a new claim shows as NEW"        'echo "$out" | grep -qE "NEW *\[c1[a-z][a-z0-9]\] Codes are 7-char base62"'
ok "NEW carries its reason"          'echo "$out" | grep -q "printed in partner contracts"'
ok "a replaced claim shows REPLACED" 'echo "$out" | grep -qE "REPLACED *\[d1[a-z][a-z0-9]\] Use 302 redirects"'
ok "REPLACED shows the transition"   'echo "$out" | grep -q "(accepted -> superseded)"'
ok "REPLACED carries the reason"     'echo "$out" | grep -q "302 hook obsolete once analytics moved async"'
ok "it counts the changes"           'echo "$out" | grep -qE "^3 changes|^[0-9]+ changes"'
ok "it says how to reject a bad one" 'echo "$out" | grep -q "continuity resolve"'
ok "it names the commit reviewed to" 'echo "$out" | grep -qE "^Since [0-9a-f]{7}"'

# closing a claim shows as a status move — but only once the marker has advanced
# past its creation, otherwise it is correctly still NEW relative to the review point
C review --accept --project rv >/dev/null
C resolve "7-char base62" --reason "folded into the codes spec" --project rv >/dev/null
st="$(C review --project rv)"
ok "a closed claim shows STATUS"     'echo "$st" | grep -qE "STATUS *\[c1[a-z][a-z0-9]\]"'
ok "STATUS shows the transition"     'echo "$st" | grep -q "(accepted -> resolved)"'
ok "STATUS carries the resolution"   'echo "$st" | grep -q "folded into the codes spec"'

# a hand edit is caught too — c1 says the files stay hand-editable, so review must see it
C review --accept --project rv >/dev/null
perl -i -pe 's/^(title: .*301 permanent redirects)$/$1 (hand-edited)/' "$CLAIMS"/d*.md
ed="$(C review --project rv)"
ok "a hand edit shows as EDITED"     'echo "$ed" | grep -qE "EDITED *\[d"'
ok "EDITED shows the previous title" 'echo "$ed" | grep -q "was: "'

# accepting clears the queue
C review --accept --project rv >/dev/null
ok "accept clears the queue"         'C review --project rv | grep -q "Nothing changed"'
ok "the marker is a real commit"   'git -C "$TMP/projects/rv" cat-file -e "$(cat "$TMP/projects/rv/REVIEWED" | tr -d "\n")^{commit}"'

echo ""
echo "review: $pass passed, $fail failed"
rm -rf "$TMP"
[[ $fail -eq 0 ]]
