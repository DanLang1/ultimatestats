import { useEffect } from 'react';

import { reportError } from '@/lib/sentry';
import { useGameStore } from '@/store/basic/gameStore';
import { useSavedBasicGamesStore } from '@/store/basic/savedGamesStore';

function waitForBasicGameStoreHydration(): Promise<void> {
  if (useGameStore.persist.hasHydrated()) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const unsubscribe = useGameStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

// After a failed move the AsyncStorage entry is still the copy the next start moves to SQLite, so
// it has to follow the saves, edits and deletes made until then.
function keepAsyncStorageSavedGamesCurrent() {
  useSavedBasicGamesStore.subscribe(({ savedGames }) => {
    useGameStore.setState({ asyncStorageSavedGames: savedGames });
  });
}

async function moveAsyncStorageGamesAndLoad(): Promise<void> {
  const { asyncStorageSavedGames, dropAsyncStorageSavedGames } = useGameStore.getState();
  const hasAsyncStorageSavedGames = asyncStorageSavedGames != null;

  try {
    await useSavedBasicGamesStore.getState().loadSavedGames(asyncStorageSavedGames ?? []);
  } catch (error) {
    if (hasAsyncStorageSavedGames) keepAsyncStorageSavedGamesCurrent();
    throw error;
  }
  if (hasAsyncStorageSavedGames) await dropAsyncStorageSavedGames();
}

/**
 * Loads the saved basic games from SQLite. It waits for the basic game store to read its
 * AsyncStorage entry first, because the first load on a device moves that entry's games to SQLite.
 * The entry gives the games up only once that load has succeeded.
 */
export async function loadSavedBasicGamesAtStartup(): Promise<void> {
  try {
    await waitForBasicGameStoreHydration();
    await moveAsyncStorageGamesAndLoad();
  } catch (error) {
    reportError('basic-saved-games-load', error);
  }
}

export function useLoadSavedBasicGames() {
  useEffect(() => {
    void loadSavedBasicGamesAtStartup();
  }, []);
}
