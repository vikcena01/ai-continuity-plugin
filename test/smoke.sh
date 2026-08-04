#!/usr/bin/env bash
# Asserted end-to-end smoke test. Runs the CLI against a throwaway central store
# and fails loudly if any core invariant regresses.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
export CONTINUITY_HOME="$TMP/projects"
C() { node "$ROOT/dist/cli.js" "$@"; }

pass=0; fail=0
ok()   { if eval "$2"; then echo "  ok: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

echo "smoke: using CONTINUITY_HOME=$CONTINUITY_HOME"

C init "Demo URL shortener" --project demo >/dev/null
C record-decision "PostgreSQL is the source of truth" --project demo >/dev/null
C record-constraint "Short codes are exactly 7-char base62" --project demo >/dev/null
C reject "DynamoDB as primary store" --reason "KV overhead unjustified" --project demo >/dev/null
C record-decision "Use 302 redirects" --project demo >/dev/null
C record-decision "Use 301 permanent redirects" --project demo >/dev/null

# short, typeable ids
ids="$(C list --project demo)"
ok "ids are short (d1 present)"        '[[ "$ids" == *" d1 "* ]] || echo "$ids" | grep -q " d1 "'
ok "constraint id c1 present"          'echo "$ids" | grep -q " c1 "'
ok "rejection id x1 present"           'echo "$ids" | grep -q " x1 "'

# fuzzy freeze by text (no need to know the id)
C freeze "7-char base62" --project demo >/dev/null
ok "fuzzy freeze worked (c1 frozen)"   'C list --project demo | grep -q "frozen.*c1"'

# supersession by fuzzy text + reason travels
C supersede "302 redirects" "301 permanent" --reason "302 hook obsolete once analytics moved async" --project demo >/dev/null
resume="$(C resume --project demo)"
ok "301 is active"                     'echo "$resume" | grep -q "Use 301 permanent redirects"'
ok "302 not a top-level active bullet" '! echo "$resume" | grep -qE "^- .*Use 302 redirects"'
ok "reason travels with decision"      'echo "$resume" | grep -q "hook obsolete once analytics moved async"'
ok "frozen section rendered"           'echo "$resume" | grep -q "FROZEN — MUST NOT change"'
ok "rejected path surfaced"            'echo "$resume" | grep -q "Do NOT revisit"'
ok "rejection reason surfaced"         'echo "$resume" | grep -q "KV overhead unjustified"'

# git is the event log
gitlog="$(C log --project demo)"
ok "git recorded commits"              '[[ $(echo "$gitlog" | grep -c "continuity:") -ge 6 ]]'

# multi-project isolation
C init "Second project" --project other >/dev/null
ok "projects lists both"               'C projects | grep -q "^demo$" && C projects | grep -q "^other$"'
ok "demo state absent from other"      '! C resume --project other | grep -q "PostgreSQL"'

echo ""
echo "smoke: $pass passed, $fail failed"
rm -rf "$TMP"
[[ $fail -eq 0 ]]
