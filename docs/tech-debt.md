# Tech Debt Backlog

Last updated: February 28, 2026

This document tracks intentionally deferred cleanup work discovered during the docs/rules/workflow audit.

## P1 - Modal Navigation Consistency

- Replace `router.back()` / `router.dismiss()` in modal exits with `router.dismissTo(...)` per modal navigation rules.
- For modals launched from non-root screens, use explicit parent destinations (for example `router.dismissTo('/GameInfo')`).
- References:
  `docs/modals.md:136`
  `docs/modals.md:146`
  `app/EditEventModal.tsx:183`
  `app/EditEventModal.tsx:211`
  `app/EditEventModal.tsx:220`
  `app/NumberPickerModal.tsx:46`
  `app/NumberPickerModal.tsx:52`
  `app/GameTimeline.tsx:86`

## P2 - `cancelPendingGoal` Does Not Re-derive Timeout State

- `undoLastAction` calls `deriveTimeoutState()` after every undo, correctly replaying events to reconstruct timeout availability. `cancelPendingGoal` does not.
- Impact: if team1 used a timeout in the first half, then scored the halftime goal (which resets timeouts via `fill(true)`), then canceled the stat entry — the used timeout is silently restored and available again.
- Fix: call `deriveTimeoutState` at the end of `cancelPendingGoal`, same as `undoLastAction`.
- References:
  `store/gameStore.ts:573` (`cancelPendingGoal` — missing `deriveTimeoutState` call)
  `store/gameStore.ts:305` (`undoLastAction` — correct pattern to follow)
  `lib/timeoutUtils.ts:19` (`deriveTimeoutState`)

## P2 - Modal Theming Token Alignment

- Align modal text/background token usage with modal theming guidance (`modalText`, `modalTextMuted`, etc.) where currently using banned tokens.
- References:
  `docs/modals.md:7`
  `docs/modals.md:20`
  `app/HalftimeModal.tsx:128`
  `app/HalftimeModal.tsx:136`
  `app/HalftimeModal.tsx:165`
  `app/PullPromptModal.tsx:95`
  `app/PullPromptModal.tsx:145`
  `app/GameTimeline.tsx:89`
  `app/GameTimeline.tsx:91`

## P2 - Remove Raw Color Literals

- Replace hardcoded color values with theme tokens.
- References:
  `AGENTS.md:92`
  `app/HalftimeModal.tsx:303`
  `app/PullPromptModal.tsx:328`
  `app/PullPromptModal.tsx:400`
  `app/(main)/LineEditor.tsx`
  `app/PlayerStats.tsx:167`

## P3 - Documentation Hygiene

- Refresh `docs/responsive-layout.md` migration list to remove files already migrated.
- Add `.agent/workflows/dev-build.md` to runbook index in `AGENTS.md`.
- Consider adding `docs/responsive-layout.md` to quick links in `docs/README.md`.
- References:
  `docs/responsive-layout.md:99`
  `AGENTS.md:143`
  `docs/README.md:69`

## P3 - Store Architecture Refactor

- `gameStore` is a god store spanning six concerns: live game state, timers, roster, game catalog, UI signals, and game config.
- Proposed split: `gameLibraryStore` (saved games/teams catalog), `gameConfigStore` (pre-game settings that survive reset), `timerStore` (all timer state), slimmed-down `liveGameStore`.
- Persistence responsibilities are also blurred today: Zustand persist is used for the live session, while the storage adapter separately owns the saved-games/saved-teams library, but `savedGames` and `savedTeams` are still persisted inside the Zustand snapshot as cached copies.
- Cleanup direction: keep Zustand persist focused on in-progress game/session state and let the storage adapter remain the only source of truth for saved-game and team catalogs.
- No backwards-compat risk for saved game data — the storage adapter keys are independent of store boundaries.
- References:
  `docs/future-features/store-refactor.md`
  `store/gameStore.ts`
  `store/gameStore.types.ts`
  `lib/storage/asyncStorageAdapter.ts`

## P3 - Quarantined Saved-Game Recovery UX

- Saved-game migration now quarantines malformed individual entries instead of failing the whole list load, but there is no user-facing recovery flow yet.
- Current behavior is effectively silent in production: bad entries disappear from the visible saved-games list while raw payloads are preserved under the quarantine storage key for debugging.
- Future handling should likely include a visible warning count plus basic actions such as retry after an app update, export raw payload, or delete the quarantined entry.
- References:
  `lib/storage/asyncStorageAdapter.ts`
  `components/dashboard/LegacyGamesDevModal.tsx`

## P3 - Stats Tutorial Trigger Consistency

- First-time stats onboarding currently only triggers from Settings. Enabling stat tracking from the pre-game screen bypasses that tutorial path.
- If multiple entry points for stat tracking remain, the first-enable tutorial check should be centralized so onboarding behavior stays consistent.
- References:
  `app/(main)/PreGameConfirm.tsx:283`
  `app/(main)/Settings.tsx:567`
  `store/tutorialStore.ts`

## P3 - Saved-Games Recovery Edge Cases

- Healthy saved-games loads do not clear the quarantine storage key, so dev tooling can report stale quarantine counts after the underlying data is fixed.
- `savedGames` is still persisted in the Zustand store, so corrupt storage can briefly show the last cached saved-games list until the real load fails and clears it.
- Both issues are low severity and mostly affect rare corruption scenarios or developer testing, so they can stay deferred unless they become noisy in practice.
- References:
  `lib/storage/asyncStorageAdapter.ts:103`
  `components/dashboard/LegacyGamesDevModal.tsx:153`
  `store/gameStore.ts:1146`
  `app/(main)/ViewStats.tsx:67`

## P3 - Expo Router Naming and Feature Grouping

- Standardize route filenames to lowercase kebab-case for long-term consistency (for example `GameInfo.tsx` -> `game-info.tsx`) with a planned migration that preserves existing links during rollout.
- Consider splitting `app/(main)` into feature groups (`(game)`, `(stats)`, `(settings)`) as route count grows, while keeping current URL paths stable.
- References:
  `docs/navigation-map.md`
  `app/(main)/_layout.tsx`
