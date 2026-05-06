---
name: maestro-advanced-tracker
description: Add, run, and extend Maestro end-to-end simulator flows for the U-Stat advanced tracker. Use when an agent needs to verify advanced tracker output on an iOS Simulator or Android Emulator.
---

# Maestro Advanced Tracker

Use Maestro to verify U-Stat's advanced tracker through the installed development build.

## Official References

- React Native support: https://docs.maestro.dev/platform-support/react-native
- `launchApp`: https://docs.maestro.dev/api-reference/commands/launchapp
- `assertVisible`: https://docs.maestro.dev/api-reference/commands/assertvisible
- `tapOn`: https://docs.maestro.dev/api-reference/commands/tapon
- `takeScreenshot`: https://docs.maestro.dev/reference/commands-available/takescreenshot
- Flow commands: https://docs.maestro.dev/api-reference/common-commands-arguments

## Project Setup

- iOS simulator bundle id from the checked-in native project: `com.langdk.ultimatestats`
- iOS development bundle id from `app.config.js` when regenerated with `APP_VARIANT=development`:
  `com.langdk.ultimatestats.dev`
- Android development package: `com.langdk.ultimatestats.dev`
- Maestro flows live in `.maestro/`.
- The advanced tracker flow is `.maestro/tests/advanced-tracker-smoke.yml`.

Install Maestro outside the repo:

```bash
brew tap mobile-dev-inc/tap
brew install maestro
```

Build and install the development app before running flows:

```bash
npm run ios
```

Run the advanced tracker smoke flow:

```bash
npm run maestro:smoke
```

Run all Maestro test flows:

```bash
npm run maestro
```

Run every flow in `.maestro/tests/`:

```bash
npm run maestro:all
```

The npm scripts set `JAVA_HOME=/opt/homebrew/opt/openjdk` because the Maestro Homebrew formula
installs OpenJDK but macOS may not expose it through `/usr/libexec/java_home`. They also set
`MAESTRO_CLI_NO_ANALYTICS=1` so first-run analytics setup cannot block automated agent runs.

## Flow Authoring Rules

1. Prefer `testID` selectors over visible text for controls.
2. Use visible text assertions for user-facing outputs that must be verified.
3. Use `scrollUntilVisible` for Dashboard actions below the first viewport; Maestro only sees the
   current accessibility tree.
4. Keep flows short and scenario-focused. Split setup into helper flows with `runFlow` once the suite grows.
5. Use `launchApp` for installed dev builds. Avoid `clearState: true` unless the flow handles onboarding, because first launch routes through the tutorial.
6. Use `openLink` for direct route setup when a Dashboard dev button is partially clipped or
   scroll-sensitive; verify dev-only reachability separately with a visible assertion.
7. Use `takeScreenshot` after important assertions so agents can inspect simulator output artifacts.
8. If an element is slow to appear, use `extendedWaitUntil`; `assertVisible` already retries briefly.
9. If iOS cannot tap a nested React Native element, follow Maestro's React Native guidance: make the inner pressable accessible/selectable and avoid targeting swallowed wrapper views.

## Selector Conventions

Use stable kebab-case ids:

- Screen roots: `advanced-tracker-pregame-screen`
- Navigation: `scoreboard-home-button`
- Primary actions: `advanced-tracker-new-game-button`
- Tracker actions: `advanced-tracker-set-line-button`
- Player chips, later: `advanced-tracker-player-<stable-player-id>`

When adding a selector, put `testID` on the actual `Pressable`, `TextInput`, or screen root being asserted.

## Current Smoke Flow

The first flow verifies that an already-installed dev app can open the advanced tracker setup screen:

```yaml
appId: com.langdk.ultimatestats
name: Advanced Tracker Smoke
---
- launchApp
- tapOn:
    id: 'scoreboard-home-button'
- assertVisible:
    text: 'DASHBOARD'
- scrollUntilVisible:
    element:
      id: 'advanced-tracker-new-game-button'
    direction: DOWN
    timeout: 10000
    visibilityPercentage: 10
- tapOn:
    id: 'advanced-tracker-new-game-button'
- assertVisible:
    text: 'ADVANCED TRACKER'
- takeScreenshot:
    path: .maestro/screenshots/advanced-tracker-pregame
```

## Next Useful Flows

- Pre-game setup: select receiving side, confirm line setup is disabled until seven players are selected.
- Line select: add player-chip `testID`s and verify seven selected players enables `advanced-tracker-set-line-button`.
- Pull tracking: verify pull timing, pull result, and transition into `advancedTracking/Tracker`.
- Output checks: score bar, cap bar, possession state, and player grid screenshots after known actions.
