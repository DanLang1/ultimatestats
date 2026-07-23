# Testing Map

Use this to choose test coverage quickly based on the feature you changed.

## Choose the Test Layer

| Change                                                                                 | Start with                               | Add another layer when                                                        |
| -------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| Calculation, parser, migration, store action, or edge case                             | Jest unit/domain test                    | The result also needs user-visible wiring verification                        |
| One route's rendering, guard, accessibility, or local interaction                      | React Native Testing Library screen test | Correctness depends on a real route transition or native control              |
| Navigation, modal sequence, gesture, native behavior, or multi-screen tracker workflow | Maestro E2E test                         | Also add a unit or screen regression for the underlying defect when practical |

`npm test` runs both Jest unit/domain tests and React Native Testing Library screen tests. It does
not run Maestro or launch a simulator.

## Automated Test Targets

Logic and route tests live in `__tests__/` directories near the code they cover. Shared route-test
fixtures, native-boundary adapters, and provider wrappers live in `test/`.

| Change Area                           | Primary Tests                                                                                                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Game end rules / scoring caps         | `lib/basic/__tests__/gameUtils.test.ts`, `lib/basic/__tests__/timeoutUtils.test.ts`                                                                                                                                                         |
| Halftime marker utilities             | `lib/basic/__tests__/halftimeUtils.test.ts`                                                                                                                                                                                                 |
| Gender ratio / line expectations      | `lib/__tests__/genderRatioUtils.test.ts`, `lib/__tests__/lineUtils.test.ts`                                                                                                                                                                 |
| Event timeline / point reconstruction | `lib/basic/__tests__/timelineUtils.test.ts`                                                                                                                                                                                                 |
| Player/team stats calculations        | `lib/basic/__tests__/statsUtils.test.ts`, `lib/basic/__tests__/teamStatsUtils.test.ts`, `lib/basic/__tests__/playerStatsUtils.test.ts`, `lib/basic/__tests__/playingTimeStatsUtils.test.ts`, `lib/basic/__tests__/timingStatsUtils.test.ts` |
| Import/share payload behavior         | `lib/__tests__/importTeamTransform.test.ts`, `lib/__tests__/sharingPayloadSize.test.ts`                                                                                                                                                     |
| Saved-game schema migrations          | `lib/storage/__tests__/migrations.test.ts`, `lib/storage/__tests__/migrations.snapshot.test.ts`                                                                                                                                             |

## User-facing route coverage

| Route group        | Covered routes                                                                                                                                                                                               | Colocated test target                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Entry and recovery | `/`, `+not-found`, `/s/[kind]/[shareId]`                                                                                                                                                                     | `app/__tests__/EntryRoutes.test.tsx`, `app/s/[kind]/__tests__/ShareLinkRedirect.test.tsx`           |
| Home               | `Dashboard`, `About`, `Help`, `Partners`, `Showcase`                                                                                                                                                         | `app/(main)/(hub)/(home)/__tests__/`                                                                |
| Basic game         | `PreGameConfirm`, `Scoreboard`, `GameInfo`, `GameFormat`, `GameComplete`, `Settings`, `EditRoster`, `LineEditor`, `LinePresetEditor`                                                                         | `app/(main)/__tests__/`, `app/(main)/(hub)/(game)/__tests__/`, `app/(main)/(hub)/(team)/__tests__/` |
| Basic analytics    | `ViewStats`, `PlayerStats`, `GameTimeline`, `SavedGameStats`, `AggregateStats`, `CreateTournament`, `/saved-games/[gameId]`                                                                                  | `app/(main)/(hub)/(analytics)/__tests__/BasicAnalyticsRoutes.test.tsx`                              |
| Tutorials          | `TutorialIntro`, `TutorialScoreboard`, `TutorialComplete`, `TutorialStatIntro`, `TutorialStatScoreboard`, `TutorialStatComplete`, `TutorialAdvancedTracker`                                                  | `app/(main)/__tests__/TutorialRoutes.test.tsx`                                                      |
| Advanced game      | `advancedTracking/PreGameConfirm`, `TrackerLineSelect`, `PullTracking`, `Tracker`, `TrackerEditLine`, `TrackerInjurySub`, `TrackerGameComplete`                                                              | `app/(main)/advancedTracking/__tests__/AdvancedRoutes.test.tsx`                                     |
| Advanced analytics | `advancedTracking/analytics/[gameId]`, `advancedTracking/analytics/playerStats`, `advancedTracking/analytics/timeline/[gameId]`                                                                              | `app/(main)/(hub)/(analytics)/advancedTracking/__tests__/AdvancedAnalyticsRoutes.test.tsx`          |
| Import             | `Import`, `ImportTeam`                                                                                                                                                                                       | `app/(main)/__tests__/ImportRoutes.test.tsx`                                                        |
| Modal routes       | `AdvancedGameSelectorModal`, `EditDurationModal`, `EditEventModal`, `EditPlayerModal`, `GameSelectorModal`, `HalftimeModal`, `NumberPickerModal`, `PointSummaryModal`, `TeamManagementModal`, `TimeoutModal` | `app/(modals)/__tests__/ModalRoutes.test.tsx`                                                       |

Navigator `_layout.tsx` files are shells rather than independent screens. `app/__maestro_seed__.tsx`
is an automated-test-only endpoint. Those files are intentionally excluded from the user-facing
route suite.

## Advanced-tracker end-to-end coverage

Maestro runs against the installed iOS simulator app. Most flows enter through the test-only seed
route and then exercise the real tracker UI; `advanced-tracker-ui-setup.yml` separately protects the
full Dashboard → New Game → setup → line/pull entry path.

| Command                 | Scope                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run maestro:smoke` | One fast advanced-tracker point/action smoke flow                                                                                             |
| `npm run maestro`       | Core menus, score bar, pulls, turnovers, stoppages, rare actions, cap modes, midpoint stats, and the full-UI setup smoke; excludes `extended` |
| `npm run maestro:all`   | All core flows plus extended defense, pass-chain, full-cycle, and completed-game stats scenarios                                              |

Maestro coverage is intentionally narrower than route-test coverage. The screen suite gives every
important route a fast deterministic check; Maestro protects the advanced-tracking journeys where
cross-screen and native-device behavior carry the most risk.

## Manual Smoke Checklist

### Scoreboard / Live Game

1. Score for both teams.
2. Undo last action.
3. Trigger turnover flow and timeout flow.
4. Verify point transition/summary behavior.

### Stat Entry / Turnover Entry

1. Record goal + assist.
2. Record each turnover subtype.
3. Cancel/dismiss path should not corrupt score/events.

### Timeline / Event Editing

1. Open timeline for current game.
2. Edit goal and turnover events.
3. Delete an event and verify totals remain coherent.

### View Stats / Player Stats

1. Open team and player views.
2. Switch tabs/filters/saved games.
3. Validate key totals against known events.

## Command Quick Start

```bash
# Unit/domain and screen integration suites
npm test

# Screen integration suites only
npm test -- app

# Focused target examples
npm test -- gameUtils
npm test -- timelineUtils
npm test -- statsUtils

# Installed-app advanced-tracker E2E suite
npm run maestro
```

## When to Add a New Test

- Any change to event semantics or score progression.
- Any change to game-over, soft-cap, halftime, or timeout logic.
- Any bug fix where behavior previously regressed.
- Any new user-facing route or route guard needs a screen integration test.
- Any high-risk navigation/native workflow needs a focused Maestro flow or an update to an existing
  one.
