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

## P3 - Advanced Attribution Stat Registry

- Adding a per-player advanced stat (e.g. `pressure` → "Pressures") touches 13 source files plus
  `analytics-layer.md` and `stat-utils.md`. The stat's identity (field name, labels, CSV column,
  plus/minus weight, display group) is restated at every site instead of read from one place.
- Only three spots fail to compile. Adding an `AttributionType` alone produces no `tsc` errors.
  Adding the `AdvancedPlayerStats` field fails only in `createEmptyStats` (and test fixtures that
  build full stats objects); a team field fails only in the `computeAdvancedTeamStats` return
  object; a new `ImpactPartCode` fails in `PART_TO_FULL`. Every other site silently omits the stat:
  - `computeAdvancedPlayerStats`: the `sum(type)` assignment and the plus/minus formula.
  - `getImpactParts`: a second, hand-kept copy of the plus/minus weights. It must agree with the
    player-stats formula, and nothing checks that.
  - `playerSummaryCSV`: the header list and the cell list are parallel lists, so a column added to
    one and not the other shifts every later column. `teamStatsCSV` rows are hand-listed too.
  - `AdvancedStatsTable` columns and `LEGEND_LABELS_BY_KEY` (`Partial`),
    `AdvancedRelativeStatsSection` metrics, the `AdvancedPlayerStatsView` header stats,
    `AdvancedProfileDiamond` axes, `AdvancedPlayingTimeSection` per-point rates,
    `AdvancedEfficiencyCard`, and the `AdvancedImpactTimeline` legend text.
- `AdvancedPlayingTimeSection` lists Blocks per point but not Pressures; see the P4 entry below.
- Cleanup: add `ATTRIBUTION_STAT_SPECS` modeled on `THROW_RESULT_SPECS`:
  `as const satisfies Record<AttributionType, AttributionStatSpec>`, so a new `AttributionType`
  fails to compile until it has an entry. Candidate spec fields: `field` (the `AdvancedPlayerStats`
  key, or `null` for `disc_pickup`, which only feeds `totalTouches`), `label`/`singularLabel`,
  `shortLabel` (table header), `legendLabel`, `csvColumn`, `plusMinusWeight`, and `display`
  (table groups, relative-stats section, header card, or `null`). Name the derived types, e.g.
  `AttributionCountField`, and build the count part of `AdvancedPlayerStats` as
  `Record<AttributionCountField, number>`. Then `createEmptyStats`, the `sum` assignments, both
  plus/minus calculations, the legend, relative metrics, and header stats iterate the registry.
  Use `assertNever` defaults in any `switch` that stays over `AttributionType` or
  `AttributionStatDisplay`.
- Ordered lists need their own guard. Table group columns and CSV columns interleave registry stats
  with derived ones (`completionPct`, pull breakdown, throw types, timing). Keep them as explicit
  ordered lists typed by key, and add a test that every spec with a `csvColumn` / table group
  appears exactly once, or encode order as `Record<Key, { order }>` so a missing key fails to
  compile. Generate CSV header and cells from one column list (`{ header, value(p) }`) so they cannot
  drift.
- Stays bespoke: attribution emission in `buildAnalyticsGame` (already compile-guided by the
  `ThrowResult` switch), Callahan and 50/50 handling in `getImpactParts`, the `GA` merge,
  derived stats (`completionPct`, `totalTouches`, pull and throw-type stats, point stats), team
  totals counted from possession `turnoverType` (`totalBlocks`, `totalPressures`; could move to a
  `THROW_RESULT_SPECS` field instead), and the profile diamond's axis grouping.
- Risks: CSV column names and order and every existing UI label must stay byte-identical (CSV is a
  user-facing export). Pin them with snapshot assertions in `advancedCSVUtils.test.ts` and the
  table/view tests before refactoring. Plus/minus must still match per point and per game, including
  Callahans (credited through `goal` + `block`, not `callahan`) and 50/50 half weights.
- References:
  `lib/advancedTracking/analyticsTypes.ts` - `AttributionType`
  `lib/advancedTracking/types.ts` - `THROW_RESULT_SPECS` (pattern to follow)
  `lib/advancedTracking/statConstants.ts`
  `lib/advancedTracking/buildAnalyticsGame.ts` - `emitAttributions`
  `lib/advancedTracking/advancedPlayerStatsUtils.ts`
  `lib/advancedTracking/advancedImpactUtils.ts`
  `lib/advancedTracking/advancedTeamStatsUtils.ts`
  `lib/advancedTracking/advancedCSVUtils.ts` - `playerSummaryCSV`, `teamStatsCSV`
  `components/advancedTracking/AdvancedStatsTable.tsx`
  `components/advancedTracking/AdvancedRelativeStatsSection.tsx`
  `components/advancedTracking/AdvancedImpactTimeline.tsx`
  `components/advancedTracking/AdvancedProfileDiamond.tsx`
  `components/advancedTracking/AdvancedPlayingTimeSection.tsx`
  `components/advancedTracking/AdvancedEfficiencyCard.tsx`
  `components/advancedTracking/playerStats/AdvancedPlayerStatsView.tsx`
  `docs/features/advanced-tracking/analytics-layer.md`
  `docs/features/advanced-tracking/stat-utils.md`

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

## P3 - Duplicated Logic

- Extract shared hooks/components to eliminate duplication.
- References:
  `app/(main)/pre-game-confirm.tsx` + `app/(main)/advanced-tracking/pre-game-confirm.tsx` — identical card layouts
  `components/view-stats/ImpactTimeline.tsx` + `components/advancedTracking/AdvancedImpactTimeline.tsx` — duplicated impact chart layout, score label fitting, axis labels, step-path, and scale-mode logic; keep basic/advanced event formatting separate
  `store/basic/gameStore.types.ts` + `store/basic/gameStore.ts` — `addTurnoverEvent` parameter type defined inline in both

## P4 - Pressures per Point in Playing Time

- Quality-of-life: the player Playing Time section shows Blocks per point but not Pressures.
  Pressures are rare, so the gap is minor.
- Cleanup: add a Pressures row to `perPointStats`. The grid is three columns and currently six
  items, so a seventh leaves an uneven last row; decide the order and layout with it.
- References:
  `components/advancedTracking/AdvancedPlayingTimeSection.tsx` - `perPointStats`
