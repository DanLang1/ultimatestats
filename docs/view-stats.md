# View Stats Feature

> Documentation for the In-App Statistics Viewer

## Overview

The View Stats page displays a table of player statistics (goals, assists, blocks, throwaways, drops, and plus/minus) for the current game, with the ability to export raw data.

## Access

1. Tap the **Information (i)** icon in the timer bar on the main screen.
2. Tap **View Stats**.
   - Note: This button is only visible if Stat Tracking is enabled.

## Screen Layout

### 1. Summary

- Displays the team name and total number of points recorded.
- Shows stats for your team (Team 1).

### 2. Player Stats Table

Scrollable table of player stats. Exact columns vary depending on whether line-tracking data is available.

Common columns include:

| Column | Description                                              |
| ------ | -------------------------------------------------------- |
| Player | Player name                                              |
| Pts    | Points played (when line tracking data exists)           |
| O-Eff  | O-line efficiency (when line tracking data exists)       |
| D-Eff  | D-line efficiency (when line tracking data exists)       |
| G      | Goals scored (+1)                                        |
| A      | Assists thrown (+1)                                      |
| Blk    | Blocks made (+1)                                         |
| Calh   | Callahans made (+1, only appears if > 0)                 |
| TO     | Throwaways committed (-1)                                |
| D      | Drops committed (-1)                                     |
| +/-    | Plus/Minus (G + A + Blk - TO - D), color-coded           |

- sorted by Plus/Minus descending, then by name.
- Non-integer values (from 50/50 turnovers) are displayed with single decimal (e.g. 0.5).
- Pts, O-Eff, D-Eff columns are hidden for games without line tracking data.
- **Interactive Rows**: Tap any player row to view a detailed breakdown of their individual stats.
- In aggregate player view, the **Game Impact** selector only includes games where that player has at least one recorded impact event (goal, assist, block, throwaway, drop, or 50/50 involvement).
- In player detail, **Game Impact** event chips and score markers use the point-start score so all impact events from the same point share one label; if the point is still in progress, they show the current live score.
- In player detail, a self-assisted goal is shown in **Game Impact** as a single `Goal + Assist` impact event worth `+2`, matching the raw stat totals.
- In player detail, the **Profile** diamond uses raw counts (Goals, Assists, Blocks, Total Turns) on a shared per-player scale so equal counts render equal axis lengths.
- In player detail, a **Relative to Team** card shows team-context comparisons for core event stats (Goals, Assists, Blocks, turnovers, and Plus/Minus).
- The Relative card has a local **Vs Avg / Vs Max** toggle:
  - **Vs Avg** compares each stat to the visible team average (single game or aggregate selection).
  - **Vs Max** displays **Team Best** context: higher-is-better metrics compare to the visible team max, lower-is-better metrics (turnovers/drops) compare to the visible team min, and signed metrics like Plus/Minus keep a range-based bar (raw value remains visible).
- Relative player comparisons exclude synthetic/unattributed entries (for example `Unknown`) and, when a roster is available, compare only against known roster players. Raw/team totals still retain those events.
- Relative rows may suppress low-value comparisons (for example, stats with no recorded events for the selected player) and may show low-sample messaging when comparisons are noisy.
- When line tracking data exists, the Relative card adds a **Playing Time (Relative)** subsection (usage, efficiency, and playing-time metrics).
- In aggregate mode with mixed line-tracking availability, the playing-time relative subsection notes how many selected games had line data (e.g. `3/5 games`) and computes comparisons from the line-tracked subset.

### 3. Game Timeline

- Linear view of every point and event.
- Turnovers are highlighted by type (Block, Drop, Throwaway, 50/50).
- **50/50 Turnovers**: Labeled specifically and display both players involved (Thrower & Receiver).
- **Callahans**: Detected automatically (Block + Goal by same player) and displayed as a single high-contrast badge.
- Possession flips (Holds/Breaks) are clearly marked.
- Replay uses the recorded halftime goal event rather than recalculating halftime on the fly.
- Legacy saved games are migrated by inferring that halftime event from `gameTo` once on load/import, so replayed timelines and stats use a single persisted source of truth afterward.
- Replay also honors whether auto halftime was enabled when the game was played. Legacy saves default that flag to auto halftime enabled.
- With point timing enabled, event chips show `m:ss` timestamps.
- The timeline header includes a local Splits toggle to show/hide inter-event split times (e.g., `+32s`) above arrow separators.

## Saved Games List

The **Saved** tab displays a history of games recorded on this device.

- If the entire saved-games storage blob becomes unreadable, the screen shows a simple corruption warning instead of silently treating the library as empty.

### 1. Searching & Filtering

- **Search**: Use the search bar at the top to filter games by team name (yours or opponent) or by date (e.g., "Feb 5").
- **Sorting**: Tap the **Sort** button next to the search bar to choose a display order from the modal:
  - **Newest**: Latest games first (default).
  - **Oldest**: Original games first.
  - **Team A-Z**: Alphabetical by team name.
  - **Team Z-A**: Reverse alphabetical by team name.
  - **High Score**: Games with the most total points tracked.

