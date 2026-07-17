import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { SavedGame, Tournament, TournamentGameLink, TournamentKind } from '@/lib/storage/types';
import { generateId } from '@/lib/utils';

const TOURNAMENT_SCHEMA_VERSION = 1;
const TOURNAMENT_LINK_SCHEMA_VERSION = 1;
const LEGACY_TOURNAMENT_TIMESTAMP = 0;

type LegacyTournament = Partial<Tournament> & {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

type TournamentPersistState = {
  tournaments?: LegacyTournament[];
  gameLinks?: TournamentGameLink[];
};

// Zustand persist wraps state as {"state":{...},"version":N}.
// The legacy key stored a raw Tournament[] array. This adapter only converts
// the envelope; record enrichment happens in onRehydrateStorage below.
const legacyAwareStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const raw = await AsyncStorage.getItem(name);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
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
  gameLinks: TournamentGameLink[];
  addTournament: (name: string, startDate: string, endDate: string) => Promise<string>;
  updateTournament: (id: string, updates: Partial<Omit<Tournament, 'id'>>) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  addGamesToTournament: (
    tournamentId: string,
    gameKind: TournamentKind,
    gameIds: string[],
  ) => Promise<boolean>;
  removeGameFromTournament: (gameKind: TournamentKind, gameId: string) => Promise<void>;
  migrateBasicTournamentLinks: (savedGames: SavedGame[]) => Promise<void>;
  getTournamentIdForGame: (gameKind: TournamentKind, gameId: string) => string | null;
  getLinksForTournament: (tournamentId: string) => TournamentGameLink[];
  getTournamentGameCounts: (gameKind: TournamentKind) => Map<string, number>;
}

function getTournamentKind(tournament: Tournament | LegacyTournament): TournamentKind | null {
  if (tournament.kind === null) return null;
  if (tournament.kind === 'advanced' || tournament.kind === 'basic') return tournament.kind;
  return 'basic';
}

function enrichTournament(tournament: LegacyTournament): Tournament {
  const timestamp = tournament.createdAt ?? tournament.updatedAt ?? LEGACY_TOURNAMENT_TIMESTAMP;
  return {
    id: tournament.id,
    schemaVersion: tournament.schemaVersion ?? TOURNAMENT_SCHEMA_VERSION,
    kind: getTournamentKind(tournament),
    name: tournament.name,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    createdAt: tournament.createdAt ?? timestamp,
    updatedAt: tournament.updatedAt ?? timestamp,
  };
}

function isValidGameKind(kind: unknown): kind is TournamentKind {
  return kind === 'basic' || kind === 'advanced';
}

function normalizeLinks(links: TournamentGameLink[] | undefined): TournamentGameLink[] {
  const linkByGame = new Map<string, TournamentGameLink>();

  for (const link of links ?? []) {
    if (!isValidGameKind(link.gameKind) || !link.gameId || !link.tournamentId) continue;
    const normalized: TournamentGameLink = {
      id: link.id || generateId(),
      schemaVersion: link.schemaVersion ?? TOURNAMENT_LINK_SCHEMA_VERSION,
      tournamentId: link.tournamentId,
      gameKind: link.gameKind,
      gameId: link.gameId,
      createdAt: link.createdAt ?? LEGACY_TOURNAMENT_TIMESTAMP,
    };
    const key = `${normalized.gameKind}:${normalized.gameId}`;
    const existing = linkByGame.get(key);
    if (
      !existing ||
      normalized.createdAt > existing.createdAt ||
      (normalized.createdAt === existing.createdAt && normalized.id > existing.id)
    ) {
      linkByGame.set(key, normalized);
    }
  }

  return Array.from(linkByGame.values());
}

function getKnownTournamentIds(tournaments: Tournament[], kind: TournamentKind) {
  return new Set(
    tournaments.filter((tournament) => tournament.kind === kind).map((tournament) => tournament.id),
  );
}

function unlockEmptyTournaments(
  tournaments: Tournament[],
  links: TournamentGameLink[],
  now: number,
) {
  const linkedTournamentIds = new Set(links.map((link) => link.tournamentId));
  for (const tournament of tournaments) {
    if (tournament.kind !== null && !linkedTournamentIds.has(tournament.id)) {
      tournament.kind = null;
      tournament.updatedAt = now;
    }
  }
}

