import { LinePreset } from '@/lib/storage/types';
import { generateId } from '@/lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LinePresetsState {
  presets: LinePreset[];
  addPreset: (name: string, playerIds: string[], teamId: string) => string;
  updatePreset: (id: string, updates: Partial<Omit<LinePreset, 'id'>>) => void;
  deletePreset: (id: string) => void;
  removePlayerFromPresets: (playerId: string) => void;
}

export const useLinePresetsStore = create<LinePresetsState>()(
  persist(
    (set, get) => ({
      presets: [],

      addPreset: (name: string, playerIds: string[], teamId: string) => {
        const id = generateId();
        set((state) => ({
          presets: [
            ...state.presets,
            {
              id,
              name,
              playerIds,
              teamId,
            },
          ],
        }));
        return id;
      },

      updatePreset: (id: string, updates: Partial<Omit<LinePreset, 'id'>>) => {
        set((state) => ({
          presets: state.presets.map((preset) =>
            preset.id === id ? { ...preset, ...updates } : preset,
          ),
        }));
      },

      deletePreset: (id: string) => {
        set((state) => ({
          presets: state.presets.filter((preset) => preset.id !== id),
        }));
      },

      removePlayerFromPresets: (playerId: string) => {
        set((state) => ({
          presets: state.presets.map((preset) => ({
            ...preset,
            playerIds: preset.playerIds.filter((id) => id !== playerId),
          })),
        }));
      },
    }),
    {
      name: 'ultimatestats-line-presets',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
