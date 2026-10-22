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

Component tests under `components/**/__tests__/` also use this library, but they are not a second
screen layer. The route tests own each screen's integration, so a component test earns its place
only when it covers a branch, guard, or failure the route tests cannot reach. See the
layer-ownership rule in `.agents/skills/test-audit/SKILL.md`.

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
npx jest gameUtils

# Screen integration tests only
npm run test:routes

# Watch mode
npx jest --watch

# Formatting, linting, type checking, and all Jest tests
npm run check:all
```

`npm test` runs Jest and the oxlint plugin tests together, so `npm test -- <pattern>` does not forward
the pattern to Jest. Use `npx jest <pattern>` (or `npm run test:routes`) for a focused run.

## Maestro Simulator Checks

Maestro flows live in `.maestro/`: scenario flows in `.maestro/tests/` and reusable setup and
reader sub-flows in `.maestro/flows/`. They target the installed iOS simulator development build
(dev app id `com.langdk.ultimatestats.dev` and URI scheme `ultimatestats-dev`, both defined in
`app.config.js` for the `development` variant). The npm scripts run them with
[maestro-runner](https://github.com/devicelab-dev/maestro-runner), a devDependency, so build the app
and run the advanced tracker smoke check:

```bash
npm run ios
npm run maestro:smoke
```

The Maestro suite is concentrated on advanced tracking, where menus, modal transitions, and long
action sequences benefit most from device-level coverage, plus one or two flows per basic-game and
team-management journey (tagged `basic` and `team`). Run the default single-simulator suite with
`npm run maestro`; it uses the fast test-only seed route for most flows and keeps UI setup flows for
the real Dashboard → New Game paths (`advanced-tracker-ui-setup.yml`, `basic-game-full-cycle.yml`,
`basic-line-calling.yml`). Seeding avoids retesting setup in every scenario, but everything after
the seed still runs through the installed app's real UI and navigation.

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

Timer flows (`advanced-tracker-timers.yml`, `advanced-tracker-halftime-timer.yml`,
`basic-timers.yml`) assert on displayed values through shared helpers in `.maestro/flows/`:
`read-timer-seconds.yaml` parses the M:SS value into `output`, `assert-timer-running.yaml` waits for
the value to change, and `assert-timer-paused.yaml` asserts it holds for a few seconds. Maestro has
no sleep command, so the paused helper's optional wait reports a warning on success; that warning is
expected. Adjustments made while paused assert exact deltas; adjustments made while running allow
for ticks between reads.

The default suite excludes the `extended` multi-point scenarios to keep feedback fast. Use
`npm run maestro:all` to include them all.

Basic and team seed modes:

- `mode=team` lands on Dashboard with team Zoboomafoo (seven unset players), no active game, basic
  stat tracking on, and the seed team's saved basic games removed (`setup-team-dashboard.yaml`).
- `mode=basicCancelPendingGoal` lands on a live basic Scoreboard at 0-0, game to 2, with one team 1
  timeout used (`setup-basic-game.yaml`).
- `mode=basicSavedGame` lands on a saved 2-1 basic game against Rivals with known turnovers,
  goals, and point lines (`setup-basic-saved-game.yaml`).
- `mode=basicSavedGames` adds an earlier 1-0 win over Hammers (Joe from Jon) to that saved game and
  lands on Aggregate Stats (`setup-basic-saved-games.yaml`).

Every seed except `mode=onboarding` marks onboarding as seen, so flows that relaunch the app
(`launchApp` mid-flow) re-enter through `/` to the active game or Dashboard even if an earlier
onboarding flow was interrupted. Every seed deletes saved teams whose names start with `Maestro `
(`MAESTRO_CREATED_TEAM_PREFIX`).
Flows that create teams must use that prefix so a failed run cannot leak a team into later runs;
other saved teams on the simulator are left alone.

Selector notes learned from the installed app:

- Maestro text matching ignores case, so `'Edit Point 1 Line'` also matches an `Edit point 1 line`
  button label. Wait on a distinct element when titles and labels collide.
- `?`, `(`, `)`, and `+` are regex characters in text selectors; escape them (`'Delete Game\?'`).
- Pressable cards expose their whole label as one element (for example
  `'<icon>, Game To, 15, <icon>'`); match them with a regex such as `'.*Game To, 15.*'`.
- Basic box-score rows are wider than the screen. Tap them with an element-relative point
  (`point: '5%,50%'`) and scroll to them with a lower `visibilityPercentage`.
- `scrollUntilVisible` with `speed: 80` and without `centerElement` is markedly faster than the
  defaults; only center when the next tap needs it.

The seed route accepts `bench=true` for single-team injury-substitution scenarios; the extra roster
players remain off the starting line. Single-team bench seeds also include the nine-player Full squad
and seven-player Starting line presets. `advanced-tracker-preset-selection.yml` verifies oversized
draft recovery, the seven-player tap cap, trimming a preset, and swapping a bench player into the
focused line. Red Zone regression flows cover toggle/turnover undo, pickup and dropped-pull undo, goal revival/re-scoring, and cleanup of injury substitutions attached to a
removed anonymous possession. They read the existing DEV JSON view to assert underlying records;
exact pause-adjusted analytics durations remain covered by deterministic Jest tests.

```bash
# Smallest installed-app smoke flow
npm run maestro:smoke

