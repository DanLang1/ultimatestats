import { Tournament } from '@/lib/storage/types';
import { generateId } from '@/lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Zustand persist wraps state as {"state":{...},"version":N}.
// The legacy key stored a raw Tournament[] array. This adapter detects the old
// format on first read and converts it so existing data is preserved without a
// separate migration step. After the first Zustand write the key is in the new
// format and the conversion is a no-op.
const legacyAwareStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const raw = await AsyncStorage.getItem(name);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Legacy format — wrap for Zustand persist
        return JSON.stringify({ state: { tournaments: parsed }, version: 0 });
      }
    } catch {}
    return raw;
  },
  setItem: (name: string, value: string) => AsyncStorage.setItem(name, value),
  removeItem: (name: string) => AsyncStorage.removeItem(name),
};

interface TournamentState {
  tournaments: Tournament[];
  addTournament: (name: string, startDate: string, endDate: string) => Promise<string>;
  updateTournament: (id: string, updates: Partial<Omit<Tournament, 'id'>>) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
}

export const useTournamentStore = create<TournamentState>()(
  immer(
    persist(
      (set, get) => ({
        tournaments: [],

        addTournament: async (name: string, startDate: string, endDate: string) => {
          const tournament: Tournament = {
            id: generateId(),
            name,
            startDate,
            endDate,
          };
          set((state) => {
            state.tournaments.push(tournament);
          });
          return tournament.id;
        },

        updateTournament: async (id: string, updates: Partial<Omit<Tournament, 'id'>>) => {
          const existing = get().tournaments.find((t) => t.id === id);
          if (!existing) return;
          const updated: Tournament = { ...existing, ...updates };
          set((state) => {
            const idx = state.tournaments.findIndex((t) => t.id === id);
            if (idx !== -1) {
              state.tournaments[idx] = updated;
            }
          });
        },

        deleteTournament: async (id: string) => {
          set((state) => {
            state.tournaments = state.tournaments.filter((t) => t.id !== id);
          });
        },
      }),
      {
        name: 'ultimatestats_tournaments',
        storage: createJSONStorage(() => legacyAwareStorage),
      },
    ),
  ),
);
