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

## P3 - Advanced Tracker Undo Module

- Undo inverses live in one `undoLastOperation` switch in the tracking store, away from the actions
  that record each entry. A new undoable operation touches the entry type, the recording action,
  and the switch.
- `undoStack = []` is repeated in each active-game lifecycle action (create, reset, finalize,
  finish, import, delete).
- UI and utils read `undoStack.at(-1)` to answer gameplay questions (`canStartSecondHalfEarly`,
  point-ending undo in `TrackerLastActionCard`, standalone undo in the between-point displays).
- Live corrections (`correctCurrentTouch`, `correctCurrentTurnover`, line corrections) rewrite the
  game without touching the stack, whose entries reference actions by ID. Confirm whether a
  correction can leave an entry pointing at a removed or reshaped action.
- Cleanup: move inverses into a pure `lib/advancedTracking` module with one exhaustive handler per
  entry kind; route active-game changes through one helper that resets the stack; replace raw
  stack peeks with named queries. Keep the stack in the tracking store: game and stack must update
  and persist together as one snapshot. Keep semantic entries rather than snapshots or Immer
  patches, since undo applies domain rules (revival pauses, possession cleanup, halftime
  rederivation) rather than a pure revert.
- References:
  `store/advancedTracking/trackingStore.ts`
  `lib/advancedTracking/persistenceTypes.ts`
  `lib/advancedTracking/trackingUtils.ts`
  `components/advancedTracking/TrackerLastActionCard.tsx`
  `components/advancedTracking/BetweenPointDisplay.tsx`
  `components/advancedTracking/HalftimeBetweenPointDisplay.tsx`

## P3 - Duplicated Logic

- Extract shared hooks/components to eliminate duplication.
- References:
  `app/(main)/pre-game-confirm.tsx` + `app/(main)/advanced-tracking/pre-game-confirm.tsx` — identical card layouts
  `components/view-stats/ImpactTimeline.tsx` + `components/advancedTracking/AdvancedImpactTimeline.tsx` — duplicated impact chart layout, score label fitting, axis labels, step-path, and scale-mode logic; keep basic/advanced event formatting separate
  `store/basic/gameStore.types.ts` + `store/basic/gameStore.ts` — `addTurnoverEvent` parameter type defined inline in both
