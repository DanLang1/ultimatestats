import { useAlert } from '@/components/ui/AlertProvider';
import { useGameStore } from '@/store/gameStore';
import { useEffect, useEffectEvent } from 'react';

export function useLoadSavedGamesWithAlert() {
  const loadSavedGames = useGameStore((state) => state.loadSavedGames);
  const { showAlert } = useAlert();

  const showLoadFailureAlert = useEffectEvent(() => {
    showAlert({
      title: 'Saved games could not be loaded',
      message: 'Could not load saved games. Data may be corrupted.',
    });
  });

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        await loadSavedGames();
      } catch (error) {
        console.error('Failed to load saved games.', error);
        if (isCancelled) {
          return;
        }

        showLoadFailureAlert();
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [loadSavedGames]);
}
