import { getUnavailableRosterParticipantIds } from '@/lib/advancedTracking/participantSync';
import { mergeRosterMetadataIntoParticipants } from '@/lib/advancedTracking/participantUtils';
import { Participant } from '@/lib/advancedTracking/types';
import { useCurrentTeam } from '@/store/teamStore';

export function useLiveRosterParticipants(participants: Participant[]): Participant[] {
  const currentTeam = useCurrentTeam();

  const merged = mergeRosterMetadataIntoParticipants(participants, currentTeam.roster);
  const unavailableParticipantIds = getUnavailableRosterParticipantIds(
    participants,
    currentTeam.roster,
  );

  if (unavailableParticipantIds.size === 0) return merged;

  return merged.filter((participant) => !unavailableParticipantIds.has(participant.id));
}
