import { useAlert } from '@/components/ui/AlertProvider';
import { useGameSessionStatus } from '@/hooks/useGameSessionStatus';
import { useGameStore } from '@/store/gameStore';

interface UseNewGameOptions {
  onSuccess: () => void;
}

export function useNewGame(options?: UseNewGameOptions) {
  const { showAlert } = useAlert();
  const sessionStatus = useGameSessionStatus();
  const resetGame = useGameStore((state) => state.resetGame);
  const statTrackingEnabled = useGameStore((state) => state.statTrackingEnabled);

  const confirmNewGame = () => {
    if (sessionStatus === 'fresh') {
      resetGame();
      options?.onSuccess?.();
      return;
    }

    if (sessionStatus === 'finished') {
      resetGame();
      options?.onSuccess?.();
      return;
    }

    const message = statTrackingEnabled
      ? 'This will reset the current score, timer, and in-progress stats.'
      : 'This will clear the current scoreboard and start fresh.';

    showAlert({
      title: 'Start New Game?',
      message,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New Game',
          style: 'success',
          onPress: () => {
            resetGame();
            options?.onSuccess?.();
          },
        },
      ],
    });
  };

  return { confirmNewGame };
}
