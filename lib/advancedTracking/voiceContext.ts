import { VoiceParticipantContext } from '@/lib/advancedTracking/voiceCommandParser';
import { Participant } from '@/lib/advancedTracking/types';
import { Player } from '@/lib/storage/types';

/**
 * Builds voice-participant contexts from advanced game participants.
 *
 * Roster numbers should already be merged into the participants via
 * `mergeRosterNumbersIntoParticipants` before calling this function.
 */
export function buildVoiceParticipantContexts(
  activeParticipants: Participant[],
): VoiceParticipantContext[] {
  return activeParticipants.map((participant) => ({
    id: participant.id,
    name: participant.name,
    number: participant.number,
  }));
}

export function mergeRosterNumbersIntoParticipants(
  participants: Participant[],
  roster: Player[],
): Participant[] {
  const rosterByPlayerId = new Map(roster.map((player) => [player.id, player]));

  return participants.map((participant) => {
    const sourcePlayerId = participant.sourcePlayerId ?? participant.id;
    const rosterPlayer = rosterByPlayerId.get(sourcePlayerId);

    return {
      ...participant,
      number: rosterPlayer?.number ?? participant.number,
    };
  });
}
