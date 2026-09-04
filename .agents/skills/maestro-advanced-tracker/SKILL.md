---
name: maestro-advanced-tracker
description: Add, run, debug, or extend Maestro end-to-end simulator flows for the U-Stat advanced tracker on an iOS Simulator or Android Emulator. Use for device-level verification of advanced-tracking navigation, gestures, state transitions, analytics output, and regression flows.
---

# Maestro Advanced Tracker

Verify U-Stat through the installed development build. Read the **Maestro Simulator Checks** section
of `docs/testing.md`; it owns the app ID, URI scheme, seed handshake, and npm suite definitions.
Inspect neighboring files under `.maestro/tests/` and `.maestro/flows/` for current selector and
setup conventions.

Build and install with `npm run ios` when native dependencies or configuration changed. While
iterating, run the edited file directly with `maestro test <path>`; before finishing, run the
smallest applicable npm Maestro suite documented in `docs/testing.md`.

## Author flows from current conventions

1. Reuse the closest setup flow instead of tapping through unrelated setup. Preserve the documented
   foreground-app seed handshake and keep stopped-app behavior in dedicated `*-clean` flows.
2. Prefer stable kebab-case `testID` selectors for actions and screen roots.
3. Use visible-text assertions for user-facing output that the test owns.
4. Keep one deterministic path per test. Do not use `optional: true` to hide required behavior;
   use it only for genuinely optional UI, and use conditional `runFlow` blocks for larger branches.
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

- Confirm the final screenshot and failure artifacts rather than relying only on exit status.
- Use `npm run maestro:ci` when a structured JUnit report and workspace-local artifacts are needed.
- Keep application changes and flow assertions synchronized.
