# Tech Debt Backlog

Last updated: May 10, 2026

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
  `app/(modals)/StatEntryModal.tsx:69`
  `app/(modals)/StatEntryModal.tsx:79`
  `app/(modals)/StatEntryModal.tsx:86`

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
  `store/gameStore.ts`
  `store/gameStore.types.ts`

## P3 - gameStore Async Action Signatures

- Several store actions (`saveCurrentGame`, `deleteSavedGame`, `deleteSavedGames`, `saveCurrentTeam`, `importGame`, `importTeam`, `deleteTeam`, `updateSavedGame*`, `clearTournamentFromGames`) are typed as `Promise<void>` in `gameStore.types.ts` but no longer contain any async work — they just call Zustand `set()`.
- These were made async when they called `storage.*` methods. Now that Zustand persist owns all writes, the `async` keyword and `Promise` return types are misleading.
- Fix: remove `async` and update the type signatures in `gameStore.types.ts`. Callers that `await` them will continue to work but will no longer need to.
- References:
  `store/gameStore.ts`
  `store/gameStore.types.ts`

## P3 - Expo Router Naming and Feature Grouping

- Standardize route filenames to lowercase kebab-case for long-term consistency (for example `GameInfo.tsx` -> `game-info.tsx`) with a planned migration that preserves existing links during rollout.
- Consider splitting `app/(main)` into feature groups (`(game)`, `(stats)`, `(settings)`) as route count grows, while keeping current URL paths stable.
- References:
  `docs/navigation-map.md`
  `app/(main)/_layout.tsx`

## 5/10/26

### P2 - Dead / Unused Files

- Delete unused component and empty files.
- References:

  `components/game-info/TimeoutCounter.tsx`
  `components/ui/TeamDropdown.tsx`
  `components/view-stats/playing-time/ShiftTimeline.tsx`
  `components/ui/icon-symbol.tsx`
  `components/ui/icon-symbol.ios.tsx`

### P2 - Unused Exports

- Remove `export` keyword from functions/constants that are only used inside their own module (or not at all).
- References:
  `lib/colorUtils.ts:189` — `isValidHexColor`
  `lib/constants.ts:52` — `MODAL_MAX_WIDTH_COMPACT`
  `lib/playerUtils.ts:33` — `getPlayerById`
  `lib/playerUtils.ts:61` — `getPlayerByName`
  `lib/statsUtils.ts:666` — `getImpactGameMeta`
  `lib/advancedTracking/trackingUtils.ts:114` — `canRecordGoal`
  `lib/advancedTracking/trackingUtils.ts:186` — `getScoreThroughPoint`
  `lib/remoteVersionUtils.ts:24` — `getLastDismissedRemoteVersion`
  `lib/versionUtils.ts:16` — `getLastSeenVersion`
  `lib/versionUtils.ts:23` — `setLastSeenVersion`
  `store/settingsStore.ts:95` — `DEFAULT_FMP_COLOR`, `DEFAULT_MMP_COLOR`
  `lib/halftimeUtils.ts:4` — `inferHalftimeGoalEventIndex`
  `components/lines/DraggablePresetItem.tsx:21` — `ROW_HEIGHT`
  `hooks/useLayout.ts:6` — `SIZE_CLASS_SCALE`

### P2 - Unused Props and Parameters

- Remove destructured props and function parameters that are never read.
- References:
  `components/advancedTracking/TrackerBottomCard.tsx:81` — `pointElapsedMs`
  `components/advancedTracking/TrackerBottomCard.tsx:84` — `onStartNextPoint`
  `app/(main)/Import.tsx:52` — `isUpdate` in `handleImportGame`
  `components/tutorial/useTutorialStatGameState.ts:188` — `playerId` in `handleSelectBlocker`
  `components/tutorial/useTutorialStatGameState.ts:215` — `playerId` in `handleSelectAssist`
  `app/(main)/(hub)/(analytics)/AggregateStats.tsx:312` — `sizeClass` in `createStyles`
  `app/(main)/(hub)/(analytics)/SavedGameStats.tsx:216` — `sizeClass` in `createStyles`
  `app/(main)/(hub)/(team)/EditRoster.tsx:702` — `isLandscape` in `createStyles`
  `components/advancedTracking/AdvancedStatsTable.tsx:338` — `isLandscape` in `createStyles`

### P2 - Commented-Out Dead Code

- Remove commented-out blocks and `console.log` calls from tests.
- References:
  `lib/__tests__/sharingPayloadSize.test.ts:137-157`
  `lib/api/importTeamApi.ts:4`

### P3 - Duplicated Logic

- Extract shared hooks/components to eliminate duplication.
- References:
  `hooks/useTimeoutTimer.ts` + `hooks/useHalftimeTimer.ts` — nearly identical drift-proof countdown logic
  `app/(main)/GameComplete.tsx` + `app/(main)/advancedTracking/TrackerGameComplete.tsx` — similar post-game summary screens
  `app/(main)/PreGameConfirm.tsx` + `app/(main)/advancedTracking/PreGameConfirm.tsx` — identical card layouts
  `components/view-stats/ImpactTimeline.tsx` + `components/advancedTracking/AdvancedImpactTimeline.tsx` — duplicated impact chart layout, score label fitting, axis labels, step-path, and scale-mode logic; keep basic/advanced event formatting separate
  `components/lines/ModalPlayerGrid.tsx` + `lib/lineUtils.ts` — `ColumnKey` / `MIXED_COLUMN_LABELS` duplicates `GenderRoleGroup` / `GROUP_LABELS`
  `store/gameStore.types.ts` + `store/gameStore.ts` — `addTurnoverEvent` parameter type defined inline in both

## Resolved (2026-03-28)

### Storage Adapter Removal

- Deleted `asyncStorageAdapter.ts` and the manual read/write pattern it backed. All persistence now goes through Zustand `persist` middleware, which writes automatically on every `set()`. Saves, deletes, and imports are all optimistic state updates — no more `storage.saveGame()` + `storage.loadGames()` pairs.
- Quarantine logic and `LegacyGamesDevModal` were removed as part of this cleanup. Malformed entries are now skipped with a `console.error` during rehydration; no recovery UX was ever shipped so nothing was lost.
- The `GameStorage`, `TeamStorage`, `TournamentStorage`, and `Storage` interfaces in `lib/storage/types.ts` were dead after the adapter was removed and have been deleted.

## Resolved (2026-03-14)

### Documentation Hygiene

- Refresh `docs/responsive-layout.md` migration list to remove files already migrated.
- Add `docs/build/development-build.md` to the documentation runbook index.
- Consider adding `docs/responsive-layout.md` to quick links in `docs/README.md`.
