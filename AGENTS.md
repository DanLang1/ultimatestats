# AGENTS.md

## Engineering Rules (Project-Specific)

- Prefer derived state over `useEffect`.
- If `useEffect` is necessary, prefer extracting behavior into a custom hook.
- Do not use `useCallback` or `useMemo` (React Compiler workflow).
- No raw `<Text>` from react-native; use `<ThemedText>` from `@/components/ThemedText` for all text. This ensures the Inter font family is applied consistently.
- Do not use `fontWeight` in styles; use `fontFamily: Fonts.semiBold`, `Fonts.bold`, `Fonts.extraBold`, or `Fonts.black` from `theme/theme.ts` instead. The app loads Inter font files directly, so weight must be set via the correct font file, not synthesized.
- No raw color values; use `theme/theme.ts`.
- Prefer semantic palette tokens over `themeMode` branching for styling. If light/dark values differ, add or reuse a palette token instead of checking `themeMode` in components.
- Do not use nested ternaries; prefer explicit conditionals or helper functions when branching logic affects readability.
- No magic numbers for app-wide limits; define constants in `lib/constants.ts`.
- No sub-components in the same file; one component per file.
- Use early returns where practical.
- Prefer direct, explicit types over indexed-access types (for example, use `PointLineRecord[]` instead of `GameState['pointLines']`) unless the coupling is intentionally required.
- Prefer `hasItems(...)` from `lib/utils.ts` for array presence checks instead of `!!arr?.length`.
- Use `AlertProvider`; do not use native `Alert.alert`.
- Do not use `runOnJs`; use `scheduleOnRn`.
- App supports both portrait and landscape via `useLayout()` + `createStyles()` (see `docs/responsive-layout.md`).
- Do not use `useWindowDimensions` directly in screens/components; use `useLayout()` instead.
- Do not use orientation-based conditional style arrays (`!isLandscape && ...`); encode orientation in `createStyles()`.
- For modal UX/patterns, follow `docs/modals.md`.

## Navigation/Modal Rules

- Use `<Redirect href="..." />` for render-time conditional navigation.
- Do not call imperative router methods during render.
- Prefer `router.dismissTo('/')` over `router.back()` for modal exits.
- Keep a single root `SafeAreaProvider`; avoid extra per-screen `SafeAreaView`.

## State & Data Integrity Rules

- For new persisted structures, consider `schemaVersion`.
- Use Immer-style updates for object state.

## Useful Commands

- Dev server: `npm run dev`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Quick verify (lint + typecheck): `npm run check`
- Full verify (lint + typecheck + tests): `npm run check:all`
- Tests: `npm test`
- Single test target: `npm test -- gameUtils`
