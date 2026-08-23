import type { AdvancedTrackedGame, Participant } from '@/lib/advancedTracking/types';
import type { Player } from '@/lib/storage/types';

export function getParticipantName(game: AdvancedTrackedGame, participantId: string): string {
  const participant = game.participants.find((candidate) => candidate.id === participantId);
  if (participant == null) {
    throw new Error(
      `Unknown participantId "${participantId}" for advanced tracking game "${game.id}".`,
    );
  }
  return participant.name;
}

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
