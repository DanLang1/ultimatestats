---
name: maestro-advanced-tracker
description: Add, run, debug, or extend Maestro end-to-end simulator flows for the U-Stat advanced tracker on an iOS Simulator or Android Emulator. Use for device-level verification of advanced-tracking navigation, gestures, state transitions, analytics output, and regression flows.
---

# Maestro Advanced Tracker

Verify U-Stat through the installed development build. Read `docs/testing.md` before changing flows,
then inspect neighboring flows for the current setup and selector conventions.

## Project setup

- Development app ID: `com.langdk.ultimatestats.dev`
- Checked-in native iOS bundle ID: `com.langdk.ultimatestats`
- Tests: `.maestro/tests/`
- Shared flows: `.maestro/flows/`
- Screenshots: `.maestro/screenshots/`

Build and install the development app when native dependencies or configuration changed:

```bash
npm run ios
```

Run the smallest relevant target:

```bash
npm run maestro:smoke
npm run maestro
npm run maestro:scrimmage
npm run maestro:all
```

The npm scripts disable Maestro analytics. They do not configure `JAVA_HOME`; use the local
environment's working Java configuration.

## Author flows from current conventions

1. Reuse setup flows instead of tapping through unrelated setup:
   - `flows/setup-game.yaml`
   - `flows/select-line-and-pull.yaml`
   - `flows/record-opponent-goal.yaml`
2. Prefer stable kebab-case `testID` selectors for actions and screen roots.
3. Use visible-text assertions for user-facing output that the test owns.
4. Keep one deterministic path per test. Do not use `optional: true` or either/or assertions.
5. Wait for meaningful state transitions; do not use blind delays as synchronization.
6. Keep scenarios focused and use shared flows for repeated setup.
7. Take one final screenshot per committed test. Use extra screenshots temporarily for diagnosis.
8. Use `scrollUntilVisible` only when the control is genuinely outside the viewport.
9. Add the `testID` to the actual `Pressable`, `TextInput`, or asserted screen root.

## Known React Native behavior

- A React Native `<Modal>` may render correctly while Maestro's hierarchy snapshot shows an empty app
  view. Confirm the state with a screenshot and user-visible assertions.
- After a stall turnover, the disc is on the ground and offense-only rare-menu actions remain
  disabled until pickup.
- Stall-defense leaves the rare menu in the disc-on-ground state. End the point and start a clean
  point before testing later offense actions.

## Verification

- Run the edited test directly with `maestro test <path>` while iterating.
- Run the closest npm suite before finishing.
- Confirm the final screenshot and failure artifacts rather than relying only on exit status.
- Keep application changes and flow assertions synchronized.
