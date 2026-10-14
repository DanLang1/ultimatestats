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

## P3 - Size-Class Scaling Helper

- About 2,000 call sites spell out `scaleBySizeClass(x, sizeClass)` and ~220 spell out
  `getSizeClassValue(map, sizeClass)`, and every style factory threads `sizeClass` through.
- Cleanup: add a `useScale()` hook returning `s(x, options?)` bound to the current size class, with
  `s.pick(map)` and `s.sizeClass`; style factories take `s` instead of `sizeClass`. Same factors and
  rounding, so a file-by-file codemod has no visual change. Keep `scaleBySizeClass` for non-React
  code and tests. Keep `isCompactHeight` out of `s`; screens opt in to it explicitly.
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
