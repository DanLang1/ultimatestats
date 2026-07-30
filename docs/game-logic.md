# Game Logic

> Documentation for basic-game scoring, win conditions, and possession handling.

## Game End Detection

Use the centralized `checkGameOver` function from `lib/basic/gameUtils.ts`:

```typescript
import { checkGameOver } from '@/lib/basic/gameUtils';

const result = checkGameOver({
  team1Score,
  team2Score,
  gameTo,
  softCapPending,
  timerActive,
  gameLength,
});

if (result.isGameOver) {
  // Handle game end - result.winner contains winner
}
```

## Win Condition Rules

### Normal Game (No Soft Cap)

- First team to reach `gameTo` wins

### Soft Cap Active

- Game continues until a team leads by at least 1 point
- Win condition: `Math.max(team1Score, team2Score) >= gameTo`

### Hard Cap (Timer Expires)

- `timerActive: false` + `gameLength > 0` indicates hard cap
- Highest score wins immediately (no cap target required)
- Ties: game continues until a team leads

## Possession Flow

### Initial Possession

1. Game starts with `possession: null`
2. `/PreGameConfirm` is required before the scoreboard can be used
3. User confirms game format settings before starting
4. If stat tracking is enabled, user selects receiving team -> `setPossession(team)` + `startingPossession = team`
5. If gender ratio tracking is enabled, user must also select the starting ratio

### After a Goal

- Possession flips to non-scoring team (they receive the pull)

### At Halftime

- Possession flips to the non-starting team (they receive)
- The team represented by `startingPossession` pulls
- The team that pulled first now receives at half
- The actual halftime goal is persisted on the goal event (`triggeredHalftime`)
- Legacy saved games are migrated by inferring that goal from `gameTo` once, then replay uses the stamped event rather than recalculating halftime every time
- Replayed timelines/stats also respect whether auto halftime was enabled for that game; legacy saves default that flag to `true`

## In-Game `gameTo` Edits

- `gameTo` and `baseGameTo` can be adjusted from Settings during a live game while the game is still in the first half
- In-game edits are blocked once soft cap is pending or active
- The minimum allowed value is constrained so the game cannot end immediately, and with auto halftime enabled the halftime threshold remains reachable
- Halftime detection and soft-cap undo behavior remain event-driven; changing `gameTo` in Settings does not rewrite existing events

### After a Turnover

- Possession flips to the other team

## Key Files

| File                                               | Purpose                                |
| -------------------------------------------------- | -------------------------------------- |
| `lib/basic/gameUtils.ts`                           | `checkGameOver()` utility              |
| `lib/basic/__tests__/gameUtils.test.ts`            | Unit tests for game logic              |
| `store/basic/gameStore.ts`                         | `incrementScore()`, `possession` state |
| `app/(main)/GameComplete.tsx`                      | Game end UI                            |
| `components/basic/stat-entry/StatEntryOverlay.tsx` | Stat entry + game end check            |

## Testing Game Logic

Test file: `lib/basic/__tests__/gameUtils.test.ts`

Run tests:

```bash
npm test -- gameUtils
```

Test cases to cover:

- Normal game to N points
- Soft cap with lead
- Soft cap tie scenario
- Hard cap highest score wins
- Hard cap tie continues
