# Platform Support

## Current Status

- Primary target platforms are iOS and Android.
- Web support is currently deferred and not maintained.
- Running Expo web (`w`) may surface unresolved runtime/bundling issues.

## Web Support Attempt Log

### Context

During a local web run, the app hit:

- `ReferenceError: window is not defined` while loading persisted theme with `AsyncStorage` during web SSR.
- `Uncaught SyntaxError: Cannot use 'import.meta' outside a module` from a dependency in the web bundle.

### Changes Attempted

1. `context/ThemeContext.tsx`
- Added an SSR guard to `loadPersistedTheme()` (`typeof window === 'undefined'` fallback).
- Added a `useInitialTheme()` hook that loads persisted theme in `useEffect`.

2. `app/_layout.tsx`
- Switched from render-time async call (`loadPersistedTheme().then(...)`) to `useInitialTheme()`.

3. `metro.config.js` (new file)
- Added Metro resolver overrides:
  - `unstable_enablePackageExports = true`
  - `unstable_conditionNames = ['browser', 'require', 'react-native', 'default']`

### Rollback Decision

These changes were reverted to avoid introducing broader web-related regressions while current focus remains mobile.

## Future Resume Notes

- Revisit web support in a dedicated branch.
- Validate at minimum:
  - app boot and router navigation
  - persisted storage behavior
  - stat entry flow
  - modal behavior
  - core game flow (`app/index.tsx`)
