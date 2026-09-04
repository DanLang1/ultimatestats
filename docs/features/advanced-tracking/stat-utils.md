# Stat Utils Layer

> Maintained reference for the implemented advanced analytics utilities in
> `lib/advancedTracking/`.

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

The table below shows what the current data model can derive and what still requires field-location
support.

### Derivable Now

| Stat                     | Source                                                                                        | Notes                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Goals                    | `attributions` where `type === 'goal'`                                                        | Sum `weight`                                                           |
| Assists                  | `attributions` where `type === 'assist'`                                                      | Sum `weight`                                                           |
| Hockey Assists           | `attributions` where `type === 'hockey_assist'`                                               | Sum `weight`                                                           |
| Callahans                | `attributions` where `type === 'callahan'`                                                    | Defensive turnover goals; no assister                                  |
| Plus/Minus               | `goals + assists + blocks + stalls + (0.5 × pressures) - throwaways - drops - stallsConceded` | Pressure is worth half a block                                         |
| Completions              | `attributions` where `type === 'completion'`                                                  | Successful throws                                                      |
| Throw Attempts           | `attributions` where `type === 'throw_attempt'`                                               | Actual releases only — stalls are excluded                             |
| Completion %             | completions / throw attempts                                                                  | Null if 0 attempts                                                     |
| Receptions               | `attributions` where `type === 'receiving_touch'`                                             | Catches of throws                                                      |
| Drops                    | `attributions` where `type === 'drop'`                                                        | Sum `weight`                                                           |
| Throwaways               | `attributions` where `type === 'throwaway'`                                                   | Sum `weight`                                                           |
| Stalls                   | `attributions` where `type === 'stall'`                                                       | Sum `weight`                                                           |
| Blocks                   | `attributions` where `type === 'block'`                                                       | Sum `weight`                                                           |
| Pressures                | `attributions` where `type === 'pressure'`                                                    | Defensive pressure directly forces a turnover without a block or stall |
| Pulls                    | `attributions` where `type === 'pull'`                                                        | Per-player pull count                                                  |
| Pull Receptions          | `attributions` where `type === 'pull_reception'`                                              | Caught pulls                                                           |
| Total Touches            | `completion + receiving_touch + disc_pickup + pull_reception`                                 | Combines all touch types                                               |
| Points Played            | `points` where participant in `linesBySide`                                                   | Count                                                                  |
| O-Points Played          | Points where participant's side === `receivingSideId`                                         | Receiving points; subset of PP                                         |
| D-Points Played          | Points where participant's side === `pullingSideId`                                           | Pulling points; subset of PP                                           |
| Playing Time (ms)        | Sum of `durationMs` for points where participant is in `linesBySide`                          | Null if no timing data                                                 |
| Playing Time %           | Player playing time / total game time                                                         | Null if no timing data                                                 |
| Holds                    | `points` where `state === 'hold'` (or via `getPointStateForSide`)                             | Count                                                                  |
| Breaks                   | `points` where `state === 'break'`                                                            | Count                                                                  |
| Times Broken             | `points` where `state === 'broken'`                                                           | Count                                                                  |
| Hold Rate                | holds / completed O-points                                                                    | Null if 0 completed O-points                                           |
| O-Possession Conversion  | scoring O-point possessions / all O-point possessions owned by side                           | Null if 0 O-point possessions                                          |
| D-Efficiency             | breaks / completed D-points                                                                   | Null if 0 completed D-points. Available at both team and player level. |
| D-Possession Conversion  | scoring D-point possessions / all D-point possessions owned by side                           | Null if 0 D-point possessions                                          |
| Overall Conversion       | all scoring possessions / all possessions owned by side                                       | Null if 0 possessions                                                  |
| Red Zone Conversion      | scoring marked possessions / resolved marked possessions                                      | Null if no marked possession has resolved                              |
| Time to Red Zone         | active-play time from point start to Red Zone entry                                           | Average excludes missing timing                                        |
| Red Zone Outcome Time    | active-play time from Red Zone entry to goal or turnover                                      | Resolved marked possessions only                                       |
| Clean Holds              | `points` where `state === 'hold'` and `isCleanHold === true`                                  | Count                                                                  |
| Dirty Holds              | `points` where `state === 'hold'` and `isCleanHold === false`                                 | Count                                                                  |
| Break Chances            | Completed D-points where side gained at least one possession                                  | Count                                                                  |
| Possessions Per Point    | `possessions` grouped by `pointId`, average count                                             | Team-level; also split as per-O-point and per-D-point                  |
| Turnovers Per Point      | `possessions` where `result === 'turned_over'`, average per point                             | Team-level                                                             |
| Goals After Turnovers    | Our `possessions` where `possessionIndex > 0` and `result === 'scored'`                       | Count                                                                  |
| Break Efficiency         | breaks / completed D-points where side gained at least one possession                         | Null if the side had no D chances                                      |
| Multi-Possession Points  | Completed points where side had two or more possessions                                       | Count / percent                                                        |
| Longest Scoring Run      | Max consecutive points where side scored                                                      | Team-level                                                             |
| Longest Drought          | Max consecutive points where side did not score                                               | Team-level                                                             |
| Pull Outcomes            | `actions` where `kind === 'pull'`, group by `result`                                          | Team-level                                                             |
| Pull Hang Time           | `actions` where `kind === 'pull'`, average `hangTimeMs`                                       | Team-level                                                             |
| Avg Point Duration       | Average of `durationMs` across completed points                                               | Exclude nulls                                                          |
| Longest / Shortest Point | Max / min `durationMs`                                                                        | Exclude nulls                                                          |

