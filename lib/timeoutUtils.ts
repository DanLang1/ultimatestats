import { didGoalTriggerHalftime } from '@/lib/halftimeUtils';
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
 * @param _baseGameTo - Legacy argument retained for call-site compatibility
 * @param autoHalftimeEnabled - Whether automatic halftime is enabled
 * @returns The derived timeout state for both teams
 */
export function deriveTimeoutState(
  events: GameEvent[],
  _baseGameTo: number,
  autoHalftimeEnabled: boolean,
): TimeoutState {
  const team1Timeouts = [true, true];
  const team2Timeouts = [true, true];
  let team1Floater = true;
  let team2Floater = true;
  let halfReached = false;

  for (const event of events) {
    if (event.type === 'goal') {
      // Halftime reset uses the persisted halftime marker.
      // Note: Only regular timeouts reset at halftime, NOT floaters (floaters are once per game)
      if (autoHalftimeEnabled && didGoalTriggerHalftime(event, halfReached)) {
        halfReached = true;
        team1Timeouts[0] = true;
        team1Timeouts[1] = true;
        team2Timeouts[0] = true;
        team2Timeouts[1] = true;
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
