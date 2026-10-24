# Tech Debt Backlog

Last verified: Oct 14, 2026

This document tracks intentionally deferred cleanup work discovered during the docs/rules/workflow audit.

Entries describe only outstanding work. When an entry is resolved, delete it entirely; do not
rewrite it as a record of what changed (git history covers that). If part of an entry remains,
rewrite it to describe only the remaining problem as it exists now.

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

## P3 - Share Schema Version Stamping

- Any advanced schema bump (e.g. a new `ThrowResult`) blocks sharing every advanced game to older
  clients, even games that contain none of the new content.
- Cleanup: stamp exports with the minimum schema version their content needs.
- References:
  `lib/sharing/serialize.ts`
  `lib/sharing/validate.ts`

## P3 - Advanced Tracker Tablet Landscape Polish

- Tablet landscape puts the scorecard and last-action card side by side in one header row above a
  five-column grid. Undo and More sit in the top-right corner, outside thumb reach when the tablet
  is held by its sides. If that grip turns out to be common, move Undo and More into the ends of
  the footer row in landscape (it has spare width) and hide them on the card.
- A sidebar layout (grid full height on the left, chrome in a right column) was built and rejected:
  it lost the portrait look and left dead space in the sidebar. Do not retry it.
- References:
  `app/(main)/advanced-tracking/tracker.tsx`
  `components/advancedTracking/bottomCard/LastActionCardFrame.tsx`
  `components/advancedTracking/TrackerActionFooter.tsx`

## P3 - Basic Timeout Modal

