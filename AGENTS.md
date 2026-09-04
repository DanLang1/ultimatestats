# AGENTS.md

## Start Here

When in doubt, surface questions to user, avoid making assumptions about code or behavior.

Read `docs/README.md` for the project map and New Screen Checklist. Follow its linked domain docs before changing unfamiliar behavior. If the intended behavior remains ambiguous, ask instead of guessing.

## Engineering

- Prefer derived state over `useEffect`; extract substantial effects into custom hooks.
- Prefer named derived variables over multi-clause inline conditions (JSX guards, ternaries);
  use a function only when the logic is parameterized or reused across sites.
- Trust the data we own. Avoid noisy or unnecessary fallbacks or excessive null checks on data we know can never be null
- Sometimes throwing an error or returning early is better than silently passing 'invalid' or odd fallbacks through the code
- Prefer exported, named types for reusable domain concepts, especially across storage, analytics,
  state, and UI boundaries. Avoid indexed-access types such as `Model['field']` as a substitute for
  a named domain type; indexed access remains appropriate for one-off structural derivations that
  should stay tightly coupled to their source type.
- Use semantic palette tokens instead of `themeMode` styling branches. Add theme-specific values to `theme/theme.ts`.
- Put app-wide limits in `lib/constants.ts`.
- Follow `docs/ui-patterns.md`, `docs/navigation-map.md`, and `docs/responsive-layout.md` for screens, modals, navigation, safe areas, and orientation.
- Use `<Redirect href="..." />` for render-time navigation; never invoke router actions during render.

## State and Persistence

- Await persistence before dismissing, navigating, resetting, or otherwise invalidating the state being saved.
- Persist Zustand state that must survive an app restart with `persist` and
  `createJSONStorage(() => AsyncStorage)` when AsyncStorage is the established boundary; use
  `onRehydrateStorage` for record migrations when needed. Keep transient stores unpersisted, and
  follow an existing domain-specific boundary such as SQLite instead of wrapping it in Zustand
  persistence.
- For AsyncStorage-backed record collections, store records in one collection with a current-record
  ID pointer. Do not persist parallel `currentX` and `savedXs` copies that require explicit
  synchronization.
- Add a schema version to persisted domain records that may need migration.
- Use Immer for nested object or array updates; simple immutable Zustand partial updates do not require it.

## Verify

- Quick: `npm run check`
- Full: `npm run check:all`
- One test target, for example: `npm test -- gameUtils`
