---
name: advanced-game-test-scenarios
description: Build, arrange, or refactor U-Stat advanced-game test scenarios with the shared canonical fixture builder. Use for advanced analytics, timeline, component, route, or store tests that need an AdvancedTrackedGame or repeated point/possession/action setup. Do not use the builder to replace the production transition that a test is specifically verifying.
---

# Advanced Game Test Scenarios

Use the shared fixture kit to keep advanced-game tests deterministic and explicit about point,
possession, and action semantics. Read the **Advanced-game scenarios** section of
`docs/testing.md`, then inspect these files before adding another local factory:

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

## Preserve the important contracts

- Treat a `build()` failure as evidence that the scenario violates the current schema, line history,
  or analytics contracts.
- Use `buildPoint()` for independently composed points, `buildAnalytics()` when raw game inspection
  is unnecessary, and `defineAdvancedGameTestContext()` for suite-wide sides, participants, refs,
  and lines.
- `buildUnsafe()` is only for tests that intentionally cover malformed or legacy records. State the
  invalid condition in the test name. Migration tests should also set their schema version
  explicitly.
- Start a new possession explicitly after a turnover. A stoppage does not itself end a possession.
- Omit `receiver` for out-of-bounds and roller pulls. A dropped pull may carry a receiver because
  analytics attributes the drop to that player.
- Use `participantRef()` and `UNTRACKED_PLAYER` so tracked, unknown, and intentionally anonymous
  identities remain distinct.
- Let the builder derive receiving sides and cap boundaries from game progression. Do not encode a
  contradictory pull or bypass validation for an ordinary valid scenario.

## Reuse policy

Keep one-off assertion-specific data in its test. Add a named recipe to
`advancedGameScenarios.ts` only when it is reused or represents a scenario contract worth
preserving. Extend the builder when a domain action pattern recurs; do not add broad recursive
`Partial<AdvancedTrackedGame>` merging that can silently create inconsistent history.

When moving an existing raw scenario to the builder, preserve its intended behavior and add a
meaningful assertion. If builder validation exposes an old impossible state, correct the fixture to
the maintained data model rather than bypassing validation.

Run `npm run test` and `npm run check`. Use `npm run check:all` when the migration spans multiple
advanced test layers.
