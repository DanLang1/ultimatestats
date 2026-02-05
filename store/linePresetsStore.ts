import { LinePreset } from '@/lib/storage/types';
import { generateId } from '@/lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface LinePresetsState {
  presets: LinePreset[];
  lineConfirmedForNextPoint: boolean;
  addPreset: (name: string, playerIds: string[], teamId: string) => string;
  updatePreset: (id: string, updates: Partial<Omit<LinePreset, 'id'>>) => void;
  deletePreset: (id: string) => void;
  removePlayerFromPresets: (playerId: string) => void;
  clearPresetsForTeam: (teamId: string) => void;
  setLineConfirmedForNextPoint: (confirmed: boolean) => void;
}

export const useLinePresetsStore = create<LinePresetsState>()(
  immer(
    persist(
      (set, get) => ({
        presets: [],
        lineConfirmedForNextPoint: false,

        addPreset: (name: string, playerIds: string[], teamId: string) => {
          const id = generateId();
          set((state) => {
            state.presets.push({ id, name, playerIds, teamId });
          });
          return id;
        },

        updatePreset: (id: string, updates: Partial<Omit<LinePreset, 'id'>>) => {
          set((state) => {
            const preset = state.presets.find((p) => p.id === id);
            if (preset) {
              Object.assign(preset, updates);
            }
          });
        },

        deletePreset: (id: string) => {
          set((state) => {
            state.presets = state.presets.filter((preset) => preset.id !== id);
          });
        },

        removePlayerFromPresets: (playerId: string) => {
          set((state) => {
            state.presets.forEach((preset) => {
              preset.playerIds = preset.playerIds.filter((id) => id !== playerId);
            });
          });
        },
        clearPresetsForTeam: (teamId: string) => {
          set((state) => {
            state.presets.forEach((preset) => {
              if (preset.teamId === teamId) {
                preset.playerIds = [];
              }
            });
          });
        },

        setLineConfirmedForNextPoint: (confirmed: boolean) => {
          set((state) => {
            state.lineConfirmedForNextPoint = confirmed;
          });
        },
      }),
      {
        name: 'ultimatestats-line-presets',
        storage: createJSONStorage(() => AsyncStorage),
      },
    ),
  ),
);
