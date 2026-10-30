import { Participant } from '@/lib/advancedTracking/types';
import { VoiceParticipantContext } from '@/lib/advancedTracking/voiceCommandParser';

/**
 * Roster metadata should already be merged into the participants before calling this function.
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
