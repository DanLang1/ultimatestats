# Tech Debt Backlog

Last updated: March 28, 2026

This document tracks intentionally deferred cleanup work discovered during the docs/rules/workflow audit.

## P1 - Modal Navigation Consistency

- Replace `router.back()` / `router.dismiss()` in modal exits with `router.dismissTo(...)` per modal navigation rules.
- For modals launched from non-root screens, use explicit parent destinations (for example `router.dismissTo('/GameInfo')`).
- References:
  `/add-modal` skill — Modal Navigation from Non-Root Screens section
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
  `/add-modal` skill — Modal Theming section
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

## P2 - Remove Raw Color Literals

- Replace hardcoded color values with theme tokens.
- References:
  `AGENTS.md:92`
  `app/(modals)/EditPlayerModal.tsx:161`
  `app/(modals)/HalftimeModal.tsx:78`
  `app/(modals)/HalftimeModal.tsx:353`
  `app/(modals)/TeamManagementModal.tsx:113`
  `app/(modals)/TimeoutModal.tsx:55`
  `app/(modals)/TimeoutModal.tsx:165`
  `app/(modals)/PointSummaryModal.tsx:281`
  `app/(main)/(hub)/(home)/Dashboard.tsx:297`
  `app/(main)/(hub)/(home)/Dashboard.tsx:319`
  `app/(main)/(hub)/(home)/Dashboard.tsx:361`
  `app/(main)/(hub)/(analytics)/PlayerStats.tsx:165`

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

## P3 - Stats Tutorial Trigger Consistency

- First-time stats onboarding currently only triggers from Settings. Enabling stat tracking from the pre-game screen bypasses that tutorial path.
- If multiple entry points for stat tracking remain, the first-enable tutorial check should be centralized so onboarding behavior stays consistent.
- References:
  `app/(main)/PreGameConfirm.tsx:305`
  `app/(main)/Settings.tsx:597`
  `app/(main)/Settings.tsx:598`
  `store/tutorialStore.ts`

## P3 - Manual Halftime Correction For Legacy Saved Games

- Legacy saved games are now normalized to a single persisted `triggeredHalftime` goal marker so timeline/stats replay can stay simple, but old soft-cap-adjusted games can still end up with an inferred halftime goal that is unknowable from the stored data alone.
- Future UX: show halftime in the saved-game timeline and allow the user to move the halftime marker to a different goal event. That would correct downstream possession-flip and timeout-reset replay without reintroducing special-case legacy halftime math throughout stats utilities.
- References:
  `lib/storage/migrations/v3_stamp_halftime.ts`
  `lib/timelineUtils.ts`
  `lib/timeoutUtils.ts`
  `store/gameStore.types.ts`

## P3 - Expo Router Naming and Feature Grouping

- Standardize route filenames to lowercase kebab-case for long-term consistency (for example `GameInfo.tsx` -> `game-info.tsx`) with a planned migration that preserves existing links during rollout.
- Consider splitting `app/(main)` into feature groups (`(game)`, `(stats)`, `(settings)`) as route count grows, while keeping current URL paths stable.
- References:
  `docs/navigation-map.md`
  `app/(main)/_layout.tsx`

## Resolved (2026-03-28)

### Storage Adapter Removal

- Deleted `asyncStorageAdapter.ts` and the manual read/write pattern it backed. All persistence now goes through Zustand `persist` middleware, which writes automatically on every `set()`. Saves, deletes, and imports are all optimistic state updates — no more `storage.saveGame()` + `storage.loadGames()` pairs.
- Quarantine logic and `LegacyGamesDevModal` were removed as part of this cleanup. Malformed entries are now skipped with a `console.error` during rehydration; no recovery UX was ever shipped so nothing was lost.
- The `GameStorage`, `TeamStorage`, `TournamentStorage`, and `Storage` interfaces in `lib/storage/types.ts` were dead after the adapter was removed and have been deleted.

## Resolved (2026-03-14)

### Documentation Hygiene

- Refresh `docs/responsive-layout.md` migration list to remove files already migrated.
- Add `.agent/workflows/dev-build.md` to runbook index in `AGENTS.md`.
- Consider adding `docs/responsive-layout.md` to quick links in `docs/README.md`.
