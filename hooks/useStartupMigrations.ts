import { useGameStore } from '@/store/gameStore';
import { useStartupMigrationStore } from '@/store/startupMigrationStore';
import { useTournamentStore } from '@/store/tournamentStore';
import { useEffect, useRef } from 'react';

export type StartupMigration = {
  id: string;
  version: number;
  isReady: () => boolean;
  isComplete: () => boolean;
  run: () => Promise<void>;
};

let startupMigrationPromise: Promise<void> | null = null;

export function resetStartupMigrationRunnerForTests() {
  startupMigrationPromise = null;
}

export function createStartupMigrations(): StartupMigration[] {
  return [
    {
      id: 'basic-tournament-links',
      version: 1,
      isReady: () =>
        useGameStore.persist.hasHydrated() &&
        useTournamentStore.persist.hasHydrated() &&
        useStartupMigrationStore.persist.hasHydrated(),
      isComplete: () => useStartupMigrationStore.getState().isComplete('basic-tournament-links', 1),
      run: async () => {
        const { savedGames } = useGameStore.getState();
        await useTournamentStore.getState().migrateBasicTournamentLinks(savedGames);
      },
    },
  ];
}

export async function runReadyStartupMigrations(
  migrations = createStartupMigrations(),
  shouldCancel: () => boolean = () => false,
) {
  if (startupMigrationPromise) {
    return startupMigrationPromise;
  }

  startupMigrationPromise = Promise.resolve()
    .then(async () => {
      for (const migration of migrations) {
        if (shouldCancel()) return;
        if (!migration.isReady() || migration.isComplete()) continue;
        await migration.run();
        if (shouldCancel()) return;
        useStartupMigrationStore.getState().markComplete(migration.id, migration.version);
      }
    })
    .catch((error: unknown) => {
      console.error('Startup migration failed', error);
    })
    .finally(() => {
      startupMigrationPromise = null;
    });

  return startupMigrationPromise;
}

export function useStartupMigrations() {
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const runReadyMigrations = async () => {
      if (cancelledRef.current) return;
      await runReadyStartupMigrations(undefined, () => cancelledRef.current);
    };

    const unsubGame = useGameStore.persist.onFinishHydration(runReadyMigrations);
    const unsubTournament = useTournamentStore.persist.onFinishHydration(runReadyMigrations);
    const unsubMigrations = useStartupMigrationStore.persist.onFinishHydration(runReadyMigrations);
    runReadyMigrations();

    return () => {
      cancelledRef.current = true;
      unsubGame();
      unsubTournament();
      unsubMigrations();
    };
  }, []);
}
