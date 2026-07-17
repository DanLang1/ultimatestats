import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { LinePreset } from '@/lib/storage/types';
import { generateId } from '@/lib/utils';

interface LinePresetsState {
  presets: LinePreset[];
  lineConfirmedForNextPoint: boolean;
  addPreset: (name: string, playerIds: string[], teamId: string) => string;
  updatePreset: (id: string, updates: Partial<Omit<LinePreset, 'id'>>) => void;
  deletePreset: (id: string) => void;
  removePlayerFromPresets: (playerId: string) => void;
  reorderPresets: (teamId: string, fromIndex: number, toIndex: number) => void;
  clearPresetsForTeam: (teamId: string) => void;
  importPresetsForTeam: (teamId: string, presets: LinePreset[]) => void;
  setLineConfirmedForNextPoint: (confirmed: boolean) => void;
}

export const useLinePresetsStore = create<LinePresetsState>()(
  immer(
    persist(
      (set) => ({
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
        reorderPresets: (teamId: string, fromIndex: number, toIndex: number) => {
          set((state) => {
            const teamPresets = state.presets.filter((p) => p.teamId === teamId);
            const others = state.presets.filter((p) => p.teamId !== teamId);
            const [moved] = teamPresets.splice(fromIndex, 1);
            teamPresets.splice(toIndex, 0, moved);
            state.presets = [...others, ...teamPresets];
          });
        },

        clearPresetsForTeam: (teamId: string) => {
          set((state) => {
            state.presets = state.presets.filter((preset) => preset.teamId !== teamId);
          });
        },

        importPresetsForTeam: (teamId: string, presets: LinePreset[]) => {
          set((state) => {
            state.presets = state.presets.filter((p) => p.teamId !== teamId);
            state.presets.push(...presets);
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