export const useTournamentStore = create<TournamentState>()(
  immer(
    persist(
      (set, get) => ({
        tournaments: [],
        gameLinks: [],

        addTournament: async (name: string, startDate: string, endDate: string) => {
          const now = Date.now();
          const tournament: Tournament = {
            id: generateId(),
            schemaVersion: TOURNAMENT_SCHEMA_VERSION,
            kind: null,
            name,
            startDate,
            endDate,
            createdAt: now,
            updatedAt: now,
          };
          set((state) => {
            state.tournaments.push(tournament);
          });
          return tournament.id;
        },

        updateTournament: async (id: string, updates: Partial<Omit<Tournament, 'id'>>) => {
          const existing = get().tournaments.find((t) => t.id === id);
          if (!existing) return;
          const updated: Tournament = { ...existing, ...updates, updatedAt: Date.now() };
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
            state.gameLinks = state.gameLinks.filter((link) => link.tournamentId !== id);
          });
        },

        addGamesToTournament: async (tournamentId, gameKind, gameIds) => {
          const tournament = get().tournaments.find((t) => t.id === tournamentId);
          if (!tournament || !isValidGameKind(gameKind) || gameIds.length === 0) return false;
          if (tournament.kind !== null && tournament.kind !== gameKind) return false;

          const uniqueGameIds = [...new Set(gameIds)];
          const now = Date.now();

          set((state) => {
            const idx = state.tournaments.findIndex((t) => t.id === tournamentId);
            if (idx === -1) return;
            state.tournaments[idx].kind = gameKind;
            state.tournaments[idx].updatedAt = now;

            const selectedIds = new Set(uniqueGameIds);
            state.gameLinks = state.gameLinks.filter(
              (link) => !(link.gameKind === gameKind && selectedIds.has(link.gameId)),
            );
            for (const gameId of uniqueGameIds) {
              state.gameLinks.push({
                id: generateId(),
                schemaVersion: TOURNAMENT_LINK_SCHEMA_VERSION,
                tournamentId,
                gameKind,
                gameId,
                createdAt: now,
              });
            }
          });
          return true;
        },

        removeGameFromTournament: async (gameKind, gameId) => {
          const now = Date.now();
          set((state) => {
            state.gameLinks = state.gameLinks.filter(
              (link) => !(link.gameKind === gameKind && link.gameId === gameId),
            );
            unlockEmptyTournaments(state.tournaments, state.gameLinks, now);
          });
        },

        migrateBasicTournamentLinks: async (savedGames) => {
          const basicTournamentIds = getKnownTournamentIds(get().tournaments, 'basic');
          const existingBasicGameIds = new Set(
            get()
              .gameLinks.filter((link) => link.gameKind === 'basic')
              .map((link) => link.gameId),
          );
          const now = Date.now();
          const linksToAdd: TournamentGameLink[] = [];

          for (const game of savedGames) {
            if (game.importedAt != null || !game.tournamentId) continue;
            if (!basicTournamentIds.has(game.tournamentId)) continue;
            if (existingBasicGameIds.has(game.id)) continue;
            existingBasicGameIds.add(game.id);
            linksToAdd.push({
              id: generateId(),
              schemaVersion: TOURNAMENT_LINK_SCHEMA_VERSION,
              tournamentId: game.tournamentId,
              gameKind: 'basic',
              gameId: game.id,
              createdAt: now,
            });
          }

          set((state) => {
            state.gameLinks.push(...linksToAdd);
          });
        },

        getTournamentIdForGame: (gameKind, gameId) =>
          get().gameLinks.find((link) => link.gameKind === gameKind && link.gameId === gameId)
            ?.tournamentId ?? null,

        getLinksForTournament: (tournamentId) =>
          get().gameLinks.filter((link) => link.tournamentId === tournamentId),

        getTournamentGameCounts: (gameKind) => {
          const counts = new Map<string, number>();
          for (const link of get().gameLinks) {
            if (link.gameKind !== gameKind) continue;
            counts.set(link.tournamentId, (counts.get(link.tournamentId) ?? 0) + 1);
          }
          return counts;
        },
      }),
      {
        name: 'ultimatestats_tournaments',
        storage: createJSONStorage(() => legacyAwareStorage),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          const persisted = state as TournamentState & TournamentPersistState;
          useTournamentStore.setState({
            tournaments: (persisted.tournaments ?? []).map(enrichTournament),
            gameLinks: normalizeLinks(persisted.gameLinks),
          });
        },
      },
    ),
  ),
);
