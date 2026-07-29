# AGENTS.md

## Start Here

Read `docs/README.md` for the project map and New Screen Checklist. Follow its linked domain docs before changing unfamiliar behavior. If the intended behavior remains ambiguous, ask instead of guessing.

## Engineering

- Prefer derived state over `useEffect`; extract substantial effects into custom hooks.
- Use semantic palette tokens instead of `themeMode` styling branches. Add theme-specific values to `theme/theme.ts`.
- Put app-wide limits in `lib/constants.ts`.
- Follow `docs/ui-patterns.md`, `docs/navigation-map.md`, and `docs/responsive-layout.md` for screens, modals, navigation, safe areas, and orientation.
- Use `<Redirect href="..." />` for render-time navigation; never invoke router actions during render.

## State and Persistence

- Await persistence before dismissing, navigating, resetting, or otherwise invalidating the state being saved.
- Persist new Zustand stores with `persist` and `createJSONStorage(() => AsyncStorage)`; use `onRehydrateStorage` for record migrations when needed.
- Store persisted records in one collection with a current-record ID pointer. Do not persist parallel `currentX` and `savedXs` copies that require explicit synchronization.
- Add a schema version to persisted domain records that may need migration.
- Use Immer for nested object or array updates; simple immutable Zustand partial updates do not require it.

## Verify

- Quick: `npm run check`
- Full: `npm run check:all`
- One test target: `npm test -- gameUtils`
