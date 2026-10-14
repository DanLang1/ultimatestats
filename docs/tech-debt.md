# Tech Debt Backlog

Last verified: Oct 14, 2026

This document tracks intentionally deferred cleanup work discovered during the docs/rules/workflow audit.

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

## P2 - Advanced Tracker Tablet Landscape Layout

- Tablet landscape stacks the portrait strips (cap bar, scorecard, last-action card, grid, footer)
  full width. Chrome takes most of the height, so chips are smaller than in portrait (~95pt iPad
  mini, ~120pt iPad Pro 13"), while the scorecard, card, and footer buttons stretch across empty
  width. Nine grid items in five columns leave a ragged second row. Phones are unaffected:
  `small` landscape shows `LandscapeUnsupported`.
- Proposed: a sidebar layout. The player grid takes the full height on the left in three columns;
  a ~300-360pt right column holds the cap bar, scorecard, last-action card, and a 2x2 action pad.
  This needs a separate landscape render path in the tracker screen (allowed when the UI differs
  per orientation), a 2x2 footer variant, and checks of the voice feedback pill, rare menu, and
  modals in the new position. Open question: fixed right sidebar or handedness-aware.
- Smaller interim option: put the scorecard and last-action card side by side in landscape to give
  the grid roughly 90-110pt more height.
- References:
  `app/(main)/advanced-tracking/tracker.tsx`
  `components/advancedTracking/TrackerActionFooter.tsx`
  `components/advancedTracking/TrackerPlayerGrid.tsx`
  `components/advancedTracking/TrackerScoreBar.tsx`
  `docs/responsive-layout.md`

## P3 - Size-Class Scaling Helper

- About 2,000 call sites spell out `scaleBySizeClass(x, sizeClass)` and ~220 spell out
  `getSizeClassValue(map, sizeClass)`, and every style factory threads `sizeClass` through.
- Cleanup: add a `useScale()` hook returning `s(x, options?)` bound to the current size class, with
  `s.pick(map)` and `s.sizeClass`; style factories take `s` instead of `sizeClass`. Same factors and
  rounding, so a file-by-file codemod has no visual change. Keep `scaleBySizeClass` for non-React
  code and tests. Keep `isCompactHeight` out of `s`; screens opt in to it explicitly.
- About 124 inline `getSizeClassValue({ small, medium, large }, sizeClass)` size tables in ~21 files
  hard-code the old 1.1/1.2 steps, so they no longer follow the global scale (now 1.21/1.5). Convert
  the ones that are really scaling to `scaleBySizeClass(smallValue)`; keep tables only for values
  that differ by design (layout widths, column counts, deliberate tablet jumps). Already converted:
  `LiveScoreboard`, `ScoreboardActionBar`, `SettingsBar`, `TeamScoreSection`, `ScreenHeader`,
  `ChemistryMap`, `AdvancedChemistryMap`, and `TutorialActionBar` (two design tables kept: the
  team score gap and settings bar icon padding).
- Avoid auto-scaling every numeric style value (needs exceptions for `flex`, `opacity`,
  `aspectRatio`, hairlines). Semantic spacing/type tokens could layer on later.
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
