import { checkGameOver } from './gameUtils';
import { hasItems } from './utils';

export type GameSessionStatus = 'fresh' | 'inProgress' | 'finished';

type GameSessionState = {
  team1Score: number;
  team2Score: number;
  gameTo: number;
  timerTimeLeft: number;
  currentGameStatus: GameSessionStatus;
  events: readonly unknown[];
  currentPoint: number;
  currentPointStartTime: number | null;
  pointTimerPausedElapsed: number | null;
  possession: 'team1' | 'team2' | null;
  startingPossession: 'team1' | 'team2' | null;
  pendingStatEntry: unknown | null;
  pendingTurnoverEntry: unknown | null;
  pendingTimeoutModal: boolean;
  isHalftimeBreak: boolean;
  currentGameId: string | null;
};

export function getGameSessionStatus(state: GameSessionState): GameSessionStatus {
  const isCompleted =
    state.currentGameStatus === 'finished' ||
    checkGameOver({
      team1Score: state.team1Score,
      team2Score: state.team2Score,
      gameTo: state.gameTo,
      timerTimeLeft: state.timerTimeLeft,
    });

  if (isCompleted) {
    return 'finished';
  }

  const hasSessionActivity =
    state.team1Score > 0 ||
    state.team2Score > 0 ||
    hasItems(state.events) ||
    state.currentPoint > 1 ||
    state.currentPointStartTime !== null ||
    state.pointTimerPausedElapsed !== null ||
    state.possession !== null ||
    state.startingPossession !== null ||
    state.pendingStatEntry !== null ||
    state.pendingTurnoverEntry !== null ||
    state.pendingTimeoutModal ||
    state.isHalftimeBreak ||
    state.currentGameId !== null;

  return hasSessionActivity ? 'inProgress' : 'fresh';
}
