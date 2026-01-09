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

Unified chronological log of all recorded events:

```csv
Point,Team,Type,Subtype,Player 1,Player 2
1,Team 1,goal,,Alice,Bob
2,Team 1,turnover,throwaway,Charlie,
3,Team 2,goal,,,
```

### Section 3: Player Stats Summary

Aggregated statistics for your team:

```csv
# Player Summary
Player,Goals,Assists,Blocks,Throwaways,Drops,Callahans,Plus/Minus
Alice,3,2,1,0,0,6,1
Bob,2,1,0,1,0,2,0
```
