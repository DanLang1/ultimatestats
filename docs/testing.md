# Testing Patterns

> Guidelines for testing in this codebase.

## Testing Strategy

The repository uses three complementary test layers. Put behavior in the lowest layer that can
prove it confidently, then add a higher-level test only when the integration itself is important.

| Layer                                     | What it proves                                                                                                                                               | What it does not prove                                                                                                      | Typical location                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Jest unit/domain tests                    | Pure calculations, state transitions, parsers, migrations, store actions, and edge cases with direct inputs and outputs                                      | Rendering, accessibility, native controls, or navigation between screens                                                    | `lib/**/__tests__/`, `store/**/__tests__/`, `hooks/**/__tests__/` |
| React Native Testing Library screen tests | A real route renders with its real components, providers, hooks, and stores; important presses update visible UI/state and request the expected navigation   | A real device, native module implementation, actual Expo Router transition, gestures across screens, or platform layout     | `test/routes/`                                                    |
| Maestro end-to-end tests                  | An installed app accepts real device-level taps and text input while exercising native rendering, Expo Router navigation, modals, and multi-screen workflows | Exhaustive business-logic permutations; most tracker flows seed valid setup state rather than repeating the entire setup UI | `.maestro/tests/`                                                 |

React Native Testing Library tests are **screen-level integration tests**, even though Jest runs
them. They sit between small unit tests and full-device Maestro flows. The screen harness replaces
only boundaries Jest cannot host: the native navigation container, native persistence APIs,
speech recognition, and animation worklets. Therefore, asserting `router.push(...)` proves that a
screen requested navigation; a Maestro flow proves that the installed app actually navigated and
the destination works.

For example, advanced tracking is covered at all three levels without repeating every scenario:

1. Unit tests exhaustively verify tracking calculations and transitions.
2. Screen tests verify each advanced route's primary state, guards, and important local actions.
3. Maestro verifies selected point-tracking workflows across real menus, modals, and routes.

When fixing a workflow bug, add a regression test at the layer that owns the defect. Add a Maestro
regression as well when the bug depends on navigation, native controls, gestures, timing, or a
multi-screen sequence.

## Running Tests

```bash
# All Jest tests: unit/domain and React Native Testing Library screen tests
npm test

# Unit/domain tests only, by target
npm test -- gameUtils

# Screen integration tests only
npm run test:routes

# Watch mode
npm test -- --watch

# Formatting, linting, type checking, and all Jest tests
npm run check:all
```

## Maestro Simulator Checks

Maestro flows live in `.maestro/` and target the installed iOS simulator development build
(`com.langdk.ultimatestats.dev` from the checked-in native project, using the `ultimatestats-dev`
URI scheme). Install Maestro with Homebrew, then
build the app and run the advanced tracker smoke check:

```bash
brew tap mobile-dev-inc/tap
brew install maestro
npm run ios
npm run maestro:smoke
```

The Maestro suite is intentionally concentrated on advanced tracking, where menus, modal
transitions, and long action sequences benefit most from device-level coverage. Run the default
single-simulator suite with `npm run maestro`; it uses the fast test-only seed route for most flows
and keeps one UI setup smoke test for the real Dashboard → New Game → line/pull path. Seeding avoids
retesting setup in every scenario, but everything after the seed still runs through the installed
app's real UI and navigation.

Each seeded flow resets and recreates its own team/game state, so tests remain independent without
clearing the app's persisted data between flows. Reusable seed flows restart the app with
`launchApp` before opening the seed deep link; the seed route then performs the domain setup.
Seeded tracker flows must pass an explicit `TRACKER_STATE`:

- `awaitingPickup` only when the test is intentionally verifying pickup or dropped-pull UI.
- `focusPossession` when the scenario begins with the tracked side holding the disc.
- `opponentPossession` when the scenario begins with the other side holding the disc.

Prefer seeding the scenario's precondition over navigating or tapping through setup that the test
does not own. Keep conditional retries limited to interactions that are themselves under test;
they should not be the default synchronization mechanism. Wait for a meaningful state-specific
postcondition after every gesture.

