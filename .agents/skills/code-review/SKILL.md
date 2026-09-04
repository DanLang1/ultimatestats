---
name: code-review
description: Review staged and unstaged U-Stat changes for correctness, data integrity, security, and repository-contract violations. Use for broad diff review or a pre-handoff check. For a focused readability or behavior-preserving refactor review, use code-simplification instead.
---

# Code Review

Review against repository contracts first, taste second.

## Orient

1. Read `AGENTS.md` and `docs/README.md`, and the domain docs it routes to for the affected code.
2. Review the staged and unstaged working-tree changes with `git diff` and `git diff --cached`, not
   just the summary. Inspect the target, its closest tests, and maintained siblings before finding.
3. Exported types and tests describe current implemented behavior; `AGENTS.md` and maintained domain
   docs describe intended contracts. If they disagree, report the inconsistency instead of silently
   choosing one source.

## Check against the repository contracts

- Don't run the checks like tests, formatting, etc just for the sake of it. At this point we can assume it's in a clean state. If needed, run tests to verify concerns or output as needed, but the base check run should already be good by this point.
- Apply the global engineering and persistence rules in `AGENTS.md`.
- Check domain invariants, state ownership, persistence boundaries, migrations, side-effect ordering,
  navigation, and platform-specific behavior against the relevant maintained docs.
- Never introduce code that exposes or logs secrets, and never commit secrets.

## Watch for overcomplication

Flag complexity only when it creates a concrete correctness or maintainability risk. Use
`$code-simplification` for a dedicated readability or behavior-preserving cleanup review.

- abstraction and indirection added before a second real use (wrapper hooks, generic helpers,
  configurable props, factories) where the concrete version would do;
- premature generalization: speculative parameters, "future-proofing" branches, or generics the code
  does not yet exercise;
- new parallel components or utilities when an established one satisfies the requirement;
- effects, memoization, or state mirrors that add observable synchronization risk;
- defensive fallbacks that hide invalid owned data;
- scattered or deeply nested logic that makes a changed domain invariant difficult to verify;
- larger control flow than needed, such as unnecessary state-machine fields or deep conditionals.

Do not demand simplification merely to reduce line count or to match a personal preference.

## Verify before finding

- Confirm the behavior-preservation contract: inputs, outputs, error behavior, side-effect ordering,
  persistence and navigation boundaries, and platform-specific behavior.
- Cross-check every claim against the code and its tests. Do not flag a violation on the basis of a
  guess or a generic preference.
- For any change in `advancedTracking` surfaces, review with `$advanced-tracker-change-safety` and
  protect historical attribution, validation, and derived consumers.
- When a finding claims breakage and running the check is cheap, run `npm run check` to confirm.

## Severity

- `blocker`: correctness, data integrity, security, or a contract violation that ships a bug.
- `warning`: violates an established repository convention or creates a concrete maintainability cost
  (including premature abstraction or generalization).
- `nit`: style or naming that does not violate a documented convention.

## Report

- List each finding as `file:line`, severity, and one-line reasoning.
- Cite the convention (AGENTS.md or the relevant doc) when flagging a convention violation, and give
  the smallest suggested fix.
- Report only findings with evidence; do not restate every changed line.
- Order findings by behavior risk, then maintainability.
- Do not modify the code during a review unless the user asks. Deliver findings first.

Do not stage, unstage, or commit changes unless the user asks.
