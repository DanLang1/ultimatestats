# Stat Utils Layer

> Rules for the stat utilities in `lib/advancedTracking/`. How each stat is computed lives in the
> code: `ATTRIBUTION_STAT_SPECS` (which attribution feeds which player stat, and its plus/minus
> weight), `PLAYER_STAT_LABELS` (one wording per player stat), and the per-domain utils below.

## Principles

- **Attribution-first:** player stats sum the compiled `attributions`; they never re-traverse raw
  actions.
- **Perspective-neutral:** team stats use `getPointStateForSide`, so one `AnalyticsGame` serves
  either side, both-team tracking, and scrimmages.
- **Null over zero:** a rate or average with no denominator or no timing data is `null`, so the UI
  can show "no data" instead of 0.
- **No formatting:** utils return raw numbers; rounding and display are UI concerns. Counts can be
  fractional after a 50/50 split, so shared formatters must not round them.
- **No filtering:** utils take one `AnalyticsGame`. Date, opponent, tournament, and half filters
  are the caller's job (pass a subset, or pre-filter `game.points`, e.g. on `point.half`).
- **Aggregates pool samples:** multi-game views combine the underlying possessions, timing samples,
  and counts (`aggregateAnalyticsGames`), never averages of per-game percentages.

## Domain Rules

- **O-point / D-point** mean a side's receiving and pulling points, not a player role or lineup.
- **Scrimmage player stats** are point-scoped: an attribution counts toward a side only for points
  where that participant was on that side.
- **Plus/minus** comes from `ATTRIBUTION_STAT_SPECS` weights. The impact timeline recomputes it per
  point from the same weights, and a test pins that each player's impact total equals their
  plus/minus.
- **Turnovers** for a player are `stats.turnovers`; screens read that field instead of summing
  their own.
- **Throw classifications** are optional coach tags, so huck and backfield-reset summaries may not
  cover every throw. Backfield reset is turnover-only and has no completion rate.
- **Red Zone** is coach-marked, not measured from location. Conversion counts only resolved marked
  possessions; team Red Zone stats work with anonymous opponents.
- **Playing time %** is the share of recorded point duration, not of team points or stints.

Location-based stats (yards, distance-based hucks, heat maps) need field locations; see
`docs/future-features/advanced-location-tracking.md`.

## Where Things Live

| Concern                              | File                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Player stats, attribution weights    | `advancedPlayerStatsUtils.ts`                                                                  |
| Player stat wording                  | `playerStatLabels.ts`                                                                          |
| Team, possession, and Red Zone stats | `advancedTeamStatsUtils.ts`                                                                    |
| Pulls, timing, time of possession    | `advancedPullStatsUtils.ts`, `advancedTimingStatsUtils.ts`, `advancedTimeOfPossessionUtils.ts` |
| Per-point impact                     | `advancedImpactUtils.ts`                                                                       |
| Huck and backfield-reset summaries   | `advancedThrowTypeStatsUtils.ts`                                                               |
| Chemistry, opening pulls and flips   | `advancedChemistryUtils.ts`, `advancedAggregateStatsUtils.ts`                                  |
| Multi-game combination, CSV export   | `aggregateAnalyticsGames.ts`, `advancedCSVUtils.ts`                                            |
