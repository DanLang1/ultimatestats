import { Player } from '@/lib/storage/types';

import { getPointActionParticipantIds } from './trackingUtils';
import { AdvancedTrackedGame, Participant } from './types';

export interface RosterParticipantSyncPlan {
  participantsToAdd: Participant[];
  unavailableParticipantIds: Set<string>;
}

function getSourcePlayerId(participant: Participant): string {
  return participant.sourcePlayerId ?? participant.id;
}

export function buildParticipantFromRosterPlayer(player: Player): Participant {
  return {
    id: player.id,
    name: player.name,
    number: player.number,
    sourcePlayerId: player.id,
    matchingType: player.matchingType,
    role: player.role,
  };
}

/**
 * Participants whose roster player is currently inactive. Participants without
 * a matching roster player (deleted players, imported participants) stay available.
 */
export function getUnavailableRosterParticipantIds(
  participants: Participant[],
  roster: Player[],
): Set<string> {
  const rosterById = new Map(roster.map((player) => [player.id, player]));
  const unavailableParticipantIds = new Set<string>();

  for (const participant of participants) {
    const rosterPlayer = rosterById.get(getSourcePlayerId(participant));
    if (rosterPlayer != null && !rosterPlayer.isActive) {
      unavailableParticipantIds.add(participant.id);
    }
  }

  return unavailableParticipantIds;
}

export function deriveRosterParticipantSyncPlan(
  game: AdvancedTrackedGame,
  team: { id: string; roster: Player[] },
): RosterParticipantSyncPlan | null {
  if (game.status !== 'in_progress') return null;
  if (!game.sides.some((side) => side.sourceTeamId === team.id)) return null;

  const representedPlayerIds = new Set(game.participants.map(getSourcePlayerId));
  const participantsToAdd = team.roster
    .filter((player) => player.isActive && !representedPlayerIds.has(player.id))
    .map(buildParticipantFromRosterPlayer);

  const unavailableParticipantIds = getUnavailableRosterParticipantIds(
    game.participants,
    team.roster,
  );

  if (participantsToAdd.length === 0 && unavailableParticipantIds.size === 0) return null;

  return { participantsToAdd, unavailableParticipantIds };
}

export function hasPlayerRecordedAdvancedActions(
  game: AdvancedTrackedGame,
  playerId: string,
): boolean {
  const participantIds = new Set(
    game.participants
      .filter((participant) => getSourcePlayerId(participant) === playerId)
      .map((participant) => participant.id),
  );
  if (participantIds.size === 0) return false;

  return game.points.some((point) =>
    getPointActionParticipantIds(point).some((participantId) => participantIds.has(participantId)),
  );
}
