import { useAlert } from '@/components/ui/AlertProvider';
import { finishActiveGameSession } from '@/hooks/useGameSessionActions';
import { reportError } from '@/lib/sentry';
import { useGameStore } from '@/store/basic/gameStore';

/**
 * Ends the basic game in progress: saves it when stats are tracked, then marks it finished and runs
 * `onFinished`. A game that cannot be saved stays in progress, and an alert offers to try again.
 */
export function useFinishBasicGame() {
  const { showAlert } = useAlert();

  const finishGame = async (onFinished?: () => void): Promise<void> => {
    const { statTrackingEnabled, saveCurrentGame, setCurrentGameStatus, setPostGameFlowPending } =
      useGameStore.getState();

    try {
      if (statTrackingEnabled) await saveCurrentGame();
    } catch (error) {
      reportError('basic-game-save', error);
      showAlert({
        title: 'Game not saved',
        message: 'Could not save the game. Please try again.',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: () => void finishGame(onFinished) },
        ],
      });
      return;
    }

    setCurrentGameStatus('finished');
    setPostGameFlowPending(true);
    finishActiveGameSession();
    onFinished?.();
  };

  return finishGame;
}
