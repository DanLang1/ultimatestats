import { mergeRosterMetadataIntoParticipants } from '@/lib/advancedTracking/participantUtils';
import { Participant } from '@/lib/advancedTracking/types';
import { useGameStore } from '@/store/basic/gameStore';

export function useLiveRosterParticipants(participants: Participant[]): Participant[] {
  const currentTeam = useGameStore((s) => s.currentTeam);

  return mergeRosterMetadataIntoParticipants(participants, currentTeam.roster);
}
