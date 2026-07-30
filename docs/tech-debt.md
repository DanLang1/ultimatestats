# Tech Debt Backlog

Last verified: July 30, 2026

This document tracks intentionally deferred cleanup work discovered during the docs/rules/workflow audit.

## P1 - Modal Navigation Consistency

- Replace `router.back()` / `router.dismiss()` in modal exits with `router.dismissTo(...)` per modal navigation rules.
- For modals launched from non-root screens, use explicit parent destinations (for example `router.dismissTo('/GameInfo')`).
- References:
  `docs/navigation-map.md` - Modal Exit Contract
  `app/(modals)/EditDurationModal.tsx`
  `app/(modals)/NumberPickerModal.tsx`
  `app/(modals)/EditEventModal.tsx`
  `app/(modals)/AdvancedGameSelectorModal.tsx`

## P2 - `cancelPendingGoal` Does Not Re-derive Timeout State

- `undoLastAction` calls `deriveTimeoutState()` after every undo, correctly replaying events to reconstruct timeout availability. `cancelPendingGoal` does not.
- Impact: if team1 used a timeout in the first half, then scored the halftime goal (which resets timeouts via `fill(true)`), then canceled the stat entry — the used timeout is silently restored and available again.
- Fix: call `deriveTimeoutState` at the end of `cancelPendingGoal`, same as `undoLastAction`.
- References:
  `store/basic/gameStore.ts` (`cancelPendingGoal` and `undoLastAction`)
  `lib/basic/timeoutUtils.ts` (`deriveTimeoutState`)

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
- Start with the proven ownership seams: shared team/roster state first, then evaluate basic
  saved-game persistence alongside the SQLite proposal. Reassess the remaining store before
  extracting config or timers.
- Store boundaries can be redrawn without changing the `SavedGame` record shape, but moving
  persisted ownership still requires a deliberate storage migration and hydration plan.
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

## P3 - Expo Router Naming

- Standardize route filenames to lowercase kebab-case for long-term consistency (for example `GameInfo.tsx` -> `game-info.tsx`) with a planned migration that preserves existing links during rollout.
- Hub routes are now grouped by home, game, analytics, and team. Remaining top-level basic,
  tutorial, settings, import, and advanced routes should move only when there is a concrete
  navigation benefit.
- References:
  `docs/navigation-map.md`
  `app/(main)/_layout.tsx`
  `app/(main)/(hub)/`

## P3 - Duplicated Logic

- Extract shared hooks/components to eliminate duplication.
- References:
  `hooks/basic/useTimeoutTimer.ts` + `hooks/basic/useHalftimeTimer.ts` — nearly identical drift-proof countdown logic
  `app/(main)/GameComplete.tsx` + `app/(main)/advancedTracking/TrackerGameComplete.tsx` — similar post-game summary screens
  `app/(main)/PreGameConfirm.tsx` + `app/(main)/advancedTracking/PreGameConfirm.tsx` — identical card layouts
  `components/view-stats/ImpactTimeline.tsx` + `components/advancedTracking/AdvancedImpactTimeline.tsx` — duplicated impact chart layout, score label fitting, axis labels, step-path, and scale-mode logic; keep basic/advanced event formatting separate
  `components/lines/ModalPlayerGrid.tsx` + `lib/lineUtils.ts` — `ColumnKey` / `MIXED_COLUMN_LABELS` duplicates `GenderRoleGroup` / `GROUP_LABELS`
  `store/basic/gameStore.types.ts` + `store/basic/gameStore.ts` — `addTurnoverEvent` parameter type defined inline in both
