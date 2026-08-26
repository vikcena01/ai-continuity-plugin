---
schema: 1
id: c8ea
type: constraint
title: >-
  Claim bodies and commit messages are PUBLIC writing — never put personal
  infrastructure or third-party names in them
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T07:34:37.708Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  d28f6 made .continuity/ part of the published repo, which silently changed
  what capture is allowed to contain — but capture behaviour did not change with
  it, and four claims plus one commit subject leaked before anyone noticed.
  Autonomous capture writes this prose unsupervised, so the rule has to live
  where the next session will read it.
---

Do NOT write into a claim body or a commit message: local file paths that reveal a machine's layout (key files, home-directory contents), credential or key FILENAMES, account handles belonging to another identity, names of private repositories, or another project named as a design comparison. A commit subject is worse than a body: it shows in every log, on the repo page, and cannot be edited without rewriting history.

Write the reusable METHOD instead of the identifiers. The SSH diagnosis is the model: 'ask each key who it is with ssh -i <key> -o IdentitiesOnly=yes -T git@github.com and read the greeting — Hi owner/repo is a deploy key, Hi user is a user account' is more useful to a future session than any list of filenames, and it leaks nothing. Anything genuinely machine-specific is re-derivable from the method in seconds.

This is not about secrecy — none of what leaked was a credential. It is that a state layer people are invited to publish must be safe to publish by default, and the value of a claim is almost always the reasoning, never the local identifier.
