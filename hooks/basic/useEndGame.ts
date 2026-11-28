import { router } from 'expo-router';

import { useAlert } from '@/components/ui/AlertProvider';
import { useFinishBasicGame } from '@/hooks/basic/useFinishBasicGame';
import { useGameStore } from '@/store/basic/gameStore';
import { useCurrentTeam } from '@/store/teamStore';

export function useEndGame() {
  const { showAlert } = useAlert();
  const finishGame = useFinishBasicGame();
  const currentTeam = useCurrentTeam();
  const { team1Score, team2Score, team2Name, pauseGameClock } = useGameStore();

  const team1Name = currentTeam.name;

  const confirmEndGame = () => {
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
            pauseGameClock();
            await finishGame(() => router.push('/game-complete'));
          },
        },
      ],
    });
  };

  return { confirmEndGame };
}
