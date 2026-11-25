import { hasPlayerRecordedAdvancedActions } from '@/lib/advancedTracking/participantSync';
import { getLiveInProgressGame } from '@/lib/advancedTracking/trackingUtils';
import { hasPlayerParticipatedInCurrentGame } from '@/lib/playerUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { getCurrentTeam, useTeamStore } from '@/store/teamStore';
import {
  RosterPlayerEdit,
  RosterPlayerEditResult,
  RosterPlayerUpdates,
} from '@/store/teamStore.types';

export type UpdateRosterPlayerResult =
  | RosterPlayerEditResult
  | 'blocked-current-game-participation';

export function hasPlayerRecordedActionsInActiveAdvancedGame(playerId: string): boolean {
  const advancedGame = getLiveInProgressGame(useAdvancedTrackingStore.getState());
  return advancedGame != null && hasPlayerRecordedAdvancedActions(advancedGame, playerId);
}

export function updateRosterPlayer(
  playerId: string,
  updates: RosterPlayerUpdates,
): RosterPlayerEdit<UpdateRosterPlayerResult> {
  const player = getCurrentTeam().roster.find((p) => p.id === playerId);
  if (!player) return { result: 'not-found', persisted: Promise.resolve() };

  // A roster saved before the active flag existed has players with no `isActive`: they count as
  // active for the participation block, and their presets are left alone.
  const isDeactivating = updates.isActive === false && player.isActive !== false;
  const wasExplicitlyActive = player.isActive === true;
  if (isDeactivating) {
    const gameState = useGameStore.getState();
    const hasParticipatedInCurrentGame =
      hasPlayerParticipatedInCurrentGame(playerId, gameState.events, gameState.pointLines) ||
      hasPlayerRecordedActionsInActiveAdvancedGame(playerId);
    if (hasParticipatedInCurrentGame) {
      return { result: 'blocked-current-game-participation', persisted: Promise.resolve() };
    }
  }

  const rosterPlayerEdit = useTeamStore.getState().updateRosterPlayer(playerId, updates);
  if (isDeactivating && wasExplicitlyActive) {
    useLinePresetsStore.getState().removePlayerFromPresets(playerId);
  }
  return rosterPlayerEdit;
}

export function clearRoster(): void {
  useLinePresetsStore.getState().clearPresetsForTeam(getCurrentTeam().id);
  useTeamStore.getState().clearRoster();
  useGameStore.setState({ events: [] });
}
