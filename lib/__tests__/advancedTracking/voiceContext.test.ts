import { buildVoiceParticipantContexts } from '@/lib/advancedTracking/voiceContext';
import { Participant } from '@/lib/advancedTracking/types';
import { Player } from '@/lib/storage/types';

const roster: Player[] = [
  {
    id: 'saved-james',
    name: 'James Donovan',
    isActive: true,
    matchingType: null,
    role: null,
    voiceAliases: ['JD'],
  },
  {
    id: 'saved-anne',
    name: 'Anne',
    isActive: true,
    matchingType: null,
    role: null,
  },
];

describe('buildVoiceParticipantContexts', () => {
  it('uses participant identity and saved roster voice aliases', () => {
    const participants: Participant[] = [
      {
        id: 'game-james',
        name: 'James',
        sourcePlayerId: 'saved-james',
      },
    ];

    expect(buildVoiceParticipantContexts(participants, roster)).toEqual([
      {
        id: 'game-james',
        name: 'James',
        voiceAliases: ['JD'],
      },
    ]);
  });

  it('falls back to empty aliases when no roster profile matches', () => {
    const participants: Participant[] = [
      {
        id: 'guest-player',
        name: 'Guest',
      },
    ];

    expect(buildVoiceParticipantContexts(participants, roster)).toEqual([
      {
        id: 'guest-player',
        name: 'Guest',
        voiceAliases: [],
      },
    ]);
  });
});
