# Current U-Stat Patterns

Use this map to find current examples quickly. Read only the files relevant to the requested change.

## Source priority

1. `AGENTS.md`
2. Current domain documentation
3. The target file and its nearest maintained siblings
4. Relevant advanced-tracking examples below
5. Older code elsewhere in the repository

If sources disagree, follow the higher-priority source. Do not copy an advanced implementation that
conflicts with a newer `AGENTS.md` rule or domain document.

## Current examples

| Concern                     | Examples                                                                                              | Pattern to evaluate                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Route orchestration         | `app/(main)/advancedTracking/Tracker.tsx`, `TrackerLineSelect.tsx`                                    | Declarative redirects, event-time navigation, derived route state, composition of focused components |
| Explicit UI state           | `components/advancedTracking/TrackerSurface.tsx`                                                      | Discriminated unions and exhaustive rendering instead of loosely related booleans                    |
| Interaction logic           | `hooks/advancedTracking/useTrackerHandlers.ts`                                                        | Focused hooks for substantial event behavior; guard clauses before mutations                         |
| Derived view data           | `components/advancedTracking/scoreBar/useScoreBarData.ts`                                             | Select store inputs and derive display state without effect-driven mirroring                         |
| Reusable tracker primitives | `TrackerChipBase.tsx`, `TrackerActionFooter.tsx`, `TrackerScoreBar.tsx`                               | Shared interaction semantics and visual language with small composed components                      |
| Responsive tracker layout   | `Tracker.tsx`, `TrackerPlayerGrid.tsx`, `TrackerLineScreen.tsx`                                       | `useLayout()`, size-class scaling, measured layout only where content requires it                    |
| Analytics composition       | `AdvancedStatsContent.tsx`, `AdvancedStatsTable.tsx`, `timeline/`                                     | Compute domain results outside visual primitives; compose scan-friendly sections                     |
| Domain and store types      | `lib/advancedTracking/types.ts`, `store/advancedTracking/trackingStore.types.ts`                      | Named shared concepts at domain boundaries; discriminated unions for state transitions               |
| Persistence boundary        | `store/advancedTracking/savedGamesStore.ts`, `lib/advancedTracking/storage.ts`                        | Async storage work behind explicit functions; await durable writes before invalidation               |
| Behavior verification       | `app/(main)/advancedTracking/__tests__/`, `components/advancedTracking/__tests__/`, `.maestro/tests/` | Focused route/component tests plus deterministic device flows                                        |

## Convention check

Before introducing a new pattern:

1. Search for an existing implementation of the same interaction or data flow.
2. Compare at least one close sibling and one advanced-tracking example when relevant.
3. Check whether the existing approach is required by a domain document.
4. Verify any claim that a pattern is deprecated or replaced against current official documentation.
5. Explain the reason and migration scope to the user before broadening the change.

Do not treat age alone as evidence that a pattern is wrong. Prefer consistency unless there is a
specific, verifiable benefit to changing it.
