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

| Column | Description                                    |
| ------ | ---------------------------------------------- |
| Player | Player name                                    |
| G      | Goals scored (+1)                              |
| A      | Assists thrown (+1)                            |
| Blk    | Blocks made (+1)                               |
| Calh   | Callahans made (+1, only appears if > 0)       |
| TO     | Throwaways committed (-1)                      |
| D      | Drops committed (-1)                           |
| +/-    | Plus/Minus (G + A + Blk - TO - D), color-coded |

- sorted by Plus/Minus descending, then by name.
- Plus/Minus is **green** for positive, **red** for negative.
- Non-integer values (from 50/50 turnovers) are displayed with single decimal (e.g. 0.5).
- **Interactive Rows**: Tap any player row to view a detailed breakdown of their individual stats.

### 3. Game Timeline

- Linear view of every point and event.
- Turnovers are highlighted by type (Block, Drop, Throwaway, 50/50).
- **50/50 Turnovers**: Labeled specifically and display both players involved (Thrower & Receiver).
- **Callahans**: Detected automatically (Block + Goal by same player) and displayed as a single high-contrast badge.
- Possession flips (Holds/Breaks) are clearly marked.

### 4. Actions

- **Back**: returns to Settings.
- **Export CSV**: Generates a CSV file and opens the system share sheet.

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
