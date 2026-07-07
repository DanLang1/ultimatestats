/**
 * Game logic utilities for determining game state
 */

import { GenderRatio } from '@/lib/genderRatioUtils';

export interface GameActiveState {
  timerIsActive: boolean;
  team1Score: number;
  team2Score: number;
  firstPointRatio: GenderRatio | null;
  currentLine: string[];
  pointLines: { pointNumber: number }[];
}

/**
 * Check if a game is considered "in progress" based on current state.
 * A game is active if any of the following are true:
 * - Timer is running
 * - Either team has scored
 * - FMP/MMP ratio has been selected for first point
 * - A line has been set for the current point
 * - Lines have been recorded for previous points
 */
export function isGameActive(state: GameActiveState): boolean {
  const { timerIsActive, team1Score, team2Score, firstPointRatio, currentLine, pointLines } = state;

  return (
    timerIsActive ||
    team1Score !== 0 ||
    team2Score !== 0 ||
    firstPointRatio !== null ||
    currentLine.length > 0 ||
    pointLines.length > 0
  );
}

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