# Core device flows; excludes the extended tag
npm run maestro

# Advanced tracker flows, including scrimmage
npm run maestro:advanced

# Scrimmage setup, dual-side turnovers, and side-perspective stats
npm run maestro:scrimmage

# Basic scoreboard games: setup, scoring, line calling, timers, timeline, saved stats
npm run maestro:basic

# Roster, line preset, and team management
npm run maestro:team

# Core and extended device flows
npm run maestro:all

# CI-friendly JUnit report and local artifacts
npm run maestro:ci
```

Reports (HTML, JSON, JUnit) and failure screenshots land in a timestamped folder under
`.maestro/test-output/reports/`; `maestro:ci` writes to `.maestro/test-output/ci/` instead.
`npm run maestro:parallel` spreads flows across several booted simulators
(`.agents/skills/maestro-parallel/SKILL.md`). `npm run maestro:classic` runs the core suite with
Homebrew Maestro (`brew install mobile-dev-inc/tap/maestro`) as a fallback, with its CLI analytics
disabled. `npm run check` runs `lint:maestro`, which syntax-checks the flows offline.

maestro-runner differs from Maestro in ways flows must account for:

- Selector regexes use Go's RE2, which has no lookaround or backreferences, and a pattern RE2 cannot
  compile matches as literal text, so a `notVisible` assertion with one passes falsely. Do not use
  them in flows.
- `retry.maxRetries` counts total attempts, where Maestro counts retries; use `maxRetries: 2` to get
  at least one retry under both.
- It taps as soon as an element appears. Opening a React Native `<Modal>` while the previous one is
  still dismissing can swallow the tap, or leave later modals with an empty accessibility tree. Before
  such a tap, pause with an optional `extendedWaitUntil` for `id: 'maestro-pause'`, which never
  appears. An optional `notVisible` wait on an element is not a pause while a modal covers it.
- `takeScreenshot` paths resolve relative to the flow file, not the working directory.

### Driving Simulators Directly

For visual checks across devices (iPhone SE, a large iPhone, iPad mini, a large iPad), run ad hoc
flows with `npx maestro-runner --platform ios --device <udid> -e OUT=<dir> test <flow>` and
`takeScreenshot: ${OUT}/<name>`. Things that are not obvious:

- Classic Maestro's iOS driver always binds host port 7001, so run one `maestro` command at a time
  against one simulator. Concurrent runs on two simulators send commands to the wrong device.
- Every seed resets Settings → Orientation to Portrait (`resetMaestroSetupState`), which blocks
  `setOrientation`. To test landscape after seeding, set Orientation to System first (for example
  `openLink: ultimatestats-dev:///settings` then `tapOn: 'System'`).
