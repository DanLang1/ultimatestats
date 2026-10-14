# Tech Debt Backlog

Last verified: July 30, 2026

This document tracks intentionally deferred cleanup work discovered during the docs/rules/workflow audit.

## P2 - Advanced Tracker Overflow on Small Phones

- On iPhone SE (3rd generation), the live-point tracker is taller than the screen, so the footer
  action row (T/A, Drop, Goal on offense; Opp Goal, Opp Turn on defense) is clipped at the bottom.
  This predates the footer action buttons; the old full-width voice button was clipped the same way.
- `getTrackerChipWidth` already shrinks chips to the measured surface height, so the extra height
  comes from elsewhere. Unconfirmed suspects: the Line action tile growing taller than its chip
  width, and `FOOTER_BOTTOM_PADDING` (48pt) on devices without a home indicator.
- Related small-chip issues: "Unknown" wraps mid-word, and the Line tile's icon and label crowd
  the tile edges.
- References:
  `app/(main)/advancedTracking/Tracker.tsx`
  `components/advancedTracking/TrackerActionFooter.tsx`
  `components/advancedTracking/TrackerPlayerGrid.tsx`
  `components/advancedTracking/TrackerLineActionTile.tsx`
  `lib/advancedTracking/trackerLayoutUtils.ts`

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

## P3 - Expo Router Naming

- Standardize route filenames to lowercase kebab-case for long-term consistency (for example `GameInfo.tsx` -> `game-info.tsx`) with a planned migration that preserves existing links during rollout.
- Hub routes are now grouped by home, game, analytics, and team. Remaining top-level basic,
  tutorial, settings, import, and advanced routes should move only when there is a concrete
  navigation benefit.
- References:
  `app/(main)/_layout.tsx`
  `app/(main)/(hub)/`

## P3 - Duplicated Logic

- Extract shared hooks/components to eliminate duplication.
- References:
  `app/(main)/PreGameConfirm.tsx` + `app/(main)/advancedTracking/PreGameConfirm.tsx` — identical card layouts
  `components/view-stats/ImpactTimeline.tsx` + `components/advancedTracking/AdvancedImpactTimeline.tsx` — duplicated impact chart layout, score label fitting, axis labels, step-path, and scale-mode logic; keep basic/advanced event formatting separate
  `store/basic/gameStore.types.ts` + `store/basic/gameStore.ts` — `addTurnoverEvent` parameter type defined inline in both
