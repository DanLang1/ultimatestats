import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type StartupMigrationRecord = {
  completedAt: number;
  version: number;
};

interface StartupMigrationState {
  migrations: Record<string, StartupMigrationRecord>;
  markComplete: (id: string, version: number) => void;
  isComplete: (id: string, version: number) => boolean;
}

export const useStartupMigrationStore = create<StartupMigrationState>()(
  immer(
    persist(
      (set, get) => ({
        migrations: {},

        markComplete: (id, version) => {
          set((state) => {
            state.migrations[id] = {
              completedAt: Date.now(),
              version,
            };
          });
        },

        isComplete: (id, version) => {
          const record = get().migrations[id];
          return record != null && record.version >= version;
        },
      }),
      {
        name: 'ultimatestats_startup_migrations',
        storage: createJSONStorage(() => AsyncStorage),
      },
    ),
  ),
);
