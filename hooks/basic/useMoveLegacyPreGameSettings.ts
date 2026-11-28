import { useEffect } from 'react';

import { reportError } from '@/lib/sentry';
import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

type PersistHydrationApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (callback: () => void) => () => void;
};

function waitForHydration(persist: PersistHydrationApi): Promise<void> {
  if (persist.hasHydrated()) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const unsubscribe = persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

/**
 * Moves the pre-game settings from the basic game's AsyncStorage entry to the settings store, once
 * per device. The settings are written before the entry gives them up, so a start that stops in
 * between moves them again.
 */
export async function moveLegacyPreGameSettingsAtStartup(): Promise<void> {
  try {
    await Promise.all([
      waitForHydration(useGameStore.persist),
      waitForHydration(useSettingsStore.persist),
    ]);
    const { legacyPreGameSettings, dropLegacyPreGameSettings } = useGameStore.getState();
    if (legacyPreGameSettings == null) return;

    // Zustand's persist middleware returns the storage write from setState, although it is typed void.
    await useSettingsStore.setState(legacyPreGameSettings);
    await dropLegacyPreGameSettings();
  } catch (error) {
    reportError('basic-pre-game-settings-move', error);
  }
}

export function useMoveLegacyPreGameSettings() {
  useEffect(() => {
    void moveLegacyPreGameSettingsAtStartup();
  }, []);
}
