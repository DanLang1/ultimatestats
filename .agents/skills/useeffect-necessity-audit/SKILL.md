---
name: useeffect-necessity-audit
description: Audit React and React Native useEffect usage in U-Stat and classify each effect as keep, refactor, or follow-up. Use for effect reviews, derived-state cleanup, React 'You Might Not Need an Effect' guidance, or reducing effect-driven state logic while preserving current project conventions.
---

# useEffect Necessity Audit

Audit effects against React synchronization semantics and U-Stat conventions.

## Workflow

1. Read `AGENTS.md` and
   [references/effect-checklist.md](references/effect-checklist.md).
2. Resolve this skill's directory, then enumerate callsites:

   ```bash
   bash <skill-dir>/scripts/list_useeffect_sites.sh <repo-root>
   ```

3. Discard matches that are only source-code strings or documentation examples, then open every real
   callsite and its surrounding hook/component. Count audited callsites, not raw text matches.
4. Classify each effect:
   - `keep`: synchronizes with an external system and has the required cleanup or lifecycle behavior;
   - `refactor`: derives render state, handles a direct user event, or mirrors React/store state;
   - `follow-up`: mixes responsibilities or depends on ownership that is not yet clear.
5. Compare proposed rewrites with close siblings and current `advancedTracking` patterns.
6. Recommend the smallest behavior-preserving rewrite.

Do not remove an effect merely to reduce the count. Timers, subscriptions, native APIs, storage,
animations, and other external synchronization usually require effects or dedicated hooks.

## Convention gate

- Prefer render-time derivation, selectors, and event handlers.
- Extract substantial effects into focused custom hooks.
- Do not introduce `useMemo` or `useCallback` as a reflexive replacement.
- If current official React guidance conflicts with an established local pattern, alert the user
  with evidence and describe the migration scope instead of silently broadening the audit.

## Report

Include:

- total callsites;
- keep, refactor, and follow-up counts;
- file and line for each finding;
- one-line reasoning;
- the smallest safe rewrite or next validation step.

Order findings by behavior risk, then maintainability.
