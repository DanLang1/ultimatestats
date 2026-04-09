# Stat Utils Layer

> **Status**: Brainstorm / Future Feature

## Overview

The stat utils layer sits below the analytics layer and above the UI. It accepts an `AnalyticsGame` (or subsets of its arrays) and returns typed stat values for display.

```
AdvancedTrackedGame          raw model — optimized for capture and editing
        ↓
  AnalyticsGame              analytics layer — one compiled pass, stat-friendly indexes
        ↓
  stat utils                 ← THIS LAYER — derives and presents stats
        ↓
  UI components              display stats to the user
```

Stat utils are pure functions. They do not persist anything, do not know about the UI, and do not mutate the analytics game.

## UFA Stat Alignment

Target coverage is aligned with [UFA game stats](https://www.watchufa.com/stats/game/2025-05-09-ATL-SD). The table below shows what we can derive from the current data model and what requires future field location support.

### Derivable Now

| Stat                     | Source                                                               | Notes                                                        |
| ------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Goals                    | `attributions` where `type === 'goal'`                               | Sum `weight`                                                 |
| Assists                  | `attributions` where `type === 'assist'`                             | Sum `weight`                                                 |
| Hockey Assists           | `attributions` where `type === 'hockey_assist'`                      | Sum `weight`                                                 |
| Callahans                | `attributions` where `type === 'callahan'`                           | Sum `weight`                                                 |
| Plus/Minus               | `goals + assists + blocks - throwaways - drops`                      | Mirrors basic tracking                                       |
| Completions              | `attributions` where `type === 'completion'`                         | Successful throws                                            |
| Throw Attempts           | `attributions` where `type === 'throw_attempt'`                      | Actual releases only — stalls are excluded                   |
| Completion %             | completions / throw attempts                                         | Null if 0 attempts                                           |
| Receptions               | `attributions` where `type === 'receiving_touch'`                    | Catches of throws                                            |
| Drops                    | `attributions` where `type === 'drop'`                               | Sum `weight`                                                 |
| Throwaways               | `attributions` where `type === 'throwaway'`                          | Sum `weight`                                                 |
| Stalls                   | `attributions` where `type === 'stall'`                              | Sum `weight`                                                 |
| Blocks                   | `attributions` where `type === 'block'`                              | Sum `weight`                                                 |
| Pulls                    | `attributions` where `type === 'pull'`                               | Per-player pull count                                        |
| Pull Receptions          | `attributions` where `type === 'pull_reception'`                     | Caught pulls                                                 |
| Total Touches            | `completion + receiving_touch + disc_pickup + pull_reception`        | Combines all touch types                                     |
| Points Played            | `points` where participant in `linesBySide`                          | Count                                                        |
| O-Points Played          | Points where participant's side === `receivingSideId`                | Subset of PP                                                 |
| D-Points Played          | Points where participant's side === `pullingSideId`                  | Subset of PP                                                 |
| Playing Time (ms)        | Sum of `durationMs` for points where participant is in `linesBySide` | Null if no timing data                                       |
| Playing Time %           | Player playing time / total game time                                | Null if no timing data                                       |
| Holds                    | `points` where `state === 'hold'` (or via `getPointStateForSide`)    | Count                                                        |
| Breaks                   | `points` where `state === 'break'`                                   | Count                                                        |
| Times Broken             | `points` where `state === 'broken'`                                  | Count                                                        |
| O-Efficiency             | holds / (holds + timesBroken)                                        | Null if 0 O-points. Available at both team and player level. |
| D-Efficiency             | breaks / (breaks + oppHolds)                                         | Null if 0 D-points. Available at both team and player level. |
| O-Line Conversion %      | holds / oPoints                                                      | UFA metric                                                   |
| D-Line Conversion %      | breaks / dPoints                                                     | UFA metric                                                   |
| Clean Holds              | `points` where `state === 'hold'` and `isCleanHold === true`         | Count                                                        |
| Dirty Holds              | `points` where `state === 'hold'` and `isCleanHold === false`        | Count                                                        |
| Possessions Per Point    | `possessions` grouped by `pointId`, average count                    | Team-level; also split as per-O-point and per-D-point        |
| Turnovers Per Point      | `possessions` where `result === 'turned_over'`, average per point    | Team-level                                                   |
| Scores After Turnovers   | `possessions` where `possessionIndex > 0` and `result === 'scored'`  | Count                                                        |
| Longest Scoring Run      | Max consecutive points where side scored                             | Team-level                                                   |
| Longest Drought          | Max consecutive points where side did not score                      | Team-level                                                   |
| Pull Outcomes            | `actions` where `kind === 'pull'`, group by `result`                 | Team-level                                                   |
| Pull Hang Time           | `actions` where `kind === 'pull'`, average `hangTimeMs`              | Team-level                                                   |
| Avg Point Duration       | Average of `durationMs` across scored points                         | Exclude nulls                                                |
| Longest / Shortest Point | Max / min `durationMs`                                               | Exclude nulls                                                |

### Requires Field Location Data (Future)

These stats require `locationMode: 'zone'` or `'xy'` and origin/target on throw and pull actions:

| Stat                        | Requirement                                          |
| --------------------------- | ---------------------------------------------------- |
| Receiving Yards             | `xy` coordinates on throw target                     |
| Throwing Yards              | `xy` coordinates on throw origin + target            |
| Total Yards                 | Sum of receiving + throwing                          |
| Hucks / Huck %              | Distance derivation from `xy` (typically > 30 yards) |
| Red Zone Conversion %       | Zone or `xy` proximity to endzone                    |
| Heat Maps                   | `xy` coordinates on catches                          |
| Throw Distance Distribution | `xy` coordinates on throws                           |
| Field Progression           | `xy` per action within a point                       |

## Utility File Structure

Four utility files, each focused on a stat domain:

### `advancedPlayerStatsUtils.ts`

Player-level stat derivation. Returns `AdvancedPlayerStats` per participant.

Core approach: single pass over `game.attributions`, bucketing by `participantId` and `type`, summing weights. Points played and O/D split derived from `game.points` + `linesBySide`.

When `AnalyticsGame.gameType === 'scrimmage'`, side-filtered player stats are point-scoped: a participant's attributions only count toward a side filter for points where that participant was on that side.

### `advancedTeamStatsUtils.ts`

Team/possession-level stats. Returns `AdvancedTeamStats` for a given `sideId`.

Uses `getPointStateForSide` so the same function works for both-team tracking and scrimmages without needing separate logic.

### `advancedPullStatsUtils.ts`

Pull-specific stats. Returns `PullStats` with outcome breakdowns and average hang time.

### `advancedTimingStatsUtils.ts`

Point duration stats. Returns `AdvancedTimingStats` with averages, extremes, and a `hasTimingData` flag for graceful fallback when timestamps are absent.

Half-split timing stats are supported via the caller pre-filtering `game.points` on `point.half` (1 or 2) before passing the game to `computeAdvancedTimingStats`. This is the standard pattern — stat utils operate on a single `AnalyticsGame`, filtering is the caller's responsibility.

## Design Principles

- **Attribution-first**: Player stats are derived from the pre-resolved `attributions` array, never by re-traversing raw actions. This is the whole point of the analytics layer.
- **Perspective-neutral by default**: Team stats use `getPointStateForSide` so a single `AnalyticsGame` can produce stats for either side.
- **Null over zero**: Percentages and averages return `null` when the denominator is zero (e.g., completion % with 0 throw attempts). This lets the UI distinguish "no data" from "0%".
- **No formatting**: Stat utils return raw numbers. Formatting (rounding, percentage display, duration formatting) is a UI concern.
- **No filtering**: Stat utils operate on a single `AnalyticsGame`. Filtering by date range, opponent, tournament, or half is the caller's responsibility — either by passing a subset of games or by pre-filtering the analytics arrays.