### 2. Bulk Actions

- **Implicit Selection**: Tap the checkbox on the left of any game card to start selecting multiple games.
- **Bulk Actions Bar**: Once a game is selected, a floating bar will appear at the bottom with:
  - **Cancel (X)**: Clear all selections and hide the bar.
  - **Delete (N)**: Delete all selected games after confirmation.
- **Individual vs. Bulk**: Tapping the main area of a game card opens a dedicated Saved Game detail screen, while tapping the checkbox toggles its selection state. Individual deletion via the trash icon is hidden once multiple games are selected to focus on bulk operations.

## Aggregate Mode

The **Aggregate** tab allows you to combine stats from multiple games for a single team.

1. Select your team from the list.
2. Select one or more games to combine.
3. Tap **View Combined** to see aggregated player and team statistics.

- Aggregate playing-time stats are computed per selected game and then summed, so repeated point numbers across games do not affect combined O-line/D-line splits or total points played.

## Actions

- **Back**: From the View Stats tabs, returns to the previous screen. Saved Game detail uses its own route, so back returns to the previous page in the stack.
- **Export CSV**: Generates a CSV file and opens the system share sheet.
- **Export PDF**: Generates a professional PDF report.
- **Timeline**: Opens the Game Timeline view for the selected game.

### Header Actions

- Available actions vary by context (current game, saved game, aggregate view) and screen size.
- On smaller portrait layouts, secondary actions may collapse into an overflow menu to preserve space.

## CSV Export

The exported file (`[Game Date]_[Teams].csv`) contains several sections:

### Section 1: Summary

General game information including teams, scores, and date.

### Section 2: Play-by-Play (Events)

Unified chronological log of all point results and timing:

```csv
Point,Score Before,Pulling Team,Goal Team,Goal,Assist,Duration
1,0-0,Team 2,Team 1,Alice,Bob,1:15
2,1-0,Team 1,Team 2,,,0:45
3,1-1,Team 2,Team 1,Charlie,,2:10
```

### Section 3: Player Stats Summary

Aggregated statistics for your team:

```csv
# Player Summary
Player,Goals,Assists,Blocks,Throwaways,Drops,Callahans,Plus/Minus,Points Played,O-Points,D-Points,O-Line Holds,D-Line Breaks,Minutes Played,O-Eff,D-Eff
Alice,3,2,1,0,0,1,6,10,6,4,4,1,15:42,70%,33%
Bob,2,1,0,1,0,0,2,8,5,3,3,1,12:18,63%,25%
```

- If line tracking data exists, CSV adds `Points Played`, `O-Points`, `D-Points`, `O-Line Holds`, `D-Line Breaks`, `Minutes Played`, `O-Eff`, and `D-Eff` columns.
- Players who appeared in lines but recorded no event stats are still included in Player Summary.
- If line tracking data is not available, those columns are omitted.

### Section 4: Team Stats

Team performance metrics including hold%, break efficiency, conversion rate, etc.

### Section 5: Timing Stats (Conditional)

If the game was played with the point timer enabled, timing statistics are included:

```csv
# Timing Stats
Stat,Value,Detail
Avg Point Duration,1:23,12 points
Avg O-Point Duration,1:15,6 O-points
Avg D-Point Duration,1:31,6 D-points
Longest Point,2:45,
Shortest Point,0:32,
```

> **Note**: This section only appears if timing data was recorded during the game.

### Section 6: Time of Possession (Conditional)

If every event in at least one point has a recorded timestamp, a time-of-possession summary is included:

```csv
# Time of Possession
Stat,Value,Detail
Team 1,1:05,55.2%
Team 2,0:53,44.8%
Points (timed),12,
```

> **Note**: Points missing any `elapsedMs` value are excluded. If no points qualify, this section is omitted.

## Team Performance Section

The Team Performance section displays key efficiency metrics. If timing data is available, a **POINT LENGTH** subsection appears with:

| Stat     | Description                              |
| -------- | ---------------------------------------- |
| Avg Pt   | Average duration of all completed points |
| Avg O-Pt | Average duration of offensive points     |
| Avg D-Pt | Average duration of defensive points     |
| Longest  | Duration of the longest point            |
| Shortest | Duration of the shortest point           |

If point-timer data is available with complete per-event timestamps, a **TIME OF POSSESSION** subsection also appears:

- The subsection header shows the title and the number of timed points (`N pts timed`).
- A horizontal bar visualizes each team's share of possession time.
- Team labels below the bar show total possession time (`Xm Ys`) and percentage share.

**Data requirements**: Every event in a point (all turnovers and the goal) must have a recorded `elapsedMs` timestamp. Points missing any timestamp are excluded. If no points qualify, the section is hidden entirely.

**Aggregate mode**: Raw millisecond totals are summed across all included games, then percentages are recomputed from the combined totals.
