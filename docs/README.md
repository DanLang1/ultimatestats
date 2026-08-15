# Project Overview

> Quick reference for the U-Stat codebase.

## What is U-Stat?

A mobile app for tracking Ultimate Frisbee game scores and player statistics, built with React Native + Expo.

Platform support details are documented in [platform-support.md](platform-support.md).

## Directory Structure

```
├── app/               # Expo Router screens
│   ├── (main)/(hub)/  # Main tabs for dashboard, game, team, and analytics
│   ├── (main)/advancedTracking/ # Advanced tracker routes
│   ├── (modals)/      # Modal routes
│   └── _layout.tsx    # Navigation configuration
├── components/        # Reusable components
│   ├── advancedTracking/ # Advanced-mode tracker and analytics UI
│   ├── basic/         # Basic-mode scoreboard, timeline, and entry UI
│   ├── ui/            # Generic UI (buttons, chips, etc.)
│   ├── view-stats/    # Stats display components
│   ├── tutorial/      # Routed onboarding and tutorial components
│   └── *.tsx          # Shared visual primitives
├── store/             # Zustand stores with Immer
│   ├── basic/         # Basic-mode game state
│   ├── advancedTracking/ # Advanced-mode tracking and saved game state
│   └── *.ts           # Shared app stores
├── lib/               # Utilities and helpers
│   ├── basic/         # Basic-mode game logic, stats, timeline, and tests
│   ├── advancedTracking/ # Advanced-mode domain logic, analytics, and tests
│   ├── constants.ts   # App-wide constants (name limits, etc.)
│   ├── storage/       # AsyncStorage helpers
│   └── *.ts           # Shared helpers and infrastructure
├── theme/             # Theming system
│   └── theme.ts       # Color palettes, dark/light mode
├── hooks/             # Custom React hooks
│   ├── basic/         # Basic-mode gameplay hooks
│   └── advancedTracking/ # Advanced-mode tracker hooks
├── context/           # React contexts (Theme, Alert)
├── test/              # Route tests, test harnesses, fixtures, and native-boundary mocks
└── docs/              # Documentation (you are here)
```

## Key Concepts

### Onboarding

First launch is gated by `useTutorialStore` hydration and routes through `/TutorialIntro`,
`/TutorialScoreboard`, and `/TutorialComplete` before the normal `/` entry route starts sending the
user to `/Dashboard` or `/Scoreboard`.

### Stat Tracking

Basic tracking records a chronological `GameEvent[]` stream for:

- Goals and assists
- Turnovers (blocks, throwaways, drops, 50/50s)
- Plus/minus per player

See: [stat-tracking.md](stat-tracking.md), [turnover-tracking.md](turnover-tracking.md)

Advanced tracking uses a separate point-first model for pulls, pass chains, possession changes,
stoppages, both-team tracking, and scrimmages. See
[features/advanced-tracking/](features/advanced-tracking/README.md).

### Game Events

Basic stats are stored as `GameEvent[]` in chronological order, enabling timeline reconstruction
and CSV export. Advanced actions are stored under ordered points and possessions; do not mix the
two domain models.

### Possession

Both trackers persist possession explicitly enough for fast capture and derive analytics from their
respective event models.

### Teams, Games, and Persistence

- The basic store owns the active team, basic live game, saved basic games, and saved teams.
- The advanced live store owns the loaded `currentGame` and recovery state.
- The advanced saved-games store persists full advanced records and summaries through SQLite.
- Advanced tracking currently reads shared team/roster data from the basic store; the intended
  ownership cleanup is documented in
  [shared-team-roster-store.md](future-features/shared-team-roster-store.md).

## Quick Links

| Topic        | Documentation                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent Guide  | [AGENTS.md](../AGENTS.md)                                                                                                                                                 |
| Responsive   | [responsive-layout.md](responsive-layout.md)                                                                                                                              |
| Builds       | [Development](build/development-build.md) / [Preview](build/preview-build.md) / [Production](build/production-build.md) / [OTA](build/eas-update.md)                      |
| Modals       | [ui-patterns.md](ui-patterns.md) / [navigation-map.md](navigation-map.md)                                                                                                 |
| Platforms    | [platform-support.md](platform-support.md)                                                                                                                                |
| Themes       | [theming.md](theming.md)                                                                                                                                                  |
| UI Patterns  | [ui-patterns.md](ui-patterns.md)                                                                                                                                          |
| Stats        | [stat-tracking.md](stat-tracking.md)                                                                                                                                      |
| Turnovers    | [turnover-tracking.md](turnover-tracking.md)                                                                                                                              |
| View Stats   | [view-stats.md](view-stats.md)                                                                                                                                            |
| Game Logic   | [game-logic.md](game-logic.md)                                                                                                                                            |
| Testing      | [testing.md](testing.md)                                                                                                                                                  |
| Testing Map  | [testing-map.md](testing-map.md)                                                                                                                                          |
| State        | [state-ownership.md](state-ownership.md)                                                                                                                                  |
| Navigation   | [navigation-map.md](navigation-map.md)                                                                                                                                    |
| Events       | [event-model.md](event-model.md)                                                                                                                                          |
| Domain terms | [CONTEXT.md](../CONTEXT.md)                                                                                                                                               |
| Advanced     | [Feature map](features/advanced-tracking/README.md) / [Data model](features/advanced-tracking/data-model.md) / [Analytics](features/advanced-tracking/analytics-layer.md) |
| Sharing      | [features/sharing.md](features/sharing.md)                                                                                                                                |
| Voice Input  | [features/advanced-tracking/voice-input.md](features/advanced-tracking/voice-input.md)                                                                                    |
| Tech Debt    | [tech-debt.md](tech-debt.md)                                                                                                                                              |

## New Screen Checklist

When adding a new screen or modal route:

1. Start with [responsive-layout.md](responsive-layout.md) and choose the correct orientation support tier.
2. Follow [ui-patterns.md](ui-patterns.md) for header, safe area, and component structure conventions.
3. If the route is a modal, follow [ui-patterns.md](ui-patterns.md) and ensure dismissal/navigation contracts match [navigation-map.md](navigation-map.md).
