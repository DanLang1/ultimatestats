# Project Overview

> Quick reference for the U-Stat codebase.

## What is U-Stat?

A mobile app for tracking Ultimate Frisbee game scores and player statistics, built with React Native + Expo.

The source tree follows a basic/advanced split mirroring the two tracking domains: `app/` holds Expo
Router screens, and `components/`, `hooks/`, `lib/`, and `store/` each contain a `basic/` and
`advancedTracking/` namespace alongside shared files.

## Key Concepts

### Onboarding

First launch is gated by `useTutorialStore` hydration and follows the advanced-first path:
`/TutorialIntro` → `/TutorialAdvancedLineSelect` → `/TutorialAdvancedTracker` → `/Dashboard`.
The tutorial line and gesture screens use pre-seeded participants and own all presentation and
interaction state. They intentionally avoid tutorial props or branches in production tracker and
team screens. Onboarding completion is recorded before returning users to Dashboard; only fresh
installs enter the tutorial automatically.

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

## Where to Look First

These docs answer "which and why" questions that reading the source cannot. Route inventories,
file lists, and directory trees are intentionally omitted — resolve those with the filesystem.

| Topic                      | Documentation                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Agent guide                | [AGENTS.md](../AGENTS.md)                                                                                       |
| Domain terms               | [CONTEXT.md](../CONTEXT.md)                                                                                     |
| State ownership            | [state-ownership.md](state-ownership.md) — which store owns what, and the rules for adding state                |
| Which test owns a change   | [testing-map.md](testing-map.md)                                                                                |
| Testing patterns           | [testing.md](testing.md)                                                                                        |
| Navigation contracts       | [navigation-map.md](navigation-map.md) — core flows, route gating, and the modal exit contract                  |
| UI conventions             | [ui-patterns.md](ui-patterns.md)                                                                                |
| Responsive/orientation     | [responsive-layout.md](responsive-layout.md)                                                                    |
| Theming                    | [theming.md](theming.md)                                                                                        |
| Basic game logic           | [game-logic.md](game-logic.md)                                                                                  |
| Basic event model          | [event-model.md](event-model.md)                                                                                |
| Basic stats/turnovers      | [stat-tracking.md](stat-tracking.md) / [turnover-tracking.md](turnover-tracking.md)                             |
| Basic analytics            | [view-stats.md](view-stats.md)                                                                                  |
| Line selection             | [line-selection.md](line-selection.md)                                                                          |
| Advanced architecture      | [features/advanced-tracking/README.md](features/advanced-tracking/README.md)                                    |
| Advanced data model        | [features/advanced-tracking/data-model.md](features/advanced-tracking/data-model.md)                            |
| Advanced analytics layer   | [features/advanced-tracking/analytics-layer.md](features/advanced-tracking/analytics-layer.md)                  |
| Advanced stat utilities    | [features/advanced-tracking/stat-utils.md](features/advanced-tracking/stat-utils.md)                            |
| Advanced voice input       | [features/advanced-tracking/voice-input.md](features/advanced-tracking/voice-input.md)                          |
| Sharing                    | [features/sharing.md](features/sharing.md)                                                                      |
| Android native crashes     | [android-crashes.md](android-crashes.md) — reproduced Fabric crash workarounds and when not to generalize them  |
| Builds                     | [Development](build/development-build.md) / [Preview](build/preview-build.md) / [Production](build/production-build.md) / [OTA](build/eas-update.md) |
| Tech debt / future work    | [tech-debt.md](tech-debt.md) and [future-features/](future-features/)                                           |

## New Screen Checklist

When adding a new screen or modal route:

1. Start with [responsive-layout.md](responsive-layout.md) and choose the correct orientation support tier.
2. Follow [ui-patterns.md](ui-patterns.md) for header, safe area, and component structure conventions.
3. If the route is a modal, follow [ui-patterns.md](ui-patterns.md) and ensure dismissal/navigation contracts match [navigation-map.md](navigation-map.md).
