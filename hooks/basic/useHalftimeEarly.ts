import { useAlert } from '@/components/ui/AlertProvider';
import { canTriggerHalftimeEarly } from '@/lib/basic/halftimeUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { router } from 'expo-router';

export function useHalftimeEarly() {
  const { showAlert } = useAlert();
  const {
    gameHalf,
    events,
    autoHalftimeEnabled,
    team1Score,
    team2Score,
    gameTo,
    timerTimeLeft,
    triggerHalftimeEarly,
  } = useGameStore();

  const guardState = {
    autoHalftimeEnabled,
    gameHalf,
    team1Score,
    team2Score,
    gameTo,
    timerTimeLeft,
    events,
  };
  const canTriggerEarly = canTriggerHalftimeEarly(guardState);

  const confirmHalftimeEarly = () => {
    showAlert({
      title: 'Start 2nd Half Early?',
      message: 'This will mark the last goal as halftime and begin the halftime break now.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start 2nd Half',
          style: 'default',
          onPress: () => {
            triggerHalftimeEarly();
            router.back();
          },
        },
      ],
    });
  };

  return {
    canTriggerHalftimeEarly: canTriggerEarly,
    confirmHalftimeEarly,
  };
}
