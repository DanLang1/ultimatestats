# Tech Debt Backlog

Last updated: February 22, 2026

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
  `app/LinePromptModal.tsx:88`
  `app/LinePromptModal.tsx:93`

## P1 - Responsive Pattern Completion

- Continue migration to `useLayout()` + `createStyles(...)` in remaining files that still use inline orientation branches for style values.
- Keep orientation logic centralized in style factories where practical. (Render-time branching for different UI sections is still fine when behavior differs by orientation.)
- References:
  `docs/responsive-layout.md:19`
  `docs/responsive-layout.md:99`
  `app/(modals)/LinePromptModal.tsx:122`
  `components/stat-entry/StatEntryInner.tsx:257`
  `components/turnover-entry/TurnoverEntryInner.tsx:300`
  `components/tutorial/StatsTrackingTutorial.tsx:177`
  `components/tutorial/TutorialOverlay.tsx:188`

## P2 - `cancelPendingGoal` Does Not Re-derive Timeout State

- `undoLastAction` calls `deriveTimeoutState()` after every undo, correctly replaying events to reconstruct timeout availability. `cancelPendingGoal` does not.
- Impact: if team1 used a timeout in the first half, then scored the halftime goal (which resets timeouts via `fill(true)`), then canceled the stat entry — the used timeout is silently restored and available again.
- Fix: call `deriveTimeoutState` at the end of `cancelPendingGoal`, same as `undoLastAction`.
- References:
  `store/gameStore.ts:573` (`cancelPendingGoal` — missing `deriveTimeoutState` call)
  `store/gameStore.ts:305` (`undoLastAction` — correct pattern to follow)
  `lib/timeoutUtils.ts:19` (`deriveTimeoutState`)

## P3 - Stale Break Timer State on App Crash/Kill

- `isHalftimeBreak`, `halftimeEndTime`, `halftimeTimeLeft`, `pendingTimeoutModal`, `timeoutEndTime`, and `timeoutTimeLeft` are all persisted via Zustand. If the app is killed during a halftime or timeout break, on restart the break modal reappears with stale timer values (`endTime` is in the past, `timeLeft` is whatever was last written).
- Impact: UX annoyance — broken timer display. User can dismiss the modal. No data corruption.
- Fix: on hydration, if `halftimeEndTime`/`timeoutEndTime` is in the past, clear the break state.
- References:
  `store/gameStore.ts:1069` (partialize — persisted break fields)

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
  `app/LinePromptModal.tsx:358`
  `app/PlayerStats.tsx:167`

## P2 - Timeline Tie Ordering for Equal `elapsedMs`

- `mergeTimelineEvents()` merges `turnovers` before `timeouts` and sorts only by `elapsedMs`. When timestamps tie, the comparator returns `0`, so display order falls back to merge order instead of raw event order.
- Impact: timeout/turnover rows can render out of chronological sequence for equal timestamps, and split separators in `EventTimeline` may attach to the wrong transition.
- Why ties happen: timeouts pause the point timer and record an `elapsedMs` snapshot; resume/undo reconstructs `currentPointStartTime` from that stored elapsed, making equal timestamps plausible for the next event.
- Fix: add a tie-break on raw `eventIndex` (available on both `DisplayTurnover` and `DisplayTimeout`) in `mergeTimelineEvents()`, plus a regression test for equal-`elapsedMs` timeout/turnover ordering.
- References:
  `lib/timelineUtils.ts:173`
  `lib/timelineUtils.ts:181`
  `components/timeline/EventTimeline.tsx:145`
  `components/timeline/EventTimeline.tsx:150`
  `store/gameStore.ts:252` (`undoLastAction` timeout resume)
  `store/gameStore.ts:653` (`togglePointTimerPause` resume path)
  `store/gameStore.ts:683` (`addTurnoverEvent` elapsed capture)
  `store/gameStore.ts:216` (`incrementScore` goal elapsed capture)

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
- No backwards-compat risk for saved game data — the storage adapter keys are independent of store boundaries.
- References:
  `docs/future-features/store-refactor.md`
  `store/gameStore.ts`
  `store/gameStore.types.ts`

## P3 - Expo Router Naming and Feature Grouping

- Standardize route filenames to lowercase kebab-case for long-term consistency (for example `GameInfo.tsx` -> `game-info.tsx`) with a planned migration that preserves existing links during rollout.
- Consider splitting `app/(main)` into feature groups (`(game)`, `(stats)`, `(settings)`) as route count grows, while keeping current URL paths stable.
- References:
  `docs/navigation-map.md`
  `app/(main)/_layout.tsx`
