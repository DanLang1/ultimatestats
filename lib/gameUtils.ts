/**
 * Game logic utilities for determining game state
 */

export interface GameOverState {
  team1Score: number;
  team2Score: number;
  gameTo: number;
  timerTimeLeft: number;
}

/**
 * Check if the game is over based on current state.
 * Per USAU rules:
 * - Normal: game ends when one team reaches gameTo and is ahead
 * - Softcap: gameTo is adjusted to higherScore + 1 after point completes
 * - Hardcap (timer = 0): game ends if one team is ahead (universe point rule)
 */
export function checkGameOver(state: GameOverState): boolean {
  const { team1Score, team2Score, gameTo, timerTimeLeft } = state;

  const isHardcap = timerTimeLeft === 0;
  const notTied = team1Score !== team2Score;

  // Hardcap: game ends immediately if one team is ahead
  if (isHardcap && notTied) {
    return true;
  }

  // Normal/Softcap: game ends when a team reaches gameTo and is ahead
  const team1ReachedTarget = team1Score >= gameTo;
  const team2ReachedTarget = team2Score >= gameTo;
  const reachedGameTo = (team1ReachedTarget || team2ReachedTarget) && notTied;

  return reachedGameTo;
}

/**
 * Determine which team won the game.
 * Should only be called when checkGameOver returns true.
 */
export function getWinner(team1Score: number, team2Score: number): 'team1' | 'team2' {
  return team1Score > team2Score ? 'team1' : 'team2';
}
