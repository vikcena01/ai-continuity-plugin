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

# short, typeable ids: <prefix><n><2-char suffix>, e.g. d1k3 (the rk2 fix)
ids="$(C list --project demo)"
ok "decision id looks like d1<sfx>"    'echo "$ids" | grep -qE " d1[a-z][a-z0-9] "'
ok "constraint id looks like c1<sfx>"  'echo "$ids" | grep -qE " c1[a-z][a-z0-9] "'
ok "rejection id looks like x1<sfx>"   'echo "$ids" | grep -qE " x1[a-z][a-z0-9] "'

# fuzzy freeze by text (no need to know the id)
C freeze "7-char base62" --project demo >/dev/null
ok "fuzzy freeze worked (constraint)"  'C list --project demo | grep -qE "frozen.* c1[a-z][a-z0-9] "'

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
