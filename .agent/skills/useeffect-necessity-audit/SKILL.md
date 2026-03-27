---
name: useeffect-necessity-audit
description: Audit React/React Native codebases for unnecessary useEffect usage and classify each effect as keep, refactor, or needs follow-up. Use when a user asks to review useEffect usage, apply "You Might Not Need an Effect" guidance, or reduce effect-driven state logic in TypeScript/JavaScript React files.
---

# useEffect Necessity Audit

Perform a repeatable repo-wide useEffect audit with clear keep/refactor decisions grounded in React guidance.

## Quick Start

1. Load the checklist: `references/effect-checklist.md`.
2. Enumerate all useEffect callsites:

```bash
scripts/list_useeffect_sites.sh
```

3. Open each file and classify each effect using the checklist.
4. Return a report with:

- Total callsites found
- Keep list (external sync, subscription, timer, imperative bridge)
- Refactor list (derivation, event handling, prop/state reset)
- Follow-up list (ambiguous cases with proposed rewrite)

## Review Workflow

1. Discover callsites

- Run `scripts/list_useeffect_sites.sh`.
- If `rg` is unavailable, use `grep -RIn`.

2. Classify each effect

- `keep`: synchronization with an external system (network, storage, timers, subscriptions, animations, DOM/native APIs, router side-effects).
- `refactor`: purely deriving state from props/store/state, handling user events, or resetting local state from prop changes when render-time adjustment or keyed subtree is better.
- `follow-up`: mixed responsibilities or unclear ownership.

3. Propose the smallest safe rewrite

- Move derivation into render or selector logic.
- Move event-triggered work into event handlers.
- Keep cleanup-critical effects in custom hooks.
- Avoid introducing `useMemo`/`useCallback` unless explicitly required by project rules.

4. Report precisely

- Include file references with line numbers.
- Keep findings ordered by severity: behavior risk first, style cleanup last.
- If no refactors are needed, state that explicitly.

## Output Template

Use this shape for consistency:

```md
useEffect Audit Result

- Total callsites: <n>
- Keep: <n>
- Refactor: <n>
- Follow-up: <n>

Keep

- path/to/file.tsx:line - reason

Refactor

- path/to/file.tsx:line - current pattern -> recommended rewrite

Follow-up

- path/to/file.tsx:line - ambiguity + next validation step
```

## Resources

- `references/effect-checklist.md`: decision rubric derived from React "You Might Not Need an Effect".
- `scripts/list_useeffect_sites.sh`: fast repo scan for useEffect imports and callsites.
