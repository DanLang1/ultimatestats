import { getGameSessionStatus } from '@/lib/gameSessionUtils';
import { useCompletedAdvancedGameSummaries } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { useGameStore } from '@/store/gameStore';

export function useDashboardSession() {
  const statTrackingEnabled = useGameStore((state) => state.statTrackingEnabled);
  const currentTeam = useGameStore((state) => state.currentTeam);
  const savedGames = useGameStore((state) => state.savedGames);
  const { data: completedAdvancedSavedGameSummaries = [] } = useCompletedAdvancedGameSummaries();
  const advancedSavedGameCount = completedAdvancedSavedGameSummaries.length;
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
  const team2Name = useGameStore((state) => state.team2Name);

  const team1Name = currentTeam.name;
  const rosterCount = currentTeam.roster.length;
  const gamesCount = savedGames.length + advancedSavedGameCount;
  const sessionStatus = getGameSessionStatus({
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

  return {
    currentTeam,
    statTrackingEnabled,
    team1Name,
    team2Name,
    rosterCount,
    gamesCount,
    sessionStatus,
    hasInProgressGame: sessionStatus === 'inProgress',
    hasCompletedGame: sessionStatus === 'finished',
    completedGameSummary: `${team1Name} ${team1Score} - ${team2Score} ${team2Name}`,
  };
}