- The timeout modal labels the calling team "Team 1" / "Team 2" instead of the team names
  (hard-coded from the last timeout event's `team1`/`team2`).
- Consider rebuilding it as a bottom sheet so it matches the other in-game sheets; fix the label as
  part of that.
- References:
  `app/(modals)/timeout-modal.tsx`

## P3 - Size-Class Scaling Helper

- About 2,000 call sites spell out `scaleBySizeClass(x, sizeClass)` and ~220 spell out
  `getSizeClassValue(map, sizeClass)`, and every style factory threads `sizeClass` through.
- Cleanup: add a `useScale()` hook returning `s(x, options?)` bound to the current size class, with
  `s.pick(map)` and `s.sizeClass`; style factories take `s` instead of `sizeClass`. Same factors and
  rounding, so a file-by-file codemod has no visual change. Keep `scaleBySizeClass` for non-React
  code and tests. Keep `isCompactHeight` out of `s`; screens opt in to it explicitly.
- Avoid auto-scaling every numeric style value (needs exceptions for `flex`, `opacity`,
  `aspectRatio`, hairlines). Semantic spacing/type tokens could layer on later.
- Decide during the migration whether text should scale by size class at all. Platform guidance
  (Apple HIG, Material 3) and large open-source React Native apps keep type sizes fixed across
  devices, rely on the user's system text size, and use tablet space for layout instead. Option:
  type at 1x on reading screens; in-game screens (advanced tracker, basic scoreboard) size text from
  available space; spacing and touch targets may still scale. A 1.5x global scale was tried and
  reverted (too large on reading screens).
- References:
  `hooks/useLayout.ts`
  `docs/responsive-layout.md`

## P3 - Lower Advanced Games Import Limit to Match Share Cap

- Sharing allows at most `MAX_SHARE_ADVANCED_GAMES` (4) advanced games per link, but import still
  accepts 10 so links created before the cap keep working.
- Shared payloads are purged from Supabase after 30 days. Not before ~30 days after the release that
  ships the share cap, lower the `advanced-games` import limit to 4.
- `validate.ts` uses one `MAX_BULK_GAMES` for both `games` and `advanced-games`; split it so
  basic imports stay at 10. Update `lib/__tests__/validatePayload.test.ts` and
  `docs/features/sharing.md` with the change.
- References:
  `lib/sharing/validate.ts`
  `lib/constants.ts`
  `docs/features/sharing.md` - Validation and Limits

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

## P3 - Advanced Tracking Store Pure Mutations

- The record and correction actions in `trackingStore.ts` still edit the game inline: pushing
  points, possessions, and actions, lazily creating optional arrays (`gameTransitions`,
  `transitionsAfter`, `revivalPauses`, `subs`), and collapsing emptied arrays back to `undefined`.
  `updatedAt` is stamped at about 20 sites, and actions read the game with `getCurrentGame(get())`
  to validate, then again with `getCurrentGame(state)` to mutate.
- Cleanup: move the edits into pure mutators in `gameMutations.ts` (which already holds
  `removeActionById` and `removeSubsForStoppages`) and add one live-game mutation helper that stamps
  `updatedAt`. The store keeps IDs, time, the undo stack, and persistence.
- References:
  `store/advancedTracking/trackingStore.ts`
  `lib/advancedTracking/gameMutations.ts`

## P3 - Shared Tracker Command Preconditions

- `lib/advancedTracking/trackerCommands.ts` owns the command rules, but some consumers still
  restate them. `useTrackerHandlers` guards captures on holder and point state itself, and
  `recordVoicePass` in `useVoiceStatCommands` repeats the point-over and possession checks before
  calling the store.
- `TrackerSessionView` exposes newer availability through `commands`, while `canDropOpeningPull`,
  `canUseVoice`, and `canUseRareMenu` remain top-level fields with their own consumers.
- Live-play state is still re-derived in `tracker-injury-sub.tsx`, `tracker-edit-line.tsx`,
  `StoppageOverlay.tsx`, `TrackerCapBar.tsx`, and `pointClock.ts`. `getLivePlayState` callers pass three different sides
  to `holderFor` (session perspective side, `planCaptureIntent`, `canSetRedZone`), still
  unreconciled.
- Cleanup: route the remaining guards through the command functions, move the remaining session
  flags under `commands`, and read live-play state
  from `getLivePlayState`.
- References:
  `lib/advancedTracking/trackerCommands.ts`
  `lib/advancedTracking/trackerSessionView.ts`
  `lib/advancedTracking/livePlayState.ts`
  `hooks/advancedTracking/useTrackerHandlers.ts`
  `hooks/advancedTracking/useVoiceStatCommands.ts`

## P3 - Split trackingDisplayHelpers by Concept

- `trackingDisplayHelpers.ts` (~670 lines) is mostly domain queries the store depends on, not
  display code. Lineup rules are duplicated: "apply a sub" (remove `outIds`, add `inIds`) in 4
  places and "base line plus sub-ins" in 3 (`trackingUtils.ts`, `advancedTouchCorrectionUtils.ts`,
  `advancedPointLineCorrectionUtils.ts`, `buildAnalyticsGame.ts`).
- Cleanup: extract `lineup.ts` (effective line at an action, before a sub, by side) and move the
  live-play queries (`getActiveSideId`, `getActiveStoppage`, `getActiveGameClockPause`,
  `getSafeDiscHolderRef`) into `livePlayState.ts`; leave labels and formatting behind.
- References:
  `lib/advancedTracking/trackingDisplayHelpers.ts`
  `lib/advancedTracking/trackingUtils.ts`

## P3 - Between-Point Stats Duplicate Team Stats

- `components/advancedTracking/betweenPointUtils.ts` is domain code in `components/`.
  `getLiveTeamStats` recomputes holds, breaks, and clean holds instead of using
  `computeAdvancedTeamStats`, which the halftime display already uses.
- On a D point without pull hang time, the second metric repeats "D efficiency" as "breaks"
  (`breaks/dPoints` twice). Left as-is for now.
- Cleanup: a `lib/advancedTracking` between-point summary built on `buildAnalyticsGame` +
  `computeAdvancedTeamStats`.
- References:
  `components/advancedTracking/betweenPointUtils.ts`
  `components/advancedTracking/BetweenPointDisplay.tsx`

## P3 - Advanced Display Label Tables

- Throw-result labels live in 4–6 tables with inconsistent opponent wording ("OPP D", "Opp Block",
  "Opponent Block"); throw-type labels are hard-coded 3 times; pass-modifier display (label, icon,
  prompt, tone) is split across 4 files and not `Record`-enforced; the neutral tone maps to three
  different colors.
- Cleanup: `satisfies Record<…>` display tables in `lib/advancedTracking` keyed by the domain unions,
  kept out of the semantic `*_SPECS` tables.
- References:
  `lib/advancedTracking/trackingDisplayHelpers.ts`
  `lib/advancedTracking/advancedTimelineUtils.ts`
  `components/advancedTracking/AdvancedTurnoverCorrectionModal.tsx`
  `components/advancedTracking/TrackerRareMenu.tsx`
  `components/advancedTracking/bottomCard/ModifierPrompt.tsx`

## P3 - Timeout Cancel and Undo Consistency

- Mid-point stoppages and between-point timeouts reverse in opposite ways. A running stoppage has a
  Cancel button (`cancelStoppage`) but is never on the undo stack, so once resumed it cannot be
  removed and Undo skips past it. A running between-point timeout has no Cancel (only End Timeout);
  after it ends, the between-point Undo removes it via its `between_point_timeout` entry.
- Investigate: whether the running between-point timeout should offer Cancel (likely
  `undoLastOperation`, since the timeout is the newest entry while it runs), and whether a resumed
  mid-point stoppage needs a removal path (e.g. from the timeline) given its attached injury subs
  and point-clock effects.
- References:
  `components/advancedTracking/BetweenPointDisplay.tsx`
  `components/advancedTracking/StoppageOverlay.tsx`
  `store/advancedTracking/trackingStore.ts`

## P3 - Advanced Screen Duplication and Prop Drilling

- The timeline route computes touch/turnover/line edit permissions inline and drills them with side
  context through `AdvancedEventTimeline` → `AdvancedTimelinePointCard` → `TimelineFlowRow`.
- The two-sided line-draft flow (side index, drafts, continuation menu, confirm/back) is copied in
  `tracker-injury-sub.tsx`, `AdvancedActiveLineCorrectionScreen.tsx`, and a variant in
  `tracker-line-select.tsx`.
- Cleanup: a lib query for timeline edit capabilities and a `useTwoSideLineDraft` hook.
- References:
  `app/(main)/(hub)/(analytics)/advanced-tracking/analytics/timeline/[gameId].tsx`
  `app/(main)/advanced-tracking/tracker-injury-sub.tsx`
  `components/advancedTracking/AdvancedActiveLineCorrectionScreen.tsx`

## P3 - Point Duration Display Rounding

- The live point timer floors seconds (`formatPointTime`) while the timeline and CSV round
  (`formatClockDuration`), so the same point can read 0:05 live and 0:06 in the timeline.
- Shared payloads include a few 1–3 point games whose points span 10 hours to 26 days (games left
  open and resumed later); they dominate those games' average point time. Consider flagging or
  capping implausible point durations if this appears in real games.
- References:
  `lib/advancedTracking/trackingDisplayHelpers.ts`
  `lib/durationFormatUtils.ts`

## P3 - Advanced Persistence Boundary

- The saved-game summary row is spelled out 5 times (`AdvancedGameSummary`, `SummaryRow`, DDL,
  `rowToSummary`, the positional INSERT), and stored summaries are never re-derived when
  `deriveAdvancedGameSummary` changes.
- `migrateAdvancedTrackedGame` is called at 7 sites; basic and advanced imports migrate in
  different layers.
- 8 persisted Zustand stores repeat the `persist` wiring with four migration styles.
- Boundary errors are inconsistent: corrupt `undo_json` silently becomes `[]`, fetch failures throw
  untyped errors while uploads have a typed taxonomy.
- References:
  `lib/advancedTracking/storage.ts`
  `lib/advancedTracking/summary.ts`
  `lib/sharing/serialize.ts`
  `lib/sharing/validate.ts`

## P3 - Duplicated Logic

- Extract shared hooks/components to eliminate duplication.
- References:
  `app/(main)/pre-game-confirm.tsx` + `app/(main)/advanced-tracking/pre-game-confirm.tsx` — identical card layouts
  `components/view-stats/ImpactTimeline.tsx` + `components/advancedTracking/AdvancedImpactTimeline.tsx` — duplicated impact chart layout, score label fitting, axis labels, step-path, and scale-mode logic; keep basic/advanced event formatting separate
  `store/basic/gameStore.types.ts` + `store/basic/gameStore.ts` — `addTurnoverEvent` parameter type defined inline in both

## P4 - Basic Mode Known Design Debt

- Not planned while basic mode is stable; revisit if basic work resumes.
- `TurnoverType` has no spec table (labels, icons, toasts, stats re-derived across ~10 files); the
  basic impact chain uses display strings as data.
- Live and saved games have separate edit paths (`updateEvent` vs `updateSavedGameEvent`) with
  inconsistent mirroring; editing an event on a finished current game may not update its saved
  record (unconfirmed).
- `cancelPendingGoal` duplicates the goal branch of `undoLastAction` and has diverged (point timer
  and post-game flags; unconfirmed impact).
- Halftime, game-over, and soft-cap rules are implemented separately from advanced; share import
  does not validate basic events individually.
- References:
  `store/basic/gameStore.ts`
  `lib/basic/statsUtils.ts`
  `lib/sharing/validate.ts`
