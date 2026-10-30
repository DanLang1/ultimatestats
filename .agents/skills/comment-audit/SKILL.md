---
name: comment-audit
description: Audit U-Stat source comments and remove the ones that restate code, names, or types, without changing any code. Use for a weekly comment sweep, a comment cleanup after a feature, or when asked to audit, trim, or review comments. Reports wrong or stale comments, misleading names, and commented-out code for the user to decide on instead of editing them.
---

# Comment Audit

Comments say only what the code cannot. Restating comments are noise that agents copy as house
style. Interface comments are not required, and this audit never adds comments.

## Scope

Non-test `.ts`/`.tsx` files under `app/`, `components/`, `hooks/`, `lib/`, and `store/`. Default to
files changed in the last week (`git log --since="7 days ago" --name-only --format=`), unless the
user names paths or asks for a full sweep. If in-scope files have uncommitted changes, stop and
report them.

## Rubric

Read the code each comment describes, then:

- **Remove** comments that restate the next line, a name, or a type; `@param` lines that repeat the
  parameter name; JSX section labels (`{/* Header */}`); group labels and dividers that repeat the
  names below them (`// --- Styles ---`); and history notes that belong in git.
- **Trim** mixed blocks: delete the restating sentence and keep the rest verbatim.
- **Keep** intent, domain rules, constraints, ordering requirements, platform workarounds, and
  precision the name does not carry (units, what `null` means, fallback behavior). Also keep
  directives, `See docs/...` references, and TODOs. When in doubt, keep it.
- **Report, don't edit:** comments that contradict the code, misleading names a comment was covering
  for, and commented-out code.

## Guardrails

- Change no code: no renames, rewording, or new comments. Code is the source of truth.
- Afterward, confirm `git diff` adds no lines other than code lines that lost a trailing comment,
  then run `npm run check`.
- Do not commit, stash, checkout, or reset.

## Report

Lines removed by folder, check results, `report` items (file:line, what the code actually does,
proposed fix), and borderline comments kept.
