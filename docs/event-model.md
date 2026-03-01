# Event Model

Canonical event definitions and invariants for gameplay stats.

Source of truth: `store/gameStore.types.ts`.

## Event Union

`GameEvent = GoalEvent | TurnoverEvent | TimeoutEvent`

## GoalEvent

- Fields:
`type: 'goal'`
`team`
`goalPlayerId`
`assistPlayerId`
`elapsedMs?`
`pointNumber?`
`gameId?`
`triggeredHalftime?`
- Meaning:
A point was scored by `team`.
- Notes:
`goalPlayerId` / `assistPlayerId` can be `null` initially, then filled by stat entry/edit flows.
`triggeredHalftime` is the canonical halftime marker used by replayed timelines and stats.
Legacy saved games are migrated by inferring the halftime goal from `gameTo` once on load/import, then persisting that marker.

## TurnoverEvent

- Fields:
`type: 'turnover'`
`team`
`subtype: 'block' | 'throwaway' | 'drop' | 'fiftyfifty'`
`playerId`
`player2Id?` (used for `fiftyfifty`)
`elapsedMs?`
`pointNumber?`
`gameId?`
- Meaning:
`team` committed a turnover of `subtype`.

## TimeoutEvent

- Fields:
`type: 'timeout'`
`team`
`index`
`isFloater`
`elapsedMs?`
`pointTimerWasPaused?`
`pointNumber?`
`gameId?`
- Meaning:
A timeout was consumed by `team`.

## Invariants

- Event order is chronological in one array (`events`).
- Scores and goal events must stay in sync (goal entry can start with null players but should still create an event).
- `pointNumber` may be absent on legacy saved data; new logic must tolerate missing values.
- `gameId` is optional for live events and can be added at save/import boundaries.

## Mutation Paths

- Create:
`incrementScore`, `addGoalEvent`, `addTurnoverEvent`, timeout actions in `useGameStore`.
- Edit:
`updateEvent`, `deleteEvent`, `updateSavedGameEvent`, `deleteSavedGameEvent`.
- Read/derive:
`lib/statsUtils.ts`, `lib/teamStatsUtils.ts`, `lib/timelineUtils.ts`, `lib/playingTimeStatsUtils.ts`.

## Change Checklist

If you change event fields or semantics:

1. Update `store/gameStore.types.ts`.
2. Update all producers in `store/gameStore.ts`.
3. Update downstream calculators in `lib/*stats*` and `lib/timelineUtils.ts`.
4. Update docs:
`docs/stat-tracking.md`
`docs/turnover-tracking.md`
`docs/view-stats.md`
5. Add/update tests in `lib/__tests__/`.
