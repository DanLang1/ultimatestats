# AGENTS.md

## Orientation

See `docs/README.md` for directory structure, key concepts, and the New Screen Checklist.

## Engineering Rules (Project-Specific)

- Prefer derived state over `useEffect`.
- If `useEffect` is necessary, prefer extracting behavior into a custom hook.
- Do not use `useCallback` or `useMemo` (React Compiler workflow).
- Prefer semantic palette tokens over `themeMode` branching for styling. If light/dark values differ, add or reuse a palette token instead of checking `themeMode` in components.
- No raw colors — everything abstracted into `theme/theme.ts`.
- Do not use nested ternaries; prefer explicit conditionals or helper functions when branching logic affects readability.
- No magic numbers for app-wide limits; define constants in `lib/constants.ts`.
- No sub-components in the same file; one component per file.
- Use early returns where practical.
- Prefer direct, explicit types over indexed-access types (for example, use `PointLineRecord[]` instead of `GameState['pointLines']`) unless the coupling is intentionally required.
- Prefer `hasItems(...)` from `lib/utils.ts` for array presence checks instead of `!!arr?.length`.
- Use `AlertProvider`; do not use native `Alert.alert`.
- Do not use `runOnJs`; use `scheduleOnRn`.

## Navigation/Modal Rules

- Use `<Redirect href="..." />` for render-time conditional navigation; never call `router.navigate()` or `router.dismissTo()` during render (causes "cannot update a component while rendering" error).
- Prefer `router.dismissTo('/')` over `router.back()` for modal exits (avoids "action not handled" errors).
- Keep a single root `SafeAreaProvider`; avoid extra per-screen `SafeAreaView`.
- Screen headers: keep `paddingTop: 8` so controls don't sit flush to the top edge in landscape.
- Every navigator shell must set an explicit themed background on its scene container (`contentStyle` for stacks, `sceneStyle` for tabs/drawers) to avoid white flashes during transitions, especially in dark mode.
- For modals, set `gestureEnabled: false` and handle dismissal explicitly. Use `/add-modal` for full modal patterns.
- App supports both portrait and landscape via `useLayout()` + `createStyles()` (see `docs/responsive-layout.md`).
- Do not use `useWindowDimensions` directly in screens/components; use `useLayout()` instead.
- Do not use orientation-based conditional style arrays (`!isLandscape && ...`); encode orientation in `createStyles()`.

## State & Data Integrity Rules

- For new persisted structures, consider `schemaVersion`.
- Use Immer for object state updates (already configured in store).
- Await async persistence actions (e.g. `saveCurrentTeam()`, `saveCurrentGame()`) in UI handlers before dismissing modals, navigating, or resetting state — skipping this causes stale-write races.
- New Zustand stores that need persistence must use the `persist` middleware with `createJSONStorage(() => AsyncStorage)` — this rehydrates automatically on startup and eliminates manual `loadX()` actions and `useEffect`/`useFocusEffect` fetch calls in screens. See `tournamentStore.ts` for the pattern. If per-record migrations are needed on rehydration, use `onRehydrateStorage` (see `gameStore.ts`).
- Do not create separate `currentX` + `savedXs` state where both would be persisted and kept in sync via explicit `saveCurrentX()` calls — this is redundant with automatic persistence and creates two sources of truth. Instead, store all records in one persisted collection and use a `currentXId` pointer to identify the active record (see `advancedTrackingStore.ts`).

## Game Logic Rules

- Game-over detection lives in `lib/gameUtils.ts` — use `checkGameOver()` instead of duplicating logic. When changing game end logic, also update `lib/__tests__/gameUtils.test.ts`.
- Halftime possession: the team that started with the disc (`startingPossession`) pulls at halftime.
- Always consider soft cap and hard cap scenarios when modifying game scoring.

## Useful Commands

- Quick verify (lint + typecheck): `npm run check`
- Full verify (lint + typecheck + tests): `npm run check:all`
- Tests: `npm test`
- Single test target: `npm test -- gameUtils`
