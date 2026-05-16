import { useAlert } from '@/components/ui/AlertProvider';
import { useGameSessionActions } from '@/hooks/useGameSessionActions';
import { useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';

export function useEndGame() {
  const { showAlert } = useAlert();
  const { finishActiveGameSession } = useGameSessionActions();
  const {
    team1Score,
    team2Score,
    currentTeam,
    team2Name,
    setTimerActive,
    setCurrentGameStatus,
    setPostGameFlowPending,
    saveCurrentGame,
    statTrackingEnabled,
  } = useGameStore();

  const team1Name = currentTeam?.name ?? 'Team 1';

  const confirmEndGame = () => {
    // Build contextual message based on score state
    const isTied = team1Score === team2Score;
    const winningTeam = team1Score > team2Score ? team1Name : team2Name;
    const winnerScore = Math.max(team1Score, team2Score);
    const loserScore = Math.min(team1Score, team2Score);

    const message = isTied
      ? `End game as a ${team1Score}-${team2Score} tie?`
      : `End game with ${winningTeam} winning ${winnerScore}-${loserScore}?`;

    showAlert({
      title: 'End Game Early?',
      message,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Game',
          style: 'destructive',
          onPress: async () => {
            // Stop timer
            setTimerActive(false);

            // Save game if stat tracking enabled
            if (statTrackingEnabled) {
              await saveCurrentGame();
            }

            setCurrentGameStatus('finished');
            setPostGameFlowPending(true);
            finishActiveGameSession();
            router.push('/GameComplete');
          },
        },
      ],
    });
  };

  return { confirmEndGame };
}
