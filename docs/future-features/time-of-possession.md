# Time of Possession Stats

> **Status**: Not started

## Overview

Add a "Time of Possession" (TOP) stat to the ViewStats page and CSV export. Using the `elapsedMs` timestamps already stored on each `TurnoverEvent` and `GoalEvent`, we can compute exactly how long each team held the disc during a point — including mid-point turnover splits.

---

## Core Algorithm

Each event stores `elapsedMs`: time in ms from point start to when that event occurred. Combined with `offensiveTeam` (who starts with the disc), walk the events of a point in `elapsedMs` order to accumulate possession time per team.

**Example** — team1 on offense, two turnovers:

```
T=0:     pull catch        → team1 has disc
T=12000: TurnoverEvent     → team1 possessed 0–12s  (+12s to team1)
T=25000: TurnoverEvent     → team2 possessed 12–25s (+13s to team2)
T=31000: GoalEvent         → team1 possessed 25–31s (+6s to team1)

team1 TOP = 18s, team2 TOP = 13s
```

For a point with no turnovers the goal's `elapsedMs` is just the entire possession for the offensive team.

---

## Data Availability Guard

Only compute TOP for a point if **every event in that point** has a valid `elapsedMs` value. If any event is missing `elapsedMs`, skip the entire point — a partial sum would be misleading. Maintain a `timedPointCount` for TOP (may differ from the general timing `timedPointCount` if some points have partial data).

If no points have complete TOP data, suppress the TOP section entirely (same pattern as existing timing stats using `hasTimingData`).

---

## Files to Change

### 1. `lib/teamStatsUtils.ts`

Add a `TimeOfPossessionStats` interface (or extend `TimingStats`):

```ts
export interface TimeOfPossessionStats {
  hasTopData: boolean;
  team1TotalPossessionMs: number;
  team2TotalPossessionMs: number;
  team1PossessionPct: number; // 0–100
  team2PossessionPct: number;
  timedPointCount: number; // points included in calculation
}
```

Add `computeTimeOfPossessionStats(pointEvents: PointEvents[], events: GameEvent[]): TimeOfPossessionStats`.

**Algorithm per point:**

1. Collect all events for this point (turnovers + goal) sorted by `elapsedMs`.
2. If any event is missing `elapsedMs`, skip point.
3. Walk events in order, tracking `currentPossessor` (starts as `point.offensiveTeam`) and `prevElapsedMs = 0`.
4. On each `TurnoverEvent`: add `(event.elapsedMs - prevElapsedMs)` to `currentPossessor`'s total, flip `currentPossessor`, update `prevElapsedMs`.
5. On `GoalEvent`: add `(event.elapsedMs - prevElapsedMs)` to `currentPossessor`'s total.
6. After all points, compute percentages from totals.

### 2. `app/ViewStats.tsx` (or the relevant `components/view-stats/` component)

Add a "Time of Possession" section in the timing/stats area, gated on `hasTopData`. Display:

- A possession bar (team1 % | team2 %) — similar to how shot charts or O/D splits might be shown
- Total possession time per team (formatted as `m:ss`)
- Number of points included in the calculation (so users know the sample size)

If `hasTopData` is false, omit the section entirely.

### 3. `lib/statsUtils.ts` (CSV export)

Add TOP columns to the per-point CSV export:

- `Team1 Possession (ms)` — raw ms for that point
- `Team2 Possession (ms)` — raw ms for that point

And/or summary rows in the game-level export:

- `Team1 Total Possession`
- `Team2 Total Possession`
- `Team1 Possession %`
- `Team2 Possession %`

Skip (leave blank) for any point missing complete `elapsedMs` data.

### 4. `docs/view-stats.md`

Document the new "Time of Possession" section: what it shows, what data is required (point timer must have been running for all events in a point), and that incomplete points are excluded.

---

## Edge Cases

| Case                                                   | Handling                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Timer was never enabled                                | `hasTopData = false`, section hidden                                                       |
| Point has turnovers but missing `elapsedMs` on any one | Skip entire point                                                                          |
| Callahan (goal scored by defense)                      | `offensiveTeam` flipped at goal time; treat as a normal `GoalEvent` for the defender       |
| Timeout events                                         | Timeouts do not change possession — skip them in the walk, do not split possession on them |
| In-progress point                                      | Skip (no goal event yet, point incomplete)                                                 |
| Aggregate mode (multiple saved games)                  | Sum raw ms across all included points from all games, then compute overall percentage      |

---

## No Open Questions

Requirements are fully defined. Implementation can begin when prioritized.
