import { storage } from '@/lib/storage';
import { Tournament } from '@/lib/storage/types';
import { generateId } from '@/lib/utils';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface TournamentState {
  tournaments: Tournament[];
  loadTournaments: () => Promise<void>;
  addTournament: (name: string, startDate: string, endDate: string) => Promise<string>;
  updateTournament: (id: string, updates: Partial<Omit<Tournament, 'id'>>) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
}

export const useTournamentStore = create<TournamentState>()(
  immer((set, get) => ({
    tournaments: [],

    loadTournaments: async () => {
      const tournaments = await storage.loadTournaments();
      set((state) => {
        state.tournaments = tournaments;
      });
    },

    addTournament: async (name: string, startDate: string, endDate: string) => {
      const tournament: Tournament = {
        id: generateId(),
        name,
        startDate,
        endDate,
      };

      await storage.saveTournament(tournament);
      set((state) => {
        state.tournaments.push(tournament);
      });

      return tournament.id;
    },

    updateTournament: async (id: string, updates: Partial<Omit<Tournament, 'id'>>) => {
      const existing = get().tournaments.find((t) => t.id === id);
      if (!existing) return;

      const updated: Tournament = { ...existing, ...updates };

      await storage.saveTournament(updated);
      set((state) => {
        const idx = state.tournaments.findIndex((t) => t.id === id);
        if (idx !== -1) {
          state.tournaments[idx] = updated;
        }
      });
    },

    deleteTournament: async (id: string) => {
      await storage.deleteTournament(id);
      set((state) => {
        state.tournaments = state.tournaments.filter((t) => t.id !== id);
      });
    },
  })),
);
