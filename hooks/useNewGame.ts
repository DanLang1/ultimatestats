import { useAlert } from '@/components/ui/AlertProvider';
import { useGameSessionActions } from '@/hooks/useGameSessionActions';
import { useGameSessionStatus } from '@/hooks/useGameSessionStatus';
import { useStatsTutorialPending } from '@/hooks/useStatsTutorialPending';
import { useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';

interface UseNewGameOptions {
  onSuccess: () => void;
}

export function useNewGame(options?: UseNewGameOptions) {
  const { showAlert } = useAlert();
  const sessionStatus = useGameSessionStatus();
  const { startBasicGameSession } = useGameSessionActions();
  const statTrackingEnabled = useGameStore((state) => state.statTrackingEnabled);
  const statsTutorialPending = useStatsTutorialPending();

  const handleSuccess = () => {
    if (options?.onSuccess) {
      options.onSuccess();
      return;
    }

    if (statsTutorialPending) {
      router.replace('/TutorialStatIntro');
      return;
    }

    router.replace('/PreGameConfirm');
  };

  const confirmNewGame = () => {
    if (sessionStatus === 'fresh') {
      startBasicGameSession();
      handleSuccess();
      return;
    }

    if (sessionStatus === 'finished') {
      startBasicGameSession();
      handleSuccess();
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
            startBasicGameSession();
            handleSuccess();
          },
        },
      ],
    });
  };

  return { confirmNewGame };
}
