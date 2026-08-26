#!/usr/bin/env bash
# Asserts the fixes for rk1–rk5 — the failure modes found by dogfooding the tool.
# Each block names the risk it pins down so a regression says which one broke.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
export CONTINUITY_HOME="$TMP/central"
C() { node "$ROOT/dist/cli.js" "$@"; }

pass=0; fail=0
ok() { if eval "$2"; then echo "  ok: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

# ---- rk1: capture must not invent claim types -------------------------------
C init "Risk demo" --project rk >/dev/null
cat > "$TMP/ops.json" <<'JSON'
{"ops":[
  {"op":"add","type":"open_question","title":"Is the alias path wired"},
  {"op":"add","type":"banana","title":"Should never be recorded"},
  {"op":"add","type":"decision","title":"A plain decision"}
]}
JSON
out="$(C capture --file "$TMP/ops.json" --project rk)"
ids="$(C list --project rk)"

ok "rk1 alias open_question -> question"  'echo "$ids" | grep -qE " q1[a-z][a-z0-9] +Is the alias path wired"'
ok "rk1 no fallback prefix minted"        '! echo "$ids" | grep -qE " ope[0-9]"'
ok "rk1 unknown type is rejected"         '! echo "$ids" | grep -q "Should never be recorded"'
ok "rk1 rejection is explained in notes"  'echo "$out" | grep -q "unknown type" && echo "$out" | grep -q banana'
ok "rk1 valid types listed in the note"   'echo "$out" | grep -q "rejected_alternative"'
ok "rk1 good ops still applied"           'echo "$ids" | grep -q "A plain decision"'

# ---- rk6: autonomously captured risks/questions must reach the resume ---------
# capture used to force status "accepted", but resume only surfaces question/risk
# when they are "open" — so every captured risk was silently invisible.
cat > "$TMP/ops2.json" <<'JSON'
{"ops":[
  {"op":"add","type":"risk","title":"A captured risk must be visible"},
  {"op":"add","type":"question","title":"A captured question must be visible"},
  {"op":"add","type":"decision","title":"A captured decision stays accepted"}
]}
JSON
C capture --file "$TMP/ops2.json" --project rk >/dev/null
r2="$(C resume --project rk)"
ok "rk6 captured risk reaches resume"     'echo "$r2" | grep -q "A captured risk must be visible"'
ok "rk6 captured question reaches resume" 'echo "$r2" | grep -q "A captured question must be visible"'
ok "rk6 they land under open questions"   'echo "$r2" | sed -n "/Open questions/,\$p" | grep -q "A captured risk must be visible"'
ok "rk6 decisions still land accepted"    'C list --project rk | grep -qE "accepted\].*A captured decision stays accepted"'

# ---- rk2: concurrent capture on two clones must not collide -----------------
git init -q --bare "$TMP/origin.git"
git -c init.defaultBranch=main clone -q "$TMP/origin.git" "$TMP/A"
# init already commits .continuity/ itself — no manual seed commit needed.
( cd "$TMP/A" && node "$ROOT/dist/cli.js" init "Shared project" && git push -q -u origin HEAD:main ) >/dev/null 2>&1
git clone -q "$TMP/origin.git" "$TMP/B" >/dev/null 2>&1

# A and B each record their own decision without seeing the other's.
( cd "$TMP/A" && node "$ROOT/dist/cli.js" record-decision "A picks Redis" >/dev/null && git push -q origin HEAD:main ) >/dev/null 2>&1
( cd "$TMP/B" && node "$ROOT/dist/cli.js" record-decision "B picks Memcached" >/dev/null ) >/dev/null 2>&1
merge="$( cd "$TMP/B" && git -c user.email=t@t -c user.name=t pull --no-rebase -q 2>&1; echo "rc=$?" )"

ok "rk2 concurrent capture merges clean" 'echo "$merge" | grep -q "rc=0" && ! echo "$merge" | grep -qi conflict'
ok "rk2 both claims survive the merge"   '( cd "$TMP/B" && node "$ROOT/dist/cli.js" list | grep -q "A picks Redis" && node "$ROOT/dist/cli.js" list | grep -q "B picks Memcached" )'
ok "rk2 the two ids differ"              '[[ $( cd "$TMP/B" && ls .continuity/claims | grep -c "^d1" ) -eq 2 ]]'
ok "rk2 sequence number still readable"  '( cd "$TMP/B" && ls .continuity/claims | grep -qE "^d1[a-z][a-z0-9]\.md" )'

# ---- rk4: unpushed captured commits are surfaced ----------------------------
( cd "$TMP/B" && node "$ROOT/dist/cli.js" record-decision "B captures again offline" ) >/dev/null 2>&1
ok "rk4 unpushed commits warned about"   '( cd "$TMP/B" && node "$ROOT/dist/cli.js" resume | grep -q "not pushed" )'
( cd "$TMP/B" && git push -q origin HEAD:main ) >/dev/null 2>&1
ok "rk4 warning clears once pushed"      '( cd "$TMP/B" && ! node "$ROOT/dist/cli.js" resume | grep -q "not pushed" )'
ok "rk4 no upstream => no nagging"       '( cd "$TMP/A" && node "$ROOT/dist/cli.js" resume | grep -q "Shared project" )'

# ---- rk5: never silently adopt a central project inside a repo --------------
# CONTINUITY_HOME holds exactly one project ("rk"), which is the trap condition.
mkdir -p "$TMP/unrelated" && git init -q "$TMP/unrelated"
resolved="$( cd "$TMP/unrelated" && node "$ROOT/dist/cli.js" resume 2>&1; echo "rc=$?" )"
ok "rk5 repo without state does not adopt central" '! echo "$resolved" | grep -q "Risk demo"'
ok "rk5 failure tells the user to init"            'echo "$resolved" | grep -q "continuity init"'
ok "rk5 central mode is flagged in resume"         'C resume --project rk | grep -q "STATE SYNC"'
ok "rk5 warns state will not reach a clone"        'C resume --project rk | grep -q "NOT"'
ok "rk5 repo mode stays quiet about sync"          '( cd "$TMP/A" && ! node "$ROOT/dist/cli.js" resume | grep -q "CENTRAL" )'

# ---- rk3: the repo self-activates on a plain clone --------------------------
ok "rk3 project hooks are committed"     'test -f "$ROOT/.claude/settings.json"'
ok "rk3 hooks run the committed bundles" 'grep -q "CLAUDE_PROJECT_DIR/dist/hook-session-start.js" "$ROOT/.claude/settings.json" && grep -q "CLAUDE_PROJECT_DIR/dist/hook-stop-capture.js" "$ROOT/.claude/settings.json"'
ok "rk3 those bundles exist to be run"   'test -f "$ROOT/dist/hook-session-start.js" && test -f "$ROOT/dist/hook-stop-capture.js"'
ok "rk3 session-start dedupes a double registration" \
   '[[ $(echo "{\"session_id\":\"dup-test\"}" | (cd "$ROOT" && node dist/hook-session-start.js; echo "{\"session_id\":\"dup-test\"}" | node dist/hook-session-start.js) | grep -c "RESUME CONTEXT") -eq 1 ]]'

echo ""
echo "risks: $pass passed, $fail failed"
rm -rf "$TMP"
[[ $fail -eq 0 ]]
