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
| TO     | Throwaways committed (-1)                      |
| D      | Drops committed (-1)                           |
| +/-    | Plus/Minus (G + A + Blk - TO - D), color-coded |

- Sorted by Plus/Minus descending, then by name.
- Alternating row colors for readability.
- Plus/Minus is **green** for positive, **red** for negative.

### 3. Actions

- **Back**: returns to Settings.
- **Export CSV**: Generates a CSV file and opens the system share sheet.

## CSV Export

The exported file (`game_stats.csv`) contains three sections:

### Section 1: Play-by-Play

```csv
# Play-by-Play
Point Number,Team,Goal,Assist
1,Team Rocket,Alice,Bob
2,Team Rocket,Charlie,Alice
```

### Section 2: Turnovers

```csv
# Turnovers
Team,Type,Player
Team Rocket,throwaway,Dan
Team Rocket,block,Alice
```

### Section 3: Player Summary

```csv
# Player Summary
Player,Goals,Assists,Blocks,Throwaways,Drops,Plus/Minus
Alice,3,2,1,0,0,6
Bob,2,1,0,1,0,2
```
