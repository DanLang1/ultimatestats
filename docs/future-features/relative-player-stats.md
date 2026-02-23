# Relative Player Stats (Team Context)

> **Status**: Not started

## Overview

Add a "Relative Player Stats" view in player detail so a player's numbers can be interpreted in team context (for example: "80% of team max assists" or "1.4x team average blocks").

This builds on logic that already exists in `lib/statsUtils.ts`:

- `getRoleStats(...)` already normalizes several player stats against **team max**
- the player profile/radar visualization already uses shared scales in player detail

The goal of this feature is to make that relative translation explicit and readable, not just implicit in a chart.

---

## Goals

- Show how a player compares to teammates using clear, stable references
- Support both **team max** and **team average** comparisons
- Keep **raw values visible** so relative values never feel misleading
- Reuse existing computed stats where possible (`computePlayerStats`, playing time stats)

---

## Proposed UX

Add a **Relative to Team** section in player detail (not in the main table initially).

### Comparison Modes

- **Vs Avg**: compare to team average
- **Vs Max**: compare to team max

### Display Format (per stat row)

Each row should show:

- **Raw value** (e.g. `4`)
- **Relative value** based on mode
- Optional visual bar/chip/rank

Examples:

- `Assists: 4` -> `1.6x avg`
- `Blocks: 3` -> `75% of max`
- `Turnovers: 1` -> `-0.8 vs avg` (with "lower is better" styling)

### Initial Stat Set (Phase 1)

From `computePlayerStats(...)`:

- Goals
- Assists
- Blocks
- Throwaways
- Drops
- Total Turnovers (`throwaways + drops`)
- Plus/Minus

Optional (if line tracking data exists):

- Points Played
- O-Eff
- D-Eff
- Minutes Played

---

## Core Definitions

For each metric, compute team context from the visible comparison set (current game or aggregate selection).

### 1. Team Max

`teamMax = max(all player raw values)`

Relative display:

- `pctOfMax = raw / max(teamMax, 1)` for non-negative count stats

### 2. Team Average

`teamAvg = sum(all player raw values) / playerCount`

Relative display:

- `deltaFromAvg = raw - teamAvg`
- `ratioToAvg = teamAvg > 0 ? raw / teamAvg : null`

### 3. Plus/Minus (signed metric)

Plus/minus is not ideal for simple `% of max` because values can be negative.

Recommended handling:

- **Vs Avg**: show `deltaFromAvg` and optionally `ratioToAvg` only when `teamAvg > 0`
- **Vs Max**: use **min/max normalization** for visualization only (not label text), similar to existing `getRoleStats(...)`

### 4. "Lower Is Better" Metrics

These metrics should invert color semantics but not arithmetic:

- Throwaways
- Drops
- Total Turnovers

Lower raw values are better, but still display the true ratio/delta (no hidden inversion).

---

## Data/Computation Plan

Add a helper in `lib/statsUtils.ts` (or a dedicated `lib/relativeStatsUtils.ts` if it grows):

```ts
export interface RelativeMetric {
  key: string;
  label: string;
  raw: number;
  teamAvg: number;
  teamMax: number;
  deltaFromAvg: number;
  ratioToAvg: number | null;
  pctOfMax: number | null; // 0-1 for non-negative metrics
  higherIsBetter: boolean;
  rank: number; // 1 = best by metric direction
  sampleEligible: boolean;
}

export function computeRelativePlayerStats(...) => RelativeMetric[]
```

### Inputs

- `playerId`
- `events`
- `team`
- `roster`
- optional playing-time stats / line-tracking stats
- optional aggregate game list (if computed upstream)

### Output Rules

- Always include `raw`
- Include both avg/max context values, even if UI is currently showing one mode
- Keep formatting out of the helper (return numeric values)

---

## Sample Size / Eligibility Guard

Relative stats can be noisy for players with very small samples.

Use conservative UI guards:

- Always show raw values
- De-emphasize or hide some relative rows if player has too little data
- Suggested thresholds (tunable):
  - at least `2` tracked events for event-based relative labels
  - at least `3` points played for line-based rate stats

If a metric is not eligible, show:

- raw value
- muted label (e.g. `Insufficient sample`)

---

## Files to Change

### 1. `lib/statsUtils.ts` (or `lib/relativeStatsUtils.ts`)

- Add relative player stat computation helper(s)
- Reuse `computePlayerStats(...)`
- Reuse existing normalization conventions from `getRoleStats(...)` where appropriate

### 2. `components/view-stats/*` (player detail component)

- Add "Relative to Team" section in player detail
- Add local mode toggle: `Vs Avg | Vs Max`
- Render rows with raw + relative values and direction-aware styling

### 3. `docs/view-stats.md`

Document:

- where the relative section appears (player detail)
- what "Vs Avg" and "Vs Max" mean
- that raw values remain visible
- sample-size caveats and line-tracking requirements for optional metrics

---

## Aggregate Mode Behavior

In aggregate mode, compute relative context from the **selected combined dataset** (same comparison pool used for the player list).

- Do not average per-game percentages directly for relative comparisons
- Prefer recomputing from aggregated raw values (same pattern as TOP totals)

This keeps "Vs Avg" and "Vs Max" consistent with the numbers shown elsewhere in the aggregate view.

---

## Edge Cases

| Case | Handling |
|------|----------|
| Only 1 player has recorded stats | `Vs Max` is 100%; `Vs Avg` is 1.0x for that player |
| Team average is 0 (e.g. no blocks by anyone) | `ratioToAvg = null`; show raw and "team avg 0" |
| Negative plus/minus values across team | Show delta vs avg; avoid `% of max` label text |
| Player has no event stats but appears in line tracking | Show optional line-based relative metrics; event metrics remain raw 0 |
| Aggregate mode with mixed line-tracking availability | Only show line-based relative metrics when underlying line data exists |
| Ties for max / rank | Shared rank behavior is acceptable; define deterministic secondary sort in UI |

---

## Open Questions

1. Should the first version include only event-count metrics, or also line/time-based metrics (Pts, O-Eff, D-Eff, Minutes)?
2. Should relative values be shown as text only initially, or include bars/charts in v1?
3. For `Plus/Minus`, should `Vs Max` use a label like "normalized range" instead of `% of max` to avoid confusion?