An O-point is a side's receiving point, and a D-point is its pulling point. Neither label denotes
a permanent player role or a specific lineup.

Manually classified throws are available on throw analytics actions as
`details.type: 'huck' | 'backfield_reset'`. Throw-type summaries derive huck attempts,
completions, completion percentage, turnover outcomes, and receiver event counts from those
actions. Backfield reset is turnover-only and has no completion rate. Missing classifications are
expected because tagging is optional, so these summaries may not represent every throw.

### Requires Field Location Data (Future)

These stats require `locationMode: 'zone'` or `'xy'` and origin/target on throw and pull actions:

| Stat                          | Requirement                                          |
| ----------------------------- | ---------------------------------------------------- |
| Receiving Yards               | `xy` coordinates on throw target                     |
| Throwing Yards                | `xy` coordinates on throw origin + target            |
| Total Yards                   | Sum of receiving + throwing                          |
| Distance-based Hucks / Huck % | Distance derivation from `xy` (typically > 30 yards) |
| Measured Red Zone Conversion  | Zone or `xy` proximity to endzone                    |
| Heat Maps                     | `xy` coordinates on catches                          |
| Throw Distance Distribution   | `xy` coordinates on throws                           |
| Field Progression             | `xy` per action within a point                       |

## Utility File Structure

Core utility files are organized by stat domain:

### `advancedPlayerStatsUtils.ts`

Player-level stat derivation. Returns `AdvancedPlayerStats` per participant.

Core approach: single pass over `game.attributions`, bucketing by `participantId` and `type`, summing weights. Points played and O/D split derived from `game.points` + `linesBySide`.

When `AnalyticsGame.gameType === 'scrimmage'`, side-filtered player stats are point-scoped: a participant's attributions only count toward a side filter for points where that participant was on that side.

### `advancedTeamStatsUtils.ts`

Team/possession-level stats. Returns `AdvancedTeamStats` for a given `sideId`.

Uses `getPointStateForSide` so the same function works for both-team tracking and scrimmages without needing separate logic.

Possession conversion denominators include every possession owned by the side, including the
current `in_progress` or `terminated` possession. The returned `totalPossessionsOnO` and
`totalPossessionsOnD` fields expose the raw denominators; aggregate analytics pool those totals
through the combined possession arrays rather than averaging game percentages. A Callahan adds one
synthetic D-possession and one scored D-possession for the scoring side.

Red Zone stats use the possession's coach-captured marker. Conversion includes only marked
possessions resolved by a goal or turnover; active and terminated possessions are excluded from
that denominator. Time-to-entry can include a still-active marked possession, while outcome time
requires a resolved possession. Aggregate analytics pool the underlying entry, resolution, score,
and timing samples instead of averaging per-game percentages or averages.

The shared single-game and aggregate team UI displays Red Zone only when the selected side has
entries. It shows conversion and its resolved ratio, Red Zone Turnovers
(`resolvedRedZonePossessions - scoredRedZonePossessions`), Avg Time to Score, and Avg Time to
Turnover in rounded seconds. The two timing averages include only marked possessions with the
matching outcome and valid pause-adjusted timing; zero-duration samples count. Aggregate averages
pool the matching duration samples. CSV exports include the same metrics, with duration in m:ss. Null conversion/timing displays as an em dash; point-start-to-entry timing is
not displayed. The help text explains manual tagging and resolved-only conversion.

### `advancedPullStatsUtils.ts`

Pull-specific stats. Returns `PullStats` with outcome breakdowns and average hang time.

### `advancedTimingStatsUtils.ts`

Point duration stats. Returns `AdvancedTimingStats` with averages, extremes, and a `hasTimingData` flag for graceful fallback when timestamps are absent.

Half-split timing stats are supported via the caller pre-filtering `game.points` on `point.half` (1 or 2) before passing the game to `computeAdvancedTimingStats`. This is the standard pattern — stat utils operate on a single `AnalyticsGame`, filtering is the caller's responsibility.

### Additional Analytics Utilities

- `advancedTimeOfPossessionUtils.ts` derives side possession time from action timing.
- `advancedImpactUtils.ts` builds per-player point impact.
- `advancedChemistryUtils.ts` derives scoring and passing connections.
- `advancedAggregateStatsUtils.ts` derives opening-pull and flip summaries across games.
- `aggregateAnalyticsGames.ts` combines compiled games for aggregate views.
- `advancedCSVUtils.ts` serializes single-game and aggregate analytics.

## Design Principles

- **Attribution-first**: Player stats are derived from the pre-resolved `attributions` array, never by re-traversing raw actions. This is the whole point of the analytics layer.
- **Perspective-neutral by default**: Team stats use `getPointStateForSide` so a single `AnalyticsGame` can produce stats for either side.
- **Null over zero**: Percentages and averages return `null` when the denominator is zero (e.g., completion % with 0 throw attempts). This lets the UI distinguish "no data" from "0%".
- **No formatting**: Stat utils return raw numbers. Formatting (rounding, percentage display, duration formatting) is a UI concern.
- **No filtering**: Stat utils operate on a single `AnalyticsGame`. Filtering by date range, opponent, tournament, or half is the caller's responsibility — either by passing a subset of games or by pre-filtering the analytics arrays.