Seed setup flows launch the app before opening the custom seed deep link, then use a two-phase route
handshake: first wait for `maestro-setup-running` to appear, then wait for it to disappear before
asserting the destination. `launchApp` restarts the app without clearing persisted state, while the
`*-clean` flows intentionally exercise the stopped-app path. Do not skip the disappearance check—a
destination element from the previous screen can remain discoverable underneath the seed route during
navigation and create a false-positive setup completion.

The default suite excludes the `extended` multi-point scenarios to keep feedback fast. Use
`npm run maestro:all` to include them all.

```bash
# Smallest installed-app smoke flow
npm run maestro:smoke

# Core advanced-tracker device flows; excludes the extended tag
npm run maestro

# Scrimmage setup, dual-side turnovers, and side-perspective stats
npm run maestro:scrimmage

# Core and extended advanced-tracker device flows
npm run maestro:all

# CI-friendly JUnit report and local artifacts
npm run maestro:ci
```

The Maestro npm scripts disable Maestro CLI analytics for predictable agent runs.

Use `.agents/skills/maestro-advanced-tracker/SKILL.md` before adding or extending advanced tracker
flows.

## Test File Location

Tests live in `__tests__/` directories near the code they cover, except for Expo Router route tests.
Expo Router reserves `app/` for route and layout files, so route tests live under `test/routes/`;
shared screen-test infrastructure stays under `test/`:

- `test/routes/` - user-facing route behavior
- `lib/**/__tests__/`, `store/**/__tests__/`, etc. - domain and state behavior
- `test/fixtures/` - valid domain state built with real Zustand stores and actions
- `test/mocks/` - narrow native/runtime boundary adapters
- `test/render.tsx` - the production-like provider wrapper

Examples of domain tests include:

- `gameUtils.test.ts` - Game end logic
- `playerUtils.test.ts` - Player utilities
- `halftimeUtils.test.ts` - Halftime marker utilities
- `statsUtils.test.ts` - Stats calculations
- `timelineUtils.test.ts` - Timeline formatting
- `lib/storage/__tests__/migrations*.test.ts` - Saved-game schema migrations

Legacy saved-game fixtures live in `lib/storage/__fixtures__/games/`, grouped by schema version
(`v2/`, `v3/`, etc.). When adding a new migration, keep older fixtures unchanged and add new
versioned fixtures/snapshots rather than rewriting the old data.

Every saved-game schema bump requires a new migration file — even if the migration is a no-op
(only stamps the new `schemaVersion`). The migration engine asserts that all versions from the
first migration up to `CURRENT_SCHEMA_VERSION` are covered consecutively.

### Advanced-game scenarios

Use `test/fixtures/advancedGameBuilder.ts` for canonical advanced-game records instead of creating
another local base-game factory. `createAdvancedGameFixture()` supplies current-schema defaults;
`createAdvancedGameScenario()` builds deterministic point, possession, and action chains and
validates them against line-history and analytics contracts.

Prefer fluent actions all the way through the scenario; replacing only a top-level base game still
leaves the most error-prone duplication in nested pulls, possessions, and throws. Use `buildPoint()`
when a test needs to compose several independently described point outcomes into one game.
Use `buildAnalytics()` when raw game inspection is unnecessary. Suites that share sides, players,
and lines should define one `defineAdvancedGameTestContext()` and obtain fixtures, scenarios, and
player refs from it. Prefer the named `hold()` and `breakAfterTurnover()` outcomes when their
intermediate actions are not the subject of the assertion.

Reusable domain scenarios live in `test/fixtures/advancedGameScenarios.ts`. Keep a one-off fixture
local when its exact raw structure is the assertion target. Use `buildUnsafe()` only when malformed
or legacy input is intentional, and state that condition in the test. Store-transition tests should
continue to exercise the production store action that owns the behavior rather than asking the
fixture builder to perform it.

Follow `.agents/skills/advanced-game-test-scenarios/SKILL.md` when adding or refactoring advanced
game setup across unit, component, route, or store tests.

