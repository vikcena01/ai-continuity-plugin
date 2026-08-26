#!/usr/bin/env bash
# Asserts the claim-file schema contract (rk10gu): old state reads, newer state
# is REFUSED rather than silently half-parsed.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
export CONTINUITY_HOME="$TMP/projects"
C() { node "$ROOT/dist/cli.js" "$@"; }
CLAIMS="$TMP/projects/sc/claims"

pass=0; fail=0
ok() { if eval "$2"; then echo "  ok: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

C init "Schema demo" --project sc >/dev/null
C record-decision "A versioned decision" --project sc >/dev/null

# new writes stamp the version
ok "new claims are stamped"        'grep -qE "^schema: 1$" "$CLAIMS"/d1*.md'
ok "schema is the first field"     '[[ "$(sed -n 2p "$CLAIMS"/d1*.md)" == "schema: 1" ]]'

# a pre-versioning claim (no schema field) still reads: absent means 1
cat > "$CLAIMS/legacy1.md" <<'MD'
---
id: legacy1
type: decision
title: Written before versioning existed
status: accepted
confidence: confirmed
provenance:
  origin: manual
  created: '2026-01-01T00:00:00.000Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
---

no schema field at all
MD
ok "absent schema still reads"     'C list --project sc | grep -q "Written before versioning existed"'
ok "and surfaces in resume"        'C resume --project sc | grep -q "Written before versioning existed"'

# a claim from a NEWER build must be refused, loudly and by name
cat > "$CLAIMS/future1.md" <<'MD'
---
schema: 99
id: future1
type: decision
title: From a newer build
status: accepted
confidence: confirmed
provenance:
  origin: manual
  created: '2026-01-01T00:00:00.000Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
---

written by a build that knows a shape this one does not
MD
out="$(C list --project sc 2>&1; echo "rc=$?")"
ok "newer schema is refused"       'echo "$out" | grep -q "rc=1"'
ok "refusal names the file"        'echo "$out" | grep -q "future1.md"'
ok "refusal reports both versions" 'echo "$out" | grep -q "schema 99" && echo "$out" | grep -q "supports 1"'
ok "refusal says to upgrade"       'echo "$out" | grep -qi "upgrade"'
ok "it does NOT half-parse"        '! echo "$out" | grep -q "From a newer build"'
ok "resume refuses too"            'C resume --project sc 2>&1 | grep -qi "upgrade"'

# and the refusal is non-destructive
ok "offending file left untouched" 'grep -q "^schema: 99$" "$CLAIMS/future1.md"'
rm "$CLAIMS/future1.md"
ok "removing it restores service"  'C list --project sc | grep -q "A versioned decision"'

# explicit migrate stamps older files on disk
C migrate --project sc >/dev/null
ok "migrate stamps legacy claims"  'grep -qE "^schema: 1$" "$CLAIMS/legacy1.md"'
ok "migrate preserves the body"    'grep -q "no schema field at all" "$CLAIMS/legacy1.md"'
ok "migrate preserves provenance"  'grep -q "2026-01-01" "$CLAIMS/legacy1.md"'
ok "migrate is committed"          'C log --project sc | grep -q "migrate"'

echo ""
echo "schema: $pass passed, $fail failed"
rm -rf "$TMP"
[[ $fail -eq 0 ]]
