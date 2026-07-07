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
└── docs/              # Documentation (you are here)
```

## Key Concepts

### Onboarding

First launch is gated by `useTutorialStore` hydration and routes through `/TutorialIntro`,
`/TutorialScoreboard`, and `/TutorialComplete` before the normal `/` entry route starts sending the
user to `/Dashboard` or `/Scoreboard`.

### Stat Tracking

When enabled, the app records:

- Goals and assists
- Turnovers (blocks, throwaways, drops, 50/50s)
- Plus/minus per player

See: [stat-tracking.md](stat-tracking.md), [turnover-tracking.md](turnover-tracking.md)

### Game Events

All stats are stored as `GameEvent[]` in chronological order, enabling timeline reconstruction and CSV export.

### Possession

Tracks which team has the disc, enabling turnover detection when user taps the non-possessing team.

### Teams & Rosters

- `currentTeam` - Active team with roster
- `savedTeams` - Persisted team presets
- `savedGames` - Completed game records

## Quick Links

| Topic          | Documentation                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Agent Guide    | [GEMINI.md](../GEMINI.md) / [AGENTS.md](../AGENTS.md)                                                            |
| Responsive     | [responsive-layout.md](responsive-layout.md)                                                                     |
| Builds         | [Development](build/development-build.md) / [Production](build/production-build.md) / [OTA](build/eas-update.md) |
| Completed Docs | [completed/responsive-scaling-tracker.md](completed/responsive-scaling-tracker.md)                               |
| Modals         | [ui-patterns.md](ui-patterns.md) / [navigation-map.md](navigation-map.md)                                        |
| Platforms      | [platform-support.md](platform-support.md)                                                                       |
| iOS Follow-ups | [ios-followups.md](ios-followups.md)                                                                             |
| Themes         | [theming.md](theming.md)                                                                                         |
| UI Patterns    | [ui-patterns.md](ui-patterns.md)                                                                                 |
| Stats          | [stat-tracking.md](stat-tracking.md)                                                                             |
| Turnovers      | [turnover-tracking.md](turnover-tracking.md)                                                                     |
| View Stats     | [view-stats.md](view-stats.md)                                                                                   |
| Game Logic     | [game-logic.md](game-logic.md)                                                                                   |
| Testing        | [testing.md](testing.md)                                                                                         |
| Testing Map    | [testing-map.md](testing-map.md)                                                                                 |
| State          | [state-ownership.md](state-ownership.md)                                                                         |
| Navigation     | [navigation-map.md](navigation-map.md)                                                                           |
| Events         | [event-model.md](event-model.md)                                                                                 |
| Voice Input    | [advanced-tracking-voice.md](advanced-tracking-voice.md)                                                         |
| Tech Debt      | [tech-debt.md](tech-debt.md)                                                                                     |

## New Screen Checklist

When adding a new screen or modal route:

1. Start with [responsive-layout.md](responsive-layout.md) and choose the correct orientation support tier.
2. Follow [ui-patterns.md](ui-patterns.md) for header, safe area, and component structure conventions.
3. If the route is a modal, follow [ui-patterns.md](ui-patterns.md) and ensure dismissal/navigation contracts match [navigation-map.md](navigation-map.md).
