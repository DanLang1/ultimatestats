---
name: code-review
description: Review uncommitted U-Stat changes for correctness, data integrity, and adherence to repository contracts. Use for code review, diff review, or a pre-handoff check on staged and unstaged working-tree changes. Treat AGENTS.md, docs/README.md, and the maintained domain docs as authoritative; gate new patterns on evidence and keep review findings separate from behavior changes.
---

# Code Review

Review against repository contracts first, taste second.

## Orient

1. Read `AGENTS.md` and `docs/README.md`, and the domain docs it routes to for the affected code.
2. Review the staged and unstaged working-tree changes with `git diff` and `git diff --cached`, not
   just the summary. Inspect the target, its closest tests, and maintained siblings before finding.
3. Treat exported types and tested implementation as authoritative if prose disagrees.

## Check against the repository contracts

- Don't run the checks like tests, formatting, etc just for the sake of it. At this point we can assume it's in a clean state. If needed, run tests to verify concerns or output as needed, but the base check run should already be good by this point.
- Derive render and selector state instead of mirroring it through `useEffect`. Extract substantial
  effects into focused hooks.
- Prefer exported, named types for reusable domain concepts across storage, analytics, state, and
  UI boundaries. Flag indexed-access types used as a substitute for a named domain type.
- Use semantic palette tokens from `theme/theme.ts`; no `themeMode` styling branches.
- Put app-wide limits in `lib/constants.ts`.
- Persistence: `persist` with `createJSONStorage(() => AsyncStorage)`; `onRehydrateStorage` for
  record migrations; one collection with a current-record pointer (no parallel `currentX`/`savedXs`
  copies); schema version on persisted domain records; Immer for nested updates.
- Await persistence before dismissing, navigating, resetting, or invalidating saved state.
- Prefer throwing or returning early over silently passing invalid or odd fallbacks through code.
- Trust the data we own; flag noisy or unnecessary fallbacks on data known to never be null.
- Follow `docs/ui-patterns.md`, `docs/navigation-map.md`, and `docs/responsive-layout.md`.
- Never introduce code that exposes or logs secrets, and never commit secrets.

## Watch for overcomplication

Review the smallest behavior-preserving change that satisfies the requirement.

- abstraction and indirection added before a second real use (wrapper hooks, generic helpers,
  configurable props, factories) where the concrete version would do;
- premature generalization: speculative parameters, "future-proofing" branches, or generics the code
  does not yet exercise;
- new parallel components or utilities when an established one satisfies the requirement;
- effects, `useMemo`/`useCallback`, or state mirrors that a derivation or event handler would replace;
- defensive null-checking and fallbacks on data the code owns and can never be null;
- scattered inline logic that a focused helper or hook would clarify without coupling;
- multi-clause inline conditions (JSX guards, ternaries) that a named derived variable would make
  self-documenting — prefer a function only when the logic is parameterized or reused across
  sites; do not demand extraction of trivial single conditions;
- larger control flow than needed, such as unnecessary state-machine fields or deep conditionals.

Do not demand simplification merely to reduce line count or to match a personal preference. For a
focused simplification, review with `$code-simplification`; follow its new-pattern gate before
recommending a replacement.

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
