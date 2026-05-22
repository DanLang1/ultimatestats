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

## Known Quirks

- **React Native `<Modal>` hierarchy capture:** The Modal renders in a separate native view.
  Maestro's `inspect_screen` / hierarchy snapshot may show an empty app view when a modal is open —
  the modal content IS present on screen but may not appear in the hierarchy dump. This is a known
  XCUITest ↔ React Native Modal quirk. Use `takeScreenshot` instead of relying on hierarchy alone
  to verify what is shown inside a modal.
- **Disc-on-ground after stall turnover:** After a stall-defense or stall-offense turnover, the disc
  is on the ground (`discHolderRef` is null). The rare menu offense items (Opp D, 50/50, Stall) are
  **correctly disabled** in this state — they require a known disc holder to operate. Do not write
  flows that expect rare-menu offense items to be tappable immediately after a stall turnover without
  an explicit pickup tap.
- **Stall-defense flow ordering:** Stall-defense leaves the rare menu offense items disabled
  (disc-on-ground). Place stall-defense as the **last** scenario in any flow that tests it, since
  the rare menu can't be meaningfully interacted with afterward. If you need to test something after
  stall-defense, end the point via `defense-opp-goal` → `tracker-next-point` → `select-line-and-pull`
  to get a clean point.

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
- Navigation: `dashboard-new-game-button` (Dashboard), `new-game-sheet-advanced` (modal)
- Primary actions: `advanced-tracker-new-game-button`
- Tracker actions: `advanced-tracker-set-line-button`
- Player chips, later: `advanced-tracker-player-<stable-player-id>`

When adding a selector, put `testID` on the actual `Pressable`, `TextInput`, or screen root being asserted.

## Deterministic Flow Principles

- **No `optional: true`** — every assertion and action must be required. This makes tests fail fast on real issues instead of silently tolerating wrong states.
- **One path per flow** — always pick a single pull result (`inbound` by default), assert a single screen title, never offer "either/or" branching.
- **One screenshot per test** — only at the end to confirm final state, not at every intermediate step. Each screenshot adds ~500ms-1s overhead.
- **Consistent tracker arrival** — always assert `TAP WHO STARTS WITH DISC` after setup or pull navigation to verify correct state before acting.

## Current Game Entry Flow

Tap `dashboard-new-game-button` on the Dashboard to open the `NewGameSheet` modal, then tap `new-game-sheet-advanced` to navigate to the Advanced Tracker pre-game screen. No scrolling required.

```yaml
appId: com.langdk.ultimatestats
name: Advanced Tracker Setup
---
- stopApp
- launchApp
- tapOn:
    id: 'dashboard-new-game-button'
- tapOn:
    id: 'new-game-sheet-advanced'
- assertVisible:
    text: 'ADVANCED TRACKER'
```

## Shared Flows

- `flows/setup-game.yaml` — full setup: launch → Dashboard → modal → pre-game → line select → pull → tracker.
- `flows/select-line-and-pull.yaml` — between-point flow: line select → pull → tracker (always inbound, always asserts `Select Line` and `TAP WHO STARTS WITH DISC`).
- No more `record-opp-goal-point.yaml` — the opponent-goal pattern is only 3-4 steps, so it's inlined into tests.
