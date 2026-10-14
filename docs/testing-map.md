# Testing Map

Use this to choose test coverage quickly based on the feature you changed.

## Choose the Test Layer

| Change                                                                                 | Start with                               | Add another layer when                                                        |
| -------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| Calculation, parser, migration, store action, or edge case                             | Jest unit/domain test                    | The result also needs user-visible wiring verification                        |
| One route's rendering, guard, accessibility, or local interaction                      | React Native Testing Library screen test | Correctness depends on a real route transition or native control              |
| Navigation, modal sequence, gesture, native behavior, or multi-screen tracker workflow | Maestro E2E test                         | Also add a unit or screen regression for the underlying defect when practical |

`npm test` runs the Jest unit/domain and React Native Testing Library screen tests, plus the oxlint
plugin tests. It does not run Maestro or launch a simulator.

## Test Locations

Logic tests live in `__tests__/` directories near the code they cover. Expo Router route tests live
in `test/routes/` because the `app/` directory is reserved for route and layout files. Shared
route-test fixtures, native-boundary adapters, and provider wrappers also live in `test/`.

Every user-facing route needs a screen test in `test/routes/`. Navigator `_layout.tsx` shells and
the test-only routes (`app/__maestro_seed__.tsx`, `app/(main)/__dev_crash__.tsx`) are excluded.

## End-to-end (Maestro) suites

Maestro runs against the installed iOS simulator app. Most flows enter through the test-only seed
route and then exercise the real UI. Each flow in `.maestro/tests/` is tagged by area (the
`maestro:*` scripts in `package.json` select by tag); the flow files themselves describe what they
cover. Tag every new flow with its area. The default `npm run maestro` run excludes flows tagged
`extended`; area commands include them.

Maestro coverage is intentionally narrower than route-test coverage. The screen suite gives every
important route a fast deterministic check; Maestro protects journeys where cross-screen and
native-device behavior carry the most risk.

## When to Add a New Test

- Any change to event semantics or score progression.
- Any change to game-over, soft-cap, halftime, or timeout logic.
- Any bug fix where behavior previously regressed.
- Any new user-facing route or route guard needs a screen integration test.
- Any high-risk navigation/native workflow needs a focused Maestro flow or an update to an existing
  one.
