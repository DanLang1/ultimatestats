import { Participant } from '@/lib/advancedTracking/types';
import { Player } from '@/lib/storage/types';

export function mergeRosterMetadataIntoParticipants(
  participants: Participant[],
  roster: Player[],
): Participant[] {
  const rosterByPlayerId = new Map(roster.map((player) => [player.id, player]));

  return participants.map((participant) => {
    const sourcePlayerId = participant.sourcePlayerId ?? participant.id;
    const rosterPlayer = rosterByPlayerId.get(sourcePlayerId);

    return {
      ...participant,
      name: rosterPlayer?.name ?? participant.name,
      number: rosterPlayer?.number ?? participant.number,
      matchingType: rosterPlayer?.matchingType ?? participant.matchingType,
      role: rosterPlayer?.role ?? participant.role,
    };
  });
}
