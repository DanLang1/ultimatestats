---
name: advanced-game-test-scenarios
description: Build, arrange, or refactor U-Stat advanced-game test scenarios with the shared canonical fixture builder. Use for advanced analytics, timeline, component, route, or store tests that need an AdvancedTrackedGame or repeated point/possession/action setup. Do not use the builder to replace the production transition that a test is specifically verifying.
---

# Advanced Game Test Scenarios

Use the shared fixture kit to keep advanced-game tests current, deterministic, and explicit about
point, possession, and action semantics.

Read these files before adding another local advanced-game factory:

- `test/fixtures/advancedGameBuilder.ts` — canonical defaults, fluent scenario builder, validation,
  participant refs, and the explicit unsafe escape hatch.
- `test/fixtures/advancedGameScenarios.ts` — maintained named scenarios that are reused or serve as
  domain contracts.
- `test/fixtures/advancedGameScenarios.test.ts` — compact canonicality check for the maintained
  scenario catalog.

## Choose the arrangement boundary

- Use `createAdvancedGameFixture()` for a small raw record whose point/action structure is the
  subject of the test.
- Use `createAdvancedGameScenario()` for normal action chains such as holds, breaks, turnovers,
  Callahans, stoppages, injuries, multi-point games, and scrimmages. Prefer its fluent actions over
  hand-writing nested point/possession/action arrays.
- Use real `useAdvancedTrackingStore` actions when testing store transitions, capture planning,
  undo, persistence, timestamps, or rejection behavior. The builder may prepare an earlier
  precondition, but it must not perform the operation being tested.
- Use the maintained Maestro seed route and flows for device workflows. Do not import Jest fixture
  code into the app's Maestro seed implementation.

## Builder contracts

- `build()` uses the current advanced schema, deterministic IDs, line-history validation, and the
  analytics compiler. Treat a failure as evidence that the scenario is not canonical.
- `buildPoint()` applies the same validation and returns the current point. Use it when a test
  composes several independently described point outcomes into one game fixture.
- `buildAnalytics()` validates and compiles the scenario directly for analytics and stat tests.
- `defineAdvancedGameTestContext()` owns repeated sides, participants, player refs, and default
  lines for a suite. Prefer `context.gameFromPoints()` or `context.analyticsFromPoints()` over
  spreading a local base game.
- Use `hold()` and `breakAfterTurnover()` for ordinary point outcomes. Drop to fluent actions when
  the intermediate sequence is important to the assertion.
- `buildUnsafe()` is only for tests that intentionally cover malformed or legacy records. State the
  invalid condition in the test name. Migration tests should also set their schema version
  explicitly.
- Start a new possession explicitly after a turnover. A stoppage does not itself end a possession.
- Omit `receiver` for out-of-bounds and roller pulls. A dropped pull may carry a receiver because
  analytics attributes the drop to that player.
- Use `participantRef()` and `UNTRACKED_PLAYER` so tracked, unknown, and intentionally anonymous
  identities remain distinct.
- Supply seven unique participants per side for dual-full-roster games. Keep injury-sub entrants on
  the bench before the substitution.
- Let the builder derive the next receiving side from scores and halftime. Do not encode a pull that
  contradicts game progression.
- Halftime and soft cap require a completed point. Hard cap may occur mid-point; omit
  `afterPointId` in that case and let the builder leave the boundary undefined.

Example:

```ts
const fixtures = defineAdvancedGameTestContext({
  id: 'analytics-suite',
  focusSideId: HOME,
  initialReceivingSideId: AWAY,
  sides,
  players: {
    defender: { id: 'defender', name: 'Defender' },
    scorer: { id: 'scorer', name: 'Scorer' },
  },
  defaultLines,
});

const analytics = fixtures
  .scenario()
  .breakAfterTurnover({
    puller: fixtures.players.defender,
    receiver: fixtures.untracked,
    turnoverResult: 'block',
    defender: fixtures.players.defender,
    pickupPlayer: fixtures.players.defender,
    scorer: fixtures.players.scorer,
  })
  .buildAnalytics();
```

## Reuse policy

Keep one-off assertion-specific data in its test. Add a named recipe to
`advancedGameScenarios.ts` only when it is reused or represents a scenario contract worth
preserving. Extend the builder when a domain action pattern recurs; do not add broad recursive
`Partial<AdvancedTrackedGame>` merging that can silently create inconsistent history.

Do not stop after replacing only a repeated top-level `baseGame`. Convert ordinary valid nested
pull/throw/possession literals to fluent actions too. Small local helpers should describe outcomes
(`makeHoldPoint`, `makeBreakGame`) and delegate their structure to the canonical builder.

When moving an existing raw scenario to the builder, preserve its intended behavior and add a
meaningful assertion. If builder validation exposes an old impossible state, correct the fixture to
the maintained data model rather than bypassing validation.

Run `npm run test` and `npm run check`. Use `npm run check:all` when the migration spans multiple
advanced test layers.