- If a simulator ignores `setOrientation` or taps land at rotated coordinates, reboot it
  (`xcrun simctl shutdown <udid>` then `xcrun simctl boot <udid>`).
- A fresh install opens the Expo dev launcher. Connect with
  `ultimatestats-dev://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081`. Skip the dev-menu
  onboarding sheet with
  `xcrun simctl spawn <udid> defaults write com.langdk.ultimatestats.dev EXDevMenuIsOnboardingFinished -bool YES`.
- Install the dev build on another simulator by copying the built app:
  `xcrun simctl install <udid> "$(xcrun simctl get_app_container <source-udid> com.langdk.ultimatestats.dev app)"`.
- After a source change, relaunch the app before capturing; Fast Refresh does not always re-run
  layout measurement.
- The DEV button overlaps the Goal footer button on small phones, which can intercept taps there.

Use `.agents/skills/maestro-advanced-tracker/SKILL.md` before adding or extending advanced tracker
flows.

## Test File Location

Tests live in `__tests__/` directories near the code they cover, except for Expo Router route tests.
Expo Router reserves `app/` for route and layout files, so route tests live under `test/routes/`;
shared screen-test infrastructure stays under `test/`:

- `test/routes/` - user-facing route behavior
- `lib/**/__tests__/`, `store/**/__tests__/`, `hooks/**/__tests__/`, etc. - domain and state behavior
- `components/**/__tests__/` - co-located component behavior that a route test cannot reach
- `test/fixtures/` - valid domain state and the canonical advanced-game builders (shared helpers use
  real Zustand stores and actions; the advanced-game builder is intentionally store-free)
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
versioned fixtures rather than rewriting the old data.

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
player refs from it. Prefer the named `hold()`, `breakAfterTurnover()`, and `dirtyHold()` outcomes when their
intermediate actions are not the subject of the assertion.

Keep a one-off fixture local when its exact raw structure is the assertion target; the named
outcomes above cover the common shapes. Use `buildUnsafe()` only when malformed
or legacy input is intentional, and state that condition in the test. Store-transition tests should
continue to exercise the production store action that owns the behavior rather than asking the
fixture builder to perform it.

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

The network is blocked by default: `test/setup.ts` fails any test that calls `fetch` without
stubbing it via `jest.spyOn(global, 'fetch')` (see `jsonResponse` in `test/fetch.ts`).

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

For the full junk-pattern checklist, the layer-ownership rule, and the periodic test-audit
workflow, see `.agents/skills/test-audit/SKILL.md`.

## Official references

- [Expo unit testing](https://docs.expo.dev/develop/unit-testing/)
- [Expo Router testing](https://docs.expo.dev/router/reference/testing/)
- [React Native Testing Library queries](https://callstack.github.io/react-native-testing-library/docs/api/queries)
- [React Native Testing Library user events](https://callstack.github.io/react-native-testing-library/docs/api/events/user-event)
- [Testing Library guiding principles](https://testing-library.com/docs/guiding-principles/)
- [Testing Library ESLint plugin](https://github.com/testing-library/eslint-plugin-testing-library)

## Manual Verification

Some features require manual testing.

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

1. Add or update a versioned fixture under `lib/storage/__fixtures__/games/` and a case in
   `lib/storage/__tests__/migrations.test.ts`; keep older fixtures unchanged and add new versioned
   fixtures rather than rewriting the old data.
2. In a dev build, confirm migrated games render in Saved Games with correct halftime and timeline
   behavior.

When testing game end:

1. Play to game point
2. Enable soft cap, verify behavior
3. Let timer expire (hard cap)
4. Verify win modal shows correctly
