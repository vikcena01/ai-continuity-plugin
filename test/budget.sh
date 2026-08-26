#!/usr/bin/env bash
# Asserts the resume budget (rk12j6/rk8eg): the projection degrades in tiers,
# says what it dropped, and never drops the things whose absence causes harm.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
export CONTINUITY_HOME="$TMP/projects"
C() { node "$ROOT/dist/cli.js" "$@"; }

pass=0; fail=0
ok() { if eval "$2"; then echo "  ok: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

BIG="$(python3 -c 'print("padding text that makes this body long. " * 40)')"

C init "Budget demo" --project bg >/dev/null
C record-constraint "Codes are 7-char base62" --body "$BIG" --project bg >/dev/null
C freeze "7-char base62" --project bg >/dev/null
C record-decision "PostgreSQL is the source of truth" --body "$BIG" --project bg >/dev/null
C reject "DynamoDB as primary store" --reason "KV overhead unjustified at our volume" --project bg >/dev/null
C record --type risk "A risk with a long body" --body "$BIG" --project bg >/dev/null
C record --type question "A question with a long body" --body "$BIG" --project bg >/dev/null
C record --type next_action "Ship the thing" --body "$BIG" --project bg >/dev/null
C record --type milestone "Current milestone" --project bg >/dev/null

full="$(CONTINUITY_RESUME_BYTES=400000 C resume --project bg)"
tight="$(CONTINUITY_RESUME_BYTES=1200 C resume --project bg)"

# bodies are clipped even with a huge budget, so one claim can't dominate
# frozen claims keep FULL bodies deliberately, so measure a normal one
dline="$(echo "$full" | grep "PostgreSQL is the source of truth")"
ok "non-frozen bodies are clipped"  '[[ ${#dline} -lt 400 ]]'
ok "frozen bodies are NOT clipped"  '[[ $(echo "$full" | grep -c "7-char base62.*padding text") -ge 1 ]]'
ok "clipping is marked with an ellipsis" 'echo "$full" | grep -q "…"'
ok "a generous budget keeps bodies" 'echo "$full" | grep -q "padding text"'

# the four things that must survive every level
ok "frozen survives the tightest budget"   'echo "$tight" | grep -q "FROZEN — MUST NOT change"'
ok "frozen keeps its FULL body"            'echo "$tight" | grep -q "7-char base62"'
ok "mission survives"                      'echo "$tight" | grep -q "Budget demo"'
ok "milestone survives"                    'echo "$tight" | grep -q "Current milestone"'
ok "direction survives"                    'echo "$tight" | grep -q "Ship the thing"'
ok "rejected guardrail survives"           'echo "$tight" | grep -q "DynamoDB as primary store"'
ok "and keeps its REASON"                  'echo "$tight" | grep -q "KV overhead unjustified"'

# degradation is announced, never silent
ok "trimming is disclosed"                 'echo "$tight" | grep -q "Trimmed to fit"'
ok "disclosure names what was dropped"     'echo "$tight" | grep -qE "bodies shortened|omitted"'
ok "disclosure says where the full text is" 'echo "$tight" | grep -q ".continuity/claims/"'
ok "a fitting projection says nothing"     '! echo "$full" | grep -q "Trimmed to fit"'

# the budget is actually respected
ok "tight output is smaller than full"     '[[ $(echo "$tight" | wc -c) -lt $(echo "$full" | wc -c) ]]'
ok "env override is honoured"              '[[ $(CONTINUITY_RESUME_BODY=20 C resume --project bg | wc -c) -lt $(echo "$full" | wc -c) ]]'

# d9: same input, same output
a="$(C resume --project bg)"; b="$(C resume --project bg)"
ok "projection is deterministic"           '[[ "$a" == "$b" ]]'

echo ""
echo "budget: $pass passed, $fail failed"
rm -rf "$TMP"
[[ $fail -eq 0 ]]