## Writing Tests

### Screen-test policy

Screen tests use React Native Testing Library and follow this order of preference:

1. Render the real route with the real providers, hooks, stores, actions, and child components.
2. Put the real store into a small valid state or call a real action to reach that state.
3. Seed React Query for deterministic server data without replacing the consuming hook.
4. Replace only a runtime boundary that Jest cannot host, such as Expo Router's native navigation
   container, SQLite, or speech recognition.

Do not mock a hook or Zustand store merely because arranging its state takes more setup. A route
test should normally exercise the hook and store behavior that the user-visible screen depends on.
Boundary adapters must preserve the boundary's useful semantics; for example, the SQLite test
adapter implements in-memory load/save/delete operations instead of returning hard-coded hook
results.

Use `screen` queries, prefer role/name and label queries, and use `userEvent.setup()` for user
interaction. Await `renderScreen`, `userEvent` calls, `findBy*`, and `waitFor` work. Prefer visible
behavior and state transitions over implementation assertions or snapshots.

Oxlint loads the Testing Library ESLint plugin for test files through JavaScript plugin
compatibility and additionally requires explicit assertions and `userEvent` usage.

Do not use a screen test to simulate a long cross-route journey. Assert the screen's visible result,
local state transition, and navigation request, then use Maestro when the route transition and
destination must be proven together on a device.

### Pattern

```typescript
import { functionToTest } from '../module';

describe('functionToTest', () => {
  it('should handle normal case', () => {
    const result = functionToTest({ input: 'value' });
    expect(result).toBe(expected);
  });

  it('should handle edge case', () => {
    // ...
  });
});
```

### What to Test

1. **Unit/domain:** utility functions, game logic, statistics, migrations, store actions, and edge
   cases.
2. **Screen integration:** every user-facing route's primary content, route guards, accessibility,
   and important local interactions.
3. **Maestro E2E:** a focused set of high-value workflows where real navigation, native rendering,
   or a sequence across screens is the behavior under test.

### What NOT to Test

1. Third-party library internals
2. Styling implementation details
3. Navigator layout files unless the shell itself owns meaningful behavior
4. Test-only routes such as `app/__maestro_seed__.tsx`

## Official references

- [Expo unit testing](https://docs.expo.dev/develop/unit-testing/)
- [Expo Router testing](https://docs.expo.dev/router/reference/testing/)
- [React Native Testing Library queries](https://callstack.github.io/react-native-testing-library/docs/api/queries)
- [React Native Testing Library user events](https://callstack.github.io/react-native-testing-library/docs/api/events/user-event)
- [Testing Library guiding principles](https://testing-library.com/docs/guiding-principles/)
- [Testing Library ESLint plugin](https://github.com/testing-library/eslint-plugin-testing-library)

## Manual Verification

Some features require manual testing:

### Browser Testing

- Use the browser subagent for UI interactions
- Record flows for reference

### Build Verification

```bash
# Development build
npm run dev

# Preview build
eas build --profile preview

# Production build
eas build --profile production
```

### Test Scenarios

When testing stat tracking:

1. Score goals with/without stat tracking
2. Record turnovers of each type
3. Verify timeline shows correct events
4. Export CSV and verify data matches UI

When testing saved-game migrations:

1. In a dev build, open Dashboard and use `Import Legacy Game JSON`.
2. Paste a raw saved-game object/array or a persisted `state.savedGames` blob.
3. Confirm the games appear in Saved Games and that halftime/timeline behavior matches the migrated schema.
4. To test malformed legacy data, use `Append Raw Entries`, then `Run loadGames() Now` (or open Saved Games) and confirm only the bad entries are quarantined.
5. To test whole-blob corruption from the Dashboard, tap `Test Corrupt Blob Alert`. It writes invalid JSON to `ultimatestats_games` and opens Saved Games, which should show the corruption warning instead of silently pretending the library is empty.

When testing game end:

1. Play to game point
2. Enable soft cap, verify behavior
3. Let timer expire (hard cap)
4. Verify win modal shows correctly
