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

Scrollable table with the following columns:

| Column | Description                                              |
| ------ | -------------------------------------------------------- |
| Player | Player name                                              |
| Pts    | Points played (requires line tracking data)              |
| O-Eff  | O-line Efficiency: +1 hold, -1 broken (green/red)        |
| D-Eff  | D-line Efficiency: +1 break, -1 held against (green/red) |
| G      | Goals scored (+1)                                        |
| A      | Assists thrown (+1)                                      |
| Blk    | Blocks made (+1)                                         |
| Calh   | Callahans made (+1, only appears if > 0)                 |
| TO     | Throwaways committed (-1)                                |
| D      | Drops committed (-1)                                     |
| +/-    | Plus/Minus (G + A + Blk - TO - D), color-coded           |

- sorted by Plus/Minus descending, then by name.
- Plus/Minus, O-Eff, D-Eff are **green** for positive, **red** for negative.
- Non-integer values (from 50/50 turnovers) are displayed with single decimal (e.g. 0.5).
- Pts, O-Eff, D-Eff columns are hidden for games without line tracking data.
- **Interactive Rows**: Tap any player row to view a detailed breakdown of their individual stats.

### 3. Game Timeline

- Linear view of every point and event.
- Turnovers are highlighted by type (Block, Drop, Throwaway, 50/50).
- **50/50 Turnovers**: Labeled specifically and display both players involved (Thrower & Receiver).
- **Callahans**: Detected automatically (Block + Goal by same player) and displayed as a single high-contrast badge.
- Possession flips (Holds/Breaks) are clearly marked.

## Saved Games List

The **Saved** tab displays a history of games recorded on this device.

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
- **Individual vs. Bulk**: Tapping the main area of a game card opens its full stats, while tapping the checkbox toggles its selection state. Individual deletion via the trash icon is hidden once multiple games are selected to focus on bulk operations.

## Aggregate Mode

The **Aggregate** tab allows you to combine stats from multiple games for a single team.

1. Select your team from the list.
2. Select one or more games to combine.
3. Tap **View Combined** to see aggregated player and team statistics.

## Actions

- **Back**: returns to Settings.
- **Export CSV**: Generates a CSV file and opens the system share sheet.
- **Export PDF**: Generates a professional PDF report.
- **Timeline**: Opens the Game Timeline view for the selected game.

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
Player,Goals,Assists,Blocks,Throwaways,Drops,Callahans,Plus/Minus
Alice,3,2,1,0,0,6,1
Bob,2,1,0,1,0,2,0
```

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

## Team Performance Section

The Team Performance section displays key efficiency metrics. If timing data is available, a **TIMING** subsection appears with:

| Stat     | Description                              |
| -------- | ---------------------------------------- |
| Avg Pt   | Average duration of all completed points |
| Avg O-Pt | Average duration of offensive points     |
| Avg D-Pt | Average duration of defensive points     |
| Longest  | Duration of the longest point            |
| Shortest | Duration of the shortest point           |
