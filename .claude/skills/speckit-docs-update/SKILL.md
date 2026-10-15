---
name: 'speckit-docs-update'
description: 'Review and selectively update README files and user documentation affected by the just-implemented Speckit tasks.'
argument-hint: 'Optional: a specific doc file or directory to focus on'
compatibility: 'Requires spec-kit project structure with .specify/ directory'
metadata:
  author: 'project-local'
  source: 'not part of upstream github-spec-kit — added to keep project README files and user docs in sync after each implementation cycle'
user-invocable: true
disable-model-invocation: false
---

## Purpose

After `speckit-implement` finishes, source code has changed but documentation often hasn't. This skill determines which documentation files are actually affected by the implementation changes, and updates only those — never doing a full rewrite, never touching unaffected files.

Documentation in scope:

- `/README.md` — project root (reflects overall feature set, architecture overview, setup)
- `/README.de.md` — German translation of the root README (keep in sync with `/README.md`)
- `/libs/*/README.md` — per-library READMEs (API surface, usage examples)
- `/apps/*/README.md` — per-app READMEs (if they exist)
- `/docs/user-guide.md` — English user guide (covers all user-visible screens and workflows)
- `/docs/user-guide.de.md` — German user guide (mirror of the English guide; update both together)
- `/docs/how-to-play.md` — English player rules explanation
- `/docs/how-to-play.de.md` — German player rules explanation (mirror; update both together)
- `/docs/**/*.md` — other user documentation (e.g. `docs/migration.md`, `docs/rules.md`)

## User Input

```text
$ARGUMENTS
```

If given, restrict the scope to that file or directory. Otherwise run the full scope.

## Execution

### 1. Determine Changed Source Files

**If `$ARGUMENTS` contains `--all`** (baseline audit mode): skip the git diff. Treat every file under `libs/`, `apps/`, and `src/` as "changed" — i.e. check all docs against the full current source. Use this once to establish an initial accurate baseline.

**Otherwise** (normal mode): get the list of files changed on this branch vs. main:

```bash
git diff --name-only origin/main...HEAD
```

### 2. Build the Impact Map

For each doc file in scope, decide whether the implementation touches it:

| Doc file                  | Affected when…                                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/libs/<name>/README.md`  | Any file under `libs/<name>/src/` changed, OR the lib's `package.json`/`project.json` changed                                                                                 |
| `/apps/<name>/README.md`  | Any file under `apps/<name>/src/` changed                                                                                                                                     |
| `/README.md` (root)       | A new lib or app was added/removed; a major public API surface changed; a new end-user feature is described in the spec (`spec.md`)                                           |
| `/README.de.md`           | Same triggers as `/README.md` — always update both language versions together; the German README is a translation of the English one                                          |
| `/docs/user-guide.md`     | Any user-visible screen, form field, or workflow was added, changed, or removed — check `spec.md` for user-facing scope; when in doubt, check                                 |
| `/docs/user-guide.de.md`  | Same triggers as `/docs/user-guide.md` — always update both language versions together                                                                                        |
| `/docs/how-to-play.md`    | Game rules or card effects changed in `libs/game-rules` or `docs/rules.md`                                                                                                    |
| `/docs/how-to-play.de.md` | Same triggers as `/docs/how-to-play.md` — always update both language versions together                                                                                       |
| `/docs/**/*.md`           | Read the doc file's content and check if any changed source files relate to the topic it covers (e.g. `docs/rules.md` is affected if game rules in `libs/game-rules` changed) |

Only proceed with docs whose impact check is positive. If no docs are affected, report that and stop — do not edit anything.

### 3. For Each Affected Doc: Assess and Update

For each affected doc file:

1. **Read the current doc** in full.
2. **Read the relevant changed source files** (the ones that triggered the impact).
3. **Identify the delta**: What specifically changed that the doc should reflect? New exports, changed function signatures, new features, removed APIs, new UI texts (language pairs: `README`, `README.de`, `user-guide`, `user-guide.de`), etc.
4. **Edit only the affected section(s)** — do not rewrite the whole file. Prefer targeted edits over full rewrites. If a section is missing entirely and should be added, add it; if a section is now stale, update it.
5. **Preserve style and tone** of the existing doc.

Do not add boilerplate, do not add sections "for future reference", do not pad.

### 4. Report

After processing all affected docs, summarize:

- Which docs were updated and what changed (one line each)
- Which docs were checked but not changed, and why
- If nothing was updated, say so plainly

## Done When

- [ ] All docs in scope checked against the change set
- [ ] Only affected docs edited, with targeted section-level changes
- [ ] No doc touched unless there is a concrete change to reflect
- [ ] Summary reported to user
