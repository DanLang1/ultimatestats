import { GameEvent } from '@/store/gameStore.types';

export interface TimeoutState {
  team1Timeouts: boolean[];
  team2Timeouts: boolean[];
  team1Floater: boolean;
  team2Floater: boolean;
}

/**
 * Derives timeout state by replaying events.
 * This ensures correct timeout state after undo operations, especially across halftime.
 *
 * @param events - Array of game events to replay
 * @param baseGameTo - The base game-to score (before soft cap adjustments)
 * @param autoHalftimeEnabled - Whether automatic halftime is enabled
 * @returns The derived timeout state for both teams
 */
export function deriveTimeoutState(
  events: GameEvent[],
  baseGameTo: number,
  autoHalftimeEnabled: boolean,
): TimeoutState {
  const team1Timeouts = [true, true];
  const team2Timeouts = [true, true];
  let team1Floater = true;
  let team2Floater = true;

  let team1Score = 0;
  let team2Score = 0;
  let halfReached = false;
  const halftimeScore = Math.ceil(baseGameTo / 2);

  for (const event of events) {
    if (event.type === 'goal') {
      if (event.team === 'team1') team1Score++;
      else team2Score++;

      // Halftime reset - when either team reaches halftime score
      // Note: Only regular timeouts reset at halftime, NOT floaters (floaters are once per game)
      if (autoHalftimeEnabled && !halfReached) {
        if (team1Score === halftimeScore || team2Score === halftimeScore) {
          halfReached = true;
          team1Timeouts[0] = true;
          team1Timeouts[1] = true;
          team2Timeouts[0] = true;
          team2Timeouts[1] = true;
        }
      }
    } else if (event.type === 'timeout') {
      if (event.isFloater) {
        if (event.team === 'team1') team1Floater = false;
        else team2Floater = false;
      } else {
        if (event.team === 'team1') team1Timeouts[event.index] = false;
        else team2Timeouts[event.index] = false;
      }
    }
  }

  return { team1Timeouts, team2Timeouts, team1Floater, team2Floater };
}
