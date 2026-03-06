import { getGameSessionStatus } from '@/lib/gameSessionUtils';
import { useGameStore } from '@/store/gameStore';

export function useGameSessionStatus() {
  const team1Score = useGameStore((state) => state.team1Score);
  const team2Score = useGameStore((state) => state.team2Score);
  const gameTo = useGameStore((state) => state.gameTo);
  const timerTimeLeft = useGameStore((state) => state.timerTimeLeft);
  const currentGameStatus = useGameStore((state) => state.currentGameStatus);
  const events = useGameStore((state) => state.events);
  const currentPoint = useGameStore((state) => state.currentPoint);
  const currentPointStartTime = useGameStore((state) => state.currentPointStartTime);
  const pointTimerPausedElapsed = useGameStore((state) => state.pointTimerPausedElapsed);
  const possession = useGameStore((state) => state.possession);
  const startingPossession = useGameStore((state) => state.startingPossession);
  const pendingStatEntry = useGameStore((state) => state.pendingStatEntry);
  const pendingTurnoverEntry = useGameStore((state) => state.pendingTurnoverEntry);
  const pendingTimeoutModal = useGameStore((state) => state.pendingTimeoutModal);
  const isHalftimeBreak = useGameStore((state) => state.isHalftimeBreak);
  const currentGameId = useGameStore((state) => state.currentGameId);

  return getGameSessionStatus({
    team1Score,
    team2Score,
    gameTo,
    timerTimeLeft,
    currentGameStatus,
    events,
    currentPoint,
    currentPointStartTime,
    pointTimerPausedElapsed,
    possession,
    startingPossession,
    pendingStatEntry,
    pendingTurnoverEntry,
    pendingTimeoutModal,
    isHalftimeBreak,
    currentGameId,
  });
}
