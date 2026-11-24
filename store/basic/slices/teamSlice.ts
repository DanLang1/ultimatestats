import { hasPlayerRecordedAdvancedActions } from '@/lib/advancedTracking/participantSync';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { hasPlayerParticipatedInCurrentGame } from '@/lib/playerUtils';
import { SavedTeam } from '@/lib/storage';
import { generateId } from '@/lib/utils';

import { useLinePresetsStore } from '../../linePresetsStore';
import {
  GameSliceCreator,
  GameState,
  TeamSlice,
  UpdateRosterPlayerResult,
} from '../gameStore.types';

type ActiveAdvancedGameGetter = () => AdvancedTrackedGame | null;
type GameParticipationState = Pick<GameState, 'events' | 'pointLines'>;

let getActiveAdvancedGame: ActiveAdvancedGameGetter | null = null;

export function registerActiveAdvancedGameGetter(getter: ActiveAdvancedGameGetter) {
  getActiveAdvancedGame = getter;
}

function hasRecordedAdvancedActions(playerId: string): boolean {
  const advancedGame = getActiveAdvancedGame?.();
  return advancedGame != null && hasPlayerRecordedAdvancedActions(advancedGame, playerId);
}

export function hasPlayerRecordedActionsInActiveAdvancedGame(playerId: string): boolean {
  return hasRecordedAdvancedActions(playerId);
}

function hasPlayerParticipatedInGameState(
  playerId: string,
  state: GameParticipationState,
): boolean {
  return (
    hasPlayerParticipatedInCurrentGame(playerId, state.events, state.pointLines) ||
    hasRecordedAdvancedActions(playerId)
  );
}

export const createTeamSlice: GameSliceCreator<TeamSlice> = (set, get) => ({
  // Default to Team 1 so addPlayer always has a team to work with
  currentTeam: { id: generateId(), name: 'Team 1', roster: [] },
  savedTeams: [],

  setCurrentTeam: (team: SavedTeam) =>
    set((state: GameState) => {
      state.currentTeam = team;
    }),

  addPlayer: (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;
    const state = get();
    const lowerName = trimmedName.toLowerCase();
    if (state.currentTeam.roster.some((p) => p.name.toLowerCase() === lowerName)) return null;
    const newId = generateId();
    set((s: GameState) => {
      s.currentTeam.roster.push({
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
    let updateResult: UpdateRosterPlayerResult = 'not-found';
    let becameInactive = false;

    set((state: GameState) => {
      const player = state.currentTeam.roster.find((p) => p.id === playerId);
      if (!player) return;

      if (
        updates.isActive === false &&
        player.isActive !== false &&
        hasPlayerParticipatedInGameState(playerId, state)
      ) {
        updateResult = 'blocked-current-game-participation';
        return;
      }

      updateResult = 'updated';
      const wasActive = player.isActive;

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

      becameInactive = wasActive && player.isActive === false;
    });

    if (becameInactive) {
      useLinePresetsStore.getState().removePlayerFromPresets(playerId);
    }

    return updateResult;
  },

  clearRoster: () =>
    set((state: GameState) => {
      if (!state.currentTeam) return;
      const teamId = state.currentTeam.id;
      state.currentTeam.roster = [];
      state.events = [];

      // Side effect: clear presets for this team as roster is gone
      useLinePresetsStore.getState().clearPresetsForTeam(teamId);
    }),

  saveCurrentTeam: async (teamOverride?: SavedTeam) => {
    const state = get();
    const team = teamOverride ?? state.currentTeam;

    await set((draft: GameState) => {
      const idx = draft.savedTeams.findIndex((t) => t.id === team.id);
      if (idx >= 0) {
        draft.savedTeams[idx] = team;
      } else {
        draft.savedTeams.push(team);
      }
    });
  },

  importTeam: async (team: SavedTeam) => {
    await set((state: GameState) => {
      const idx = state.savedTeams.findIndex((t) => t.id === team.id);
      if (idx >= 0) {
        state.savedTeams[idx] = team;
      } else {
        state.savedTeams.push(team);
      }
      // Also update currentTeam if it's the same team (deep copy like loadTeam)
      if (state.currentTeam.id === team.id) {
        state.currentTeam = {
          id: team.id,
          name: team.name,
          roster: team.roster.map((p) => ({ ...p })),
        };
      }
    });
  },

  deleteTeam: async (id: string) => {
    await set((state: GameState) => {
      state.savedTeams = state.savedTeams.filter((t) => t.id !== id);
    });
  },

  loadTeam: async (teamId: string) => {
    const team = get().savedTeams.find((t) => t.id === teamId);
    if (!team) return;
    await set((state: GameState) => {
      // Deep copy to avoid mutating savedTeams
      state.currentTeam = {
        id: team.id,
        name: team.name,
        roster: team.roster.map((p) => ({ ...p })),
      };
    });
  },
});
