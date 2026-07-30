---
name: code-simplification
description: Simplify or review U-Stat code for clarity and maintainability without changing behavior. Use for focused refactors, readability reviews, duplication removal, complex control flow, or cleanup after a feature. Follow current repository conventions—especially maintained advanced-tracking patterns—and flag evidence-backed reasons before introducing a new abstraction or replacing an established pattern.
---

# Code Simplification

Make the smallest behavior-preserving change that improves comprehension.

## Establish the local convention

1. Read `AGENTS.md` and the domain docs for the code being changed.
2. Read the target, its tests, and close siblings.
3. When relevant, inspect the corresponding `advancedTracking` implementation because those folders
   contain many of the project's current patterns.
4. Use git history only when the reason for an unusual structure remains unclear.

Follow the closest current convention unless there is a concrete reason not to. Do not impose a
generic refactoring preference on a codebase-specific pattern.

## Preserve behavior

Before changing code, identify:

- inputs, outputs, and error behavior;
- side effects and their ordering;
- persistence and navigation boundaries;
- platform-specific behavior;
- tests that define the contract.

Do not modify tests merely to make a behavior-changing simplification pass.

## Favor these repository patterns

- Derive render and selector state instead of mirroring it through `useEffect`.
- Extract substantial synchronization into focused hooks.
- Use guard clauses and named helpers when they reduce control-flow nesting.
- Prefer exported, named types for reusable domain concepts across storage, analytics, state, and UI
  boundaries.
- Keep domain calculations in `lib/`, reusable interaction logic in hooks/components, and route files
  focused on route composition.
- Use semantic theme tokens and existing responsive helpers.
- Use Immer for nested Zustand mutations and simple immutable partial updates where Immer is
  unnecessary.
- Reuse established components and utilities before creating parallel abstractions.

## New-pattern gate

Recommend replacing an established pattern only when:

- current official documentation deprecates or materially changes it;
- the current approach causes a verified bug, accessibility issue, performance issue, or recurring
  maintenance cost;
- an approved new library or platform capability provides a clear project-relevant benefit;
- the existing pattern cannot satisfy the requested behavior.

Alert the user with the evidence, compatibility impact, and likely migration scope. Keep a broader
migration separate unless it is necessary for the requested refactor.

## Work incrementally

1. Keep the change within the requested scope.
2. Apply one coherent simplification at a time.
3. Run the smallest relevant test after risky steps.
4. Remove newly dead imports and branches.
5. Compare the final code with its maintained siblings.
6. Run `npm run check`, and use `npm run check:all` when the risk warrants it.

Do not stage, commit, push, split a PR, or create a PR unless the user asks.
