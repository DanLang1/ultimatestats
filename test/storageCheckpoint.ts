import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A frozen copy of the app's AsyncStorage: storage key to value. JSON objects and arrays are held
 * parsed; every other value is the exact stored string. Written by
 * `scripts/capture-storage-checkpoint.ts`; see `test/fixtures/storage-checkpoints/README.md`.
 */
export type StorageCheckpoint = Record<string, unknown>;

type PersistHydrationApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (callback: () => void) => () => void;
};

type PersistedStore = {
  persist: PersistHydrationApi;
  // Zustand's persist middleware returns the storage write from setState, although it is typed void.
  setState: (partial: Record<string, never>) => unknown;
};

const CHECKPOINT_ROOT = join(__dirname, 'fixtures', 'storage-checkpoints');

export function readCheckpointFile(relativePath: string): StorageCheckpoint {
  const checkpoint: StorageCheckpoint = JSON.parse(
    readFileSync(join(CHECKPOINT_ROOT, relativePath), 'utf8'),
  );
  return checkpoint;
}

function toStoredValue(checkpointValue: unknown): string {
  return typeof checkpointValue === 'string' ? checkpointValue : JSON.stringify(checkpointValue);
}

// Mirrors toCheckpointValue in scripts/capture-storage-checkpoint.ts.
function toCheckpointValue(storedValue: string): unknown {
  try {
    const parsed: unknown = JSON.parse(storedValue);
    const isJsonContainer = typeof parsed === 'object' && parsed !== null;
    return isJsonContainer ? parsed : storedValue;
  } catch {
    return storedValue;
  }
}

/** Replaces the whole AsyncStorage mock content with the checkpoint. */
export async function seedStorage(checkpoint: StorageCheckpoint) {
  await AsyncStorage.clear();
  await AsyncStorage.multiSet(
    Object.entries(checkpoint).map(([key, value]): [string, string] => [key, toStoredValue(value)]),
  );
}

/** Returns the current AsyncStorage mock content in checkpoint format. */
export async function readStorage(): Promise<StorageCheckpoint> {
  const keys = await AsyncStorage.getAllKeys();
  const entries = await AsyncStorage.multiGet(keys);

  return Object.fromEntries(
    entries.map(([key, storedValue]) => {
      if (storedValue === null) throw new Error(`Storage key "${key}" has no value.`);
      return [key, toCheckpointValue(storedValue)];
    }),
  );
}

function waitForHydration(persist: PersistHydrationApi) {
  if (persist.hasHydrated()) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const unsubscribe = persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

/**
 * Simulates a cold app start against whatever AsyncStorage currently holds: every store module is
 * evaluated fresh, all persisted stores hydrate, and the startup migrations run.
 */
export async function coldStartApp() {
  // After the reset, the first require of each module evaluates it again, as a new process would.
  jest.resetModules();

  const { useAdvancedTrackingStore } = jest.requireActual<
    typeof import('@/store/advancedTracking/trackingStore')
  >('@/store/advancedTracking/trackingStore');
  const { useGameStore } =
    jest.requireActual<typeof import('@/store/basic/gameStore')>('@/store/basic/gameStore');
  const { useGameSessionStore } = jest.requireActual<typeof import('@/store/gameSessionStore')>(
    '@/store/gameSessionStore',
  );
  const { useLinePresetsStore } = jest.requireActual<typeof import('@/store/linePresetsStore')>(
    '@/store/linePresetsStore',
  );
  const { useSettingsStore } =
    jest.requireActual<typeof import('@/store/settingsStore')>('@/store/settingsStore');
  const { useStartupMigrationStore } = jest.requireActual<
    typeof import('@/store/startupMigrationStore')
  >('@/store/startupMigrationStore');
  const { useTournamentStore } =
    jest.requireActual<typeof import('@/store/tournamentStore')>('@/store/tournamentStore');
  const { useTutorialStore } =
    jest.requireActual<typeof import('@/store/tutorialStore')>('@/store/tutorialStore');
  const { runReadyStartupMigrations } = jest.requireActual<
    typeof import('@/hooks/useStartupMigrations')
  >('@/hooks/useStartupMigrations');
  const Sentry = jest.requireMock<typeof import('@sentry/react-native')>('@sentry/react-native');

  const persistedStores: PersistedStore[] = [
    useAdvancedTrackingStore,
    useGameStore,
    useGameSessionStore,
    useLinePresetsStore,
    useSettingsStore,
    useStartupMigrationStore,
    useTournamentStore,
    useTutorialStore,
  ];

  await Promise.all(persistedStores.map((store) => waitForHydration(store.persist)));
  await runReadyStartupMigrations();

  return {
    useGameStore,
    /** Errors sent to Sentry during this start; hydration failures are otherwise silent. */
    reportedErrors: jest.mocked(Sentry.captureException).mock.calls,
    /** Makes every persisted store write its current state, as any later state change would. */
    writeAllPersistedStores: async () => {
      await Promise.all(persistedStores.map((store) => store.setState({})));
    },
  };
}
