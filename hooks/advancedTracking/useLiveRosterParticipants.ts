import { getUnavailableRosterParticipantIds } from '@/lib/advancedTracking/participantSync';
import { mergeRosterMetadataIntoParticipants } from '@/lib/advancedTracking/participantUtils';
import { Participant } from '@/lib/advancedTracking/types';
import { useGameStore } from '@/store/basic/gameStore';

export function useLiveRosterParticipants(participants: Participant[]): Participant[] {
  const currentTeam = useGameStore((s) => s.currentTeam);

  const merged = mergeRosterMetadataIntoParticipants(participants, currentTeam.roster);
  const unavailableParticipantIds = getUnavailableRosterParticipantIds(
    participants,
    currentTeam.roster,
  );

  if (unavailableParticipantIds.size === 0) return merged;

  return merged.filter((participant) => !unavailableParticipantIds.has(participant.id));
}
