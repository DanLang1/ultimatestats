# View Stats Feature

> Documentation for the In-App Statistics Viewer

## Overview

The View Stats page allows users to see a breakdown of player statistics (goals and assists) for the current game and export the raw data.

## Access

1. Open **Settings** (tap the timer bar).
2. Scroll to the "Stat Tracking" section.
3. Tap **View Stats**.
   - Note: This button is only visible if Stat Tracking is enabled (set to "My Team" or "Both").

## Screen Layout

### 1. Team Tabs

- Switch between **Team 1** and **Team 2** rosters.
- The summary and player list update to reflect the selected team.

### 2. Summary

- Displays the total number of points recorded for the selected team.
- Helps verify that the stats match the scoreboard score.

### 3. Player Stats List

- Scrollable list of players who have recorded at least one stat.
- Sorted by total involvement (Goals + Assists) descending.
- **Player Card**:
  - **Name**: Player name.
  - **Goals**: Count of goals scored.
  - **Assists**: Count of assists thrown.

### 4. Actions

- **Back**: returns to Settings.
- **Export CSV**: Generates a CSV file and opens the system share sheet.

## CSV Export

The exported file (`game_stats.csv`) contains the raw play-by-play stat records.

### Format

```csv
Point Number,Team,Goal,Assist
1,Team Rocket,Alice,Bob
2,Team Rocket,Charlie,Alice
...
```

- **Point Number**: Sequential number of the point for that team (1st point scored, 2nd point scored, etc.).
- **Team**: The name of the team at the time of export.
- **Goal**: Name of the player who scored (or empty/null if unknown).
- **Assist**: Name of the player who assisted (or empty/null if unknown).
