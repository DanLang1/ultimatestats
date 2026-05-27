import { Participant } from '@/lib/advancedTracking/types';
import { mergeRosterMetadataIntoParticipants } from '@/lib/advancedTracking/participantUtils';
import { useGameStore } from '@/store/gameStore';

export function useLiveRosterParticipants(participants: Participant[]): Participant[] {
  const currentTeam = useGameStore((s) => s.currentTeam);

  return mergeRosterMetadataIntoParticipants(participants, currentTeam?.roster ?? []);
}
