import { useAlert } from '@/components/ui/AlertProvider';
import { useGameStore } from '@/store/gameStore';

interface UseNewGameOptions {
  onSuccess: () => void;
}

export function useNewGame(options?: UseNewGameOptions) {
  const { showAlert } = useAlert();
  const resetGame = useGameStore((state) => state.resetGame);

  const confirmNewGame = () => {
    showAlert({
      title: 'Start New Game?',
      message: 'This will reset the score, timer, and all stats.',
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
