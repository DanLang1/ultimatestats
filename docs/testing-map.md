# Testing Map

Use this to choose test coverage quickly based on the feature you changed.

## Automated Test Targets

Tests live in `lib/__tests__/`.

| Change Area | Primary Tests |
| --- | --- |
| Game end rules / scoring caps | `lib/__tests__/gameUtils.test.ts`, `lib/__tests__/timeoutUtils.test.ts` |
| Gender ratio / line expectations | `lib/__tests__/genderRatioUtils.test.ts`, `lib/__tests__/lineUtils.test.ts` |
| Event timeline / point reconstruction | `lib/__tests__/timelineUtils.test.ts` |
| Player/team stats calculations | `lib/__tests__/statsUtils.test.ts`, `lib/__tests__/teamStatsUtils.test.ts`, `lib/__tests__/playerStatsUtils.test.ts`, `lib/__tests__/playingTimeStatsUtils.test.ts`, `lib/__tests__/timingStatsUtils.test.ts` |
| Import/share payload behavior | `lib/__tests__/importTeamTransform.test.ts`, `lib/__tests__/sharingPayloadSize.test.ts` |

## Manual Smoke Checklist

### Scoreboard / Live Game

1. Score for both teams.
2. Undo last action.
3. Trigger turnover flow and timeout flow.
4. Verify point transition/summary behavior.

### Stat Entry / Turnover Entry

1. Record goal + assist.
2. Record each turnover subtype.
3. Cancel/dismiss path should not corrupt score/events.

### Timeline / Event Editing

1. Open timeline for current game.
2. Edit goal and turnover events.
3. Delete an event and verify totals remain coherent.

### View Stats / Player Stats

1. Open team and player views.
2. Switch tabs/filters/saved games.
3. Validate key totals against known events.

## Command Quick Start

```bash
# Full suite
npm test

# Focused target examples
npm test -- gameUtils
npm test -- timelineUtils
npm test -- statsUtils
```

## When to Add a New Test

- Any change to event semantics or score progression.
- Any change to game-over, soft-cap, halftime, or timeout logic.
- Any bug fix where behavior previously regressed.

