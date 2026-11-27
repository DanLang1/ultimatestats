import { useEffect } from 'react';

import { reportError } from '@/lib/sentry';
import { useGameStore } from '@/store/basic/gameStore';

function waitForBasicGameStoreHydration(): Promise<void> {
  if (useGameStore.persist.hasHydrated()) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const unsubscribe = useGameStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

/**
 * Loads the saved basic games from SQLite. It waits for the basic game store to read its
 * AsyncStorage entry first, because the first load on a device moves that entry's games to SQLite.
 */
export async function loadSavedBasicGamesAtStartup(): Promise<void> {
  try {
    await waitForBasicGameStoreHydration();
    await useGameStore.getState().loadSavedGames();
  } catch (error) {
    reportError('basic-saved-games-load', error);
  }
}

export function useLoadSavedBasicGames() {
  useEffect(() => {
    void loadSavedBasicGamesAtStartup();
  }, []);
}
