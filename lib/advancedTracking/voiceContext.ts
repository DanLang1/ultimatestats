import { VoiceParticipantContext } from '@/lib/advancedTracking/voiceCommandParser';
import { Participant } from '@/lib/advancedTracking/types';
import { Player } from '@/lib/storage/types';

/**
 * Bridges advanced game participants to saved roster profile metadata.
 *
 * Advanced `Participant`s remain the source of truth for game attribution and display. Saved
 * roster `Player`s currently live in the basic game store, but voice aliases are durable player
 * profile data that should carry across games. Keep that merge isolated here so the tracker does
 * not grow a second implicit player source.
 *
 * TODO: Move saved teams/rosters out of the basic game store into a shared roster/team store, then
 * feed this helper from that store instead of `gameStore.currentTeam`.
 */
export function buildVoiceParticipantContexts(
  activeParticipants: Participant[],
  roster: Player[],
): VoiceParticipantContext[] {
  const rosterByPlayerId = new Map(roster.map((player) => [player.id, player]));

  return activeParticipants.map((participant) => {
    const sourcePlayerId = participant.sourcePlayerId ?? participant.id;
    const rosterPlayer = rosterByPlayerId.get(sourcePlayerId);

    return {
      id: participant.id,
      name: participant.name,
      voiceAliases: rosterPlayer?.voiceAliases ?? [],
    };
  });
}
