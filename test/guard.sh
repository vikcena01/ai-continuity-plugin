#!/usr/bin/env bash
# Asserts the frozen guard fails CLOSED, and that provenance cannot be silently
# empty. From an external report (EuphoricDoom, 2026-09-18) — all three were real.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
export CONTINUITY_HOME="$TMP/projects"
C() { node "$ROOT/dist/cli.js" "$@"; }

pass=0; fail=0
ok() { if eval "$2"; then echo "  ok: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

C init "Guard demo" --project g >/dev/null
C record-constraint "The database stays PostgreSQL for transactional data" --project g >/dev/null
C record-constraint "The database stays PostgreSQL in staging too" --project g >/dev/null
C freeze "transactional data" --project g >/dev/null
C freeze "staging too" --project g >/dev/null

# --- the reported case: an AMBIGUOUS conflicts_with must not bypass the guard ---
cat > "$TMP/amb.json" <<'JSON'
{"ops":[{"op":"add","type":"constraint","title":"All databases move to DynamoDB","conflicts_with":"database stays PostgreSQL","confidence":"confirmed"}]}
JSON
out="$(C capture --file "$TMP/amb.json" --project g)"
ok "ambiguous conflict applies NOTHING"   'echo "$out" | grep -q "\"applied\": \[\]"'
ok "it is parked instead"                 '! echo "$out" | grep -q "\"parked\": \[\]"'
ok "the parked note says ambiguous"       'echo "$out" | grep -qi "ambiguous"'
ok "and names every frozen candidate"     '[[ $(echo "$out" | grep -o "c[0-9][a-z][a-z0-9]" | sort -u | wc -l | tr -d " ") -ge 2 ]]'
# the CONFLICTS section also renders "- [id] ...", so scope the check to the
# ACTIVE sections rather than matching any bullet
ok "the contradiction is NOT active"      '! C resume --project g | sed -n "/^## Active/,/^## [^A]/p" | grep -q "All databases move to DynamoDB"'
ok "it surfaces under CONFLICTS"          'C resume --project g | sed -n "/CONFLICTS/,/^## /p" | grep -q "DynamoDB"'
ok "both frozen claims are untouched"     '[[ $(C list --status frozen --project g | wc -l | tr -d " ") -eq 2 ]]'

# an UNAMBIGUOUS conflict with a frozen claim must still park (no regression)
cat > "$TMP/one.json" <<'JSON'
{"ops":[{"op":"add","type":"constraint","title":"Staging may use MySQL","conflicts_with":"staging too"}]}
JSON
o2="$(C capture --file "$TMP/one.json" --project g)"
ok "a single frozen match still parks"    'echo "$o2" | grep -q "parked" && echo "$o2" | grep -q "\"applied\": \[\]"'

# a conflict naming nothing, or several NON-frozen claims, applies but is reported
C record-decision "Cache layer is optional" --project g >/dev/null
cat > "$TMP/none.json" <<'JSON'
{"ops":[{"op":"add","type":"decision","title":"Add a cache","conflicts_with":"nothing matches this"}]}
JSON
o3="$(C capture --file "$TMP/none.json" --project g)"
ok "an unmatched conflict still applies"  '! echo "$o3" | grep -q "\"applied\": \[\]"'
ok "but says the guard did not engage"    'echo "$o3" | grep -q "matched no claim"'

# --- provenance: a reason cannot be silently empty ---
C record-decision "Use REST" --project g >/dev/null
cat > "$TMP/nosup.json" <<'JSON'
{"ops":[{"op":"supersede","old":"Use REST","title":"Use GraphQL"}]}
JSON
o4="$(C capture --file "$TMP/nosup.json" --project g)"
ok "reasonless supersession is refused"   'echo "$o4" | grep -q "\"applied\": \[\]"'
ok "and explains why"                     'echo "$o4" | grep -q "needs a reason"'
ok "the original stays current"           'C resume --project g | grep -q "Use REST"'
ok "no empty-reason lineage was written"  '! C why "Use REST" --project g | grep -qE "because: *$"'

cat > "$TMP/norej.json" <<'JSON'
{"ops":[{"op":"reject","title":"Kafka for ingestion"}]}
JSON
o5="$(C capture --file "$TMP/norej.json" --project g)"
ok "reasonless rejection is refused"      'echo "$o5" | grep -q "\"applied\": \[\]"'
ok "and explains why"                     'echo "$o5" | grep -q "needs a reason"'
ok "no hollow guardrail in the resume"    '! C resume --project g | grep -qE "REJECTED because: *$"'

# with a reason, both still work
cat > "$TMP/good.json" <<'JSON'
{"ops":[
 {"op":"supersede","old":"Use REST","title":"Use GraphQL","reason":"one round trip for nested reads"},
 {"op":"reject","title":"Kafka for ingestion","reason":"operational overhead unjustified at 8K events/sec"}
]}
JSON
o6="$(C capture --file "$TMP/good.json" --project g)"
ok "with reasons, both are accepted"      '! echo "$o6" | grep -q "\"applied\": \[\]"'
ok "and the reason travels (d10)"         'C why "Use GraphQL" --project g | grep -q "one round trip"'


# --- the skill must not contradict the hook (both are model-facing instructions) ---
SKILL="$ROOT/skills/continuity/SKILL.md"
HOOK="$ROOT/src/hook-stop-capture.ts"
ok "skill says default to capturing nothing" 'grep -q "Default to capturing NOTHING" "$SKILL"'
ok "hook says the same"                      'grep -q "Default to capturing NOTHING" "$HOOK"'
ok "skill no longer says err toward capturing" '! grep -q "err toward capturing" "$SKILL"'
ok "skill names the framing category"        'grep -q "FRAMING" "$SKILL"'
ok "skill routes standing instructions"      'grep -qi "standing instruction" "$SKILL"'
ok "skill documents every shipped tool" '
  for t in record_decision record_constraint record_rejection record_open record_mission \
           capture freeze_claim resolve_claim search_claims why resume_context create_project; do
    grep -q "$t" "$SKILL" || exit 1
  done'

echo ""
echo "guard: $pass passed, $fail failed"
rm -rf "$TMP"
[[ $fail -eq 0 ]]
