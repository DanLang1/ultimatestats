# Project Overview

> Quick reference for the U-Stat codebase.

## What is U-Stat?

A mobile app for tracking Ultimate Frisbee game scores and player statistics, built with React Native + Expo.

Platform support details are documented in [platform-support.md](platform-support.md).

## Directory Structure

```
├── app/               # Expo Router screens
│   ├── index.tsx      # Main scoreboard
│   ├── Settings.tsx   # Game and app settings
│   ├── ViewStats.tsx  # Stats viewer
│   ├── PlayerStats.tsx # Individual player stats
│   ├── EditRoster.tsx # Roster management
│   ├── *Modal.tsx     # Modal screens (transparent overlays)
│   └── _layout.tsx    # Navigation configuration
├── components/        # Reusable components
│   ├── ui/            # Generic UI (buttons, chips, etc.)
│   ├── stat-entry/    # Stat entry flow components
│   ├── view-stats/    # Stats display components
│   ├── tutorial/      # Tutorial overlay components
│   └── *.tsx          # Feature components
├── store/             # Zustand stores with Immer
│   ├── gameStore.ts   # Main game state
│   └── *.types.ts     # TypeScript interfaces
├── lib/               # Utilities and helpers
│   ├── constants.ts   # App-wide constants (name limits, etc.)
│   ├── gameUtils.ts   # Game logic (checkGameOver)
│   ├── statsUtils.ts  # Stats calculations, CSV export
│   ├── storage/       # AsyncStorage helpers
│   └── __tests__/     # Unit tests
├── theme/             # Theming system
│   └── theme.ts       # Color palettes, dark/light mode
├── hooks/             # Custom React hooks
├── context/           # React contexts (Theme, Alert)
└── docs/              # Documentation (you are here)
```

## Key Concepts

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

| Topic          | Documentation                                                                      |
| -------------- | ---------------------------------------------------------------------------------- |
| Agent Guide    | [GEMINI.md](../GEMINI.md) / [AGENTS.md](../AGENTS.md)                              |
| Responsive     | [responsive-layout.md](responsive-layout.md)                                       |
| Completed Docs | [completed/responsive-scaling-tracker.md](completed/responsive-scaling-tracker.md) |
| Modals         | [modals.md](modals.md)                                                             |
| Platforms      | [platform-support.md](platform-support.md)                                         |
| iOS Follow-ups | [ios-followups.md](ios-followups.md)                                               |
| Themes         | [theming.md](theming.md)                                                           |
| UI Patterns    | [ui-patterns.md](ui-patterns.md)                                                   |
| Stats          | [stat-tracking.md](stat-tracking.md)                                               |
| Turnovers      | [turnover-tracking.md](turnover-tracking.md)                                       |
| View Stats     | [view-stats.md](view-stats.md)                                                     |
| Game Logic     | [game-logic.md](game-logic.md)                                                     |
| Testing        | [testing.md](testing.md)                                                           |
| Testing Map    | [testing-map.md](testing-map.md)                                                   |
| Rules          | [architecture-rules.md](architecture-rules.md)                                     |
| State          | [state-ownership.md](state-ownership.md)                                           |
| Navigation     | [navigation-map.md](navigation-map.md)                                             |
| Events         | [event-model.md](event-model.md)                                                   |
| Tech Debt      | [tech-debt.md](tech-debt.md)                                                       |

## New Screen Checklist

When adding a new screen or modal route:

1. Start with [responsive-layout.md](responsive-layout.md) and choose the correct orientation support tier.
2. Follow [ui-patterns.md](ui-patterns.md) for header, safe area, and component structure conventions.
3. If the route is a modal, follow [modals.md](modals.md) and ensure dismissal/navigation contracts match [navigation-map.md](navigation-map.md).
