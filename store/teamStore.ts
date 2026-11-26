import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { reportError, reportHydrationError } from '@/lib/sentry';
import {
  LegacyBasicGameTeams,
  seedTeamStateFromLegacyBasicGame,
} from '@/lib/storage/migrations/team_store_seed';
import { SavedTeam } from '@/lib/storage/types';
import { generateId } from '@/lib/utils';

import {
  PersistedTeamState,
  RosterPlayerEdit,
  RosterPlayerEditResult,
  RosterPlayerUpdates,
} from './teamStore.types';

const TEAM_STORAGE_KEY = 'ultimatestats-team-storage';
const TEAM_STORAGE_VERSION = 0;
// Where 2.6.x kept team data. Read once to seed this store. The basic game store no longer persists
// the team keys, so its next write drops them from this entry.
const LEGACY_BASIC_GAME_STORAGE_KEY = 'ultimatestats-game-storage';

interface TeamState extends PersistedTeamState {
  addPlayer: (name: string) => string | null;
  updateRosterPlayer: (playerId: string, updates: RosterPlayerUpdates) => RosterPlayerEdit;
  clearRoster: () => void;
  /** Adds or replaces the team by id and makes it the current team. */
  setCurrentTeam: (team: SavedTeam) => Promise<void>;
  /** Adds or replaces the team by id; the current team stays the same. */
  importTeam: (team: SavedTeam) => Promise<void>;
  switchTeam: (teamId: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
}

type LegacyBasicGameEntry = {
  state: Partial<LegacyBasicGameTeams>;
};

// The persist middleware's `set` returns the storage write promise, which zustand leaves untyped.
async function untilWritten(storageWrite: unknown): Promise<void> {
  await storageWrite;
}

export function selectCurrentTeam(state: PersistedTeamState): SavedTeam {
  const currentTeam = state.teams.find((team) => team.id === state.currentTeamId);
  if (!currentTeam) throw new Error(`Current team "${state.currentTeamId}" is not in the teams.`);
  return currentTeam;
}

function upsertTeam(teams: SavedTeam[], team: SavedTeam) {
  const existingIndex = teams.findIndex((t) => t.id === team.id);
  if (existingIndex >= 0) {
    teams[existingIndex] = team;
  } else {
    teams.push(team);
  }
}

async function readSeededTeamEntry(): Promise<string | null> {
  const basicGameEntryJson = await AsyncStorage.getItem(LEGACY_BASIC_GAME_STORAGE_KEY);
  if (basicGameEntryJson === null) return null;

  const basicGameEntry: LegacyBasicGameEntry = JSON.parse(basicGameEntryJson);
  const { currentTeam, savedTeams } = basicGameEntry.state;
  if (!currentTeam) return null;

  const seededTeamEntry = JSON.stringify({
    state: seedTeamStateFromLegacyBasicGame({ currentTeam, savedTeams }),
    version: TEAM_STORAGE_VERSION,
  });
  try {
    await AsyncStorage.setItem(TEAM_STORAGE_KEY, seededTeamEntry);
  } catch (error) {
    // Still hydrate from the seed: falling back to an empty default team would let the first edit
    // overwrite this entry and hide the user's teams. The next team change writes the seeded state.
    reportError('team-store-seed', error);
  }
  return seededTeamEntry;
}

// An update from 2.6.x has no team entry yet. The storage read itself seeds it from the basic game
// entry, so the store never hydrates to defaults while the user's teams sit in the old place.
const teamStorage: StateStorage = {
  getItem: async (name) => (await AsyncStorage.getItem(name)) ?? (await readSeededTeamEntry()),
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};

// The shared team list and rosters. Knows nothing about games, lines, or presets; callers that need
// those side effects coordinate them.
export const useTeamStore = create<TeamState>()(
  immer(
    persist(
      (set, get) => {
        const defaultTeam: SavedTeam = { id: generateId(), name: 'Team 1', roster: [] };

        return {
          teams: [defaultTeam],
          currentTeamId: defaultTeam.id,

          addPlayer: (name) => {
            const trimmedName = name.trim();
            if (!trimmedName) return null;
            const lowerName = trimmedName.toLowerCase();
            const isDuplicateName = selectCurrentTeam(get()).roster.some(
              (p) => p.name.toLowerCase() === lowerName,
            );
            if (isDuplicateName) return null;

            const newId = generateId();
            set((state) => {
              selectCurrentTeam(state).roster.push({
                id: newId,
                name: trimmedName,
                isActive: true,
                matchingType: null,
                role: null,
              });
            });
            return newId;
          },

          updateRosterPlayer: (playerId, updates) => {
            let editResult: RosterPlayerEditResult = 'not-found';

            const storageWrite = set((state) => {
              const player = selectCurrentTeam(state).roster.find((p) => p.id === playerId);
              if (!player) return;

              editResult = 'updated';

              if (updates.name !== undefined) {
                player.name = updates.name;
              }
              if (updates.isActive !== undefined) {
                player.isActive = updates.isActive;
              }
              if (updates.matchingType !== undefined) {
                player.matchingType = updates.matchingType;
              }
              if (updates.number !== undefined) {
                player.number = updates.number || undefined;
              }
              if (updates.role !== undefined) {
                player.role = updates.role;
              }
            });

            return { result: editResult, persisted: untilWritten(storageWrite) };
          },

          clearRoster: () =>
            set((state) => {
              selectCurrentTeam(state).roster = [];
            }),

          setCurrentTeam: async (team) => {
            await set((state) => {
              upsertTeam(state.teams, team);
              state.currentTeamId = team.id;
            });
          },

          importTeam: async (team) => {
            await set((state) => {
              upsertTeam(state.teams, team);
            });
          },

          switchTeam: async (teamId) => {
            const isKnownTeam = get().teams.some((team) => team.id === teamId);
            if (!isKnownTeam) throw new Error(`Cannot switch to unknown team "${teamId}".`);

            await set({ currentTeamId: teamId });
          },

          deleteTeam: async (teamId) => {
            if (teamId === get().currentTeamId) {
              throw new Error('Cannot delete the current team.');
            }

            await set((state) => {
              state.teams = state.teams.filter((team) => team.id !== teamId);
            });
          },
        };
      },
      {
        name: TEAM_STORAGE_KEY,
        version: TEAM_STORAGE_VERSION,
        storage: createJSONStorage(() => teamStorage),
        partialize: (state): PersistedTeamState => ({
          teams: state.teams,
          currentTeamId: state.currentTeamId,
        }),
        onRehydrateStorage: () => (_state, error) => reportHydrationError('team', error),
      },
    ),
  ),
);

export function useCurrentTeam(): SavedTeam {
  return useTeamStore(selectCurrentTeam);
}

export function getCurrentTeam(): SavedTeam {
  return selectCurrentTeam(useTeamStore.getState());
}
