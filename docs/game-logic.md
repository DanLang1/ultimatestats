# Game Logic

> Documentation for game scoring, win conditions, and possession handling.

## Game End Detection

Use the centralized `checkGameOver` function from `lib/gameUtils.ts`:

```typescript
import { checkGameOver } from '@/lib/gameUtils';

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
2. `PullPromptModal` appears asking "Who is receiving?"
3. User taps team → `setPossession(team)` + `startingPossession = team`

### After a Goal

- Possession flips to non-scoring team (they receive the pull)

### At Halftime

- Possession returns to `startingPossession` (they receive)
- The team that pulled first now receives at half

### After a Turnover

- Possession flips to the other team

## Key Files

| File                              | Purpose                                |
| --------------------------------- | -------------------------------------- |
| `lib/gameUtils.ts`                | `checkGameOver()` utility              |
| `lib/__tests__/gameUtils.test.ts` | Unit tests for game logic              |
| `store/gameStore.ts`              | `incrementScore()`, `possession` state |
| `app/WinModal.tsx`                | Game end UI                            |
| `app/StatEntryModal.tsx`          | Stat entry + game end check            |

## Testing Game Logic

Test file: `lib/__tests__/gameUtils.test.ts`

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
