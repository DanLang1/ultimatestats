# Tech Debt Backlog

Last updated: July 16, 2026

This document tracks intentionally deferred cleanup work discovered during the docs/rules/workflow audit.

## P1 - Modal Navigation Consistency

- Replace `router.back()` / `router.dismiss()` in modal exits with `router.dismissTo(...)` per modal navigation rules.
- For modals launched from non-root screens, use explicit parent destinations (for example `router.dismissTo('/GameInfo')`).
- References:
  `docs/navigation-map.md` - Modal Exit Contract
  `app/(modals)/EditDurationModal.tsx:120`
  `app/(modals)/EditDurationModal.tsx:131`
  `app/(modals)/NumberPickerModal.tsx:51`
  `app/(modals)/NumberPickerModal.tsx:60`
  `app/(modals)/EditEventModal.tsx:208`
  `app/(modals)/EditEventModal.tsx:236`
  `app/(modals)/EditEventModal.tsx:245`

## P2 - `cancelPendingGoal` Does Not Re-derive Timeout State

- `undoLastAction` calls `deriveTimeoutState()` after every undo, correctly replaying events to reconstruct timeout availability. `cancelPendingGoal` does not.
- Impact: if team1 used a timeout in the first half, then scored the halftime goal (which resets timeouts via `fill(true)`), then canceled the stat entry — the used timeout is silently restored and available again.
- Fix: call `deriveTimeoutState` at the end of `cancelPendingGoal`, same as `undoLastAction`.
- References:
  `store/gameStore.ts:654` (`cancelPendingGoal` — missing `deriveTimeoutState` call)
  `store/gameStore.ts:287` (`undoLastAction` — correct pattern to follow)
  `store/gameStore.ts:368` (`undoLastAction` — derives timeout state)
  `lib/timeoutUtils.ts:19` (`deriveTimeoutState`)

## P2 - Modal Theming Token Alignment

- Align modal text/background token usage with modal theming guidance (`modalText`, `modalTextMuted`, etc.) where currently using banned tokens.
- References:
  `docs/ui-patterns.md` - Theming Pattern
  `app/(modals)/HalftimeModal.tsx:93`
  `app/(modals)/HalftimeModal.tsx:132`
  `app/(modals)/HalftimeModal.tsx:179`
  `app/(modals)/TimeoutModal.tsx:80`
  `app/(modals)/TimeoutModal.tsx:112`
  `app/(modals)/PointSummaryModal.tsx:171`
  `app/(modals)/PointSummaryModal.tsx:257`
  `app/(modals)/TeamManagementModal.tsx:61`
  `app/(modals)/GameSelectorModal.tsx:44`
  `app/(modals)/GameSelectorModal.tsx:138`
  `app/(modals)/EditDurationModal.tsx:375`
  `app/(modals)/EditEventModal.tsx:308`

## P2 - BottomSheet Modal Wrapper

- Several bottom-sheet callers manually wrap `BottomSheet` in a transparent React Native `Modal`. `BottomSheet` owns the overlay and sheet layout, but the caller-owned `Modal` is still needed today for native modal presentation and z-order.
- Cleanup: introduce a shared `BottomSheetModal` wrapper that owns `Modal`, `transparent`, `animationType`, `onRequestClose`, and the `BottomSheet` shell. Keep `BottomSheet` as the low-level layout primitive or fold it into the wrapper once all callers migrate.
- References:
  `components/ui/BottomSheet.tsx`
  `components/ui/ResponsiveHeaderActions.tsx`
  `components/advancedTracking/TrackerHomeMenu.tsx`
  `components/advancedTracking/TrackerRareMenu.tsx`
  `components/advancedTracking/TrackerLineChangeMenu.tsx`
  `components/new-game/NewGameSheet.tsx`

## P3 - Store Architecture Refactor

- `gameStore` is a god store spanning six concerns: live game state, timers, roster, game catalog, UI signals, and game config.
- Proposed split: `gameLibraryStore` (saved games/teams catalog), `gameConfigStore` (pre-game settings that survive reset), `timerStore` (all timer state), slimmed-down `liveGameStore`.
- No backwards-compat risk for saved game data — all state lives in a single Zustand persist key today, so store boundaries can be redrawn without touching the schema.
- References:
  `docs/future-features/store-refactor.md`
  `store/basic/gameStore.ts`
  `store/basic/gameStore.types.ts`

## P3 - gameStore Async Action Signatures

- Several store actions (`saveCurrentGame`, `deleteSavedGame`, `deleteSavedGames`, `saveCurrentTeam`, `importGame`, `importTeam`, `deleteTeam`, `updateSavedGame*`, `clearTournamentFromGames`) are typed as `Promise<void>` in `gameStore.types.ts` but no longer contain any async work — they just call Zustand `set()`.
- These were made async when they called `storage.*` methods. Now that Zustand persist owns all writes, the `async` keyword and `Promise` return types are misleading.
- Fix: remove `async` and update the type signatures in `gameStore.types.ts`. Callers that `await` them will continue to work but will no longer need to.
- References:
  `store/basic/gameStore.ts`
  `store/basic/gameStore.types.ts`

## P3 - Expo Router Naming and Feature Grouping

- Standardize route filenames to lowercase kebab-case for long-term consistency (for example `GameInfo.tsx` -> `game-info.tsx`) with a planned migration that preserves existing links during rollout.
- Consider splitting `app/(main)` into feature groups (`(game)`, `(stats)`, `(settings)`) as route count grows, while keeping current URL paths stable.
- References:
  `docs/navigation-map.md`
  `app/(main)/_layout.tsx`

### P3 - Duplicated Logic

- Extract shared hooks/components to eliminate duplication.
- References:
  `hooks/basic/useTimeoutTimer.ts` + `hooks/basic/useHalftimeTimer.ts` — nearly identical drift-proof countdown logic
  `app/(main)/GameComplete.tsx` + `app/(main)/advancedTracking/TrackerGameComplete.tsx` — similar post-game summary screens
  `app/(main)/PreGameConfirm.tsx` + `app/(main)/advancedTracking/PreGameConfirm.tsx` — identical card layouts
  `components/view-stats/ImpactTimeline.tsx` + `components/advancedTracking/AdvancedImpactTimeline.tsx` — duplicated impact chart layout, score label fitting, axis labels, step-path, and scale-mode logic; keep basic/advanced event formatting separate
  `components/lines/ModalPlayerGrid.tsx` + `lib/lineUtils.ts` — `ColumnKey` / `MIXED_COLUMN_LABELS` duplicates `GenderRoleGroup` / `GROUP_LABELS`
  `store/basic/gameStore.types.ts` + `store/basic/gameStore.ts` — `addTurnoverEvent` parameter type defined inline in both
