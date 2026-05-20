import {
  buildVoiceParticipantContexts,
  mergeRosterNumbersIntoParticipants,
} from '@/lib/advancedTracking/voiceContext';
import { Participant } from '@/lib/advancedTracking/types';

describe('buildVoiceParticipantContexts', () => {
  it('maps participant fields to voice context', () => {
    const participants: Participant[] = [
      {
        id: 'game-james',
        name: 'James',
        sourcePlayerId: 'saved-james',
        number: '12',
      },
    ];

    expect(buildVoiceParticipantContexts(participants)).toEqual([
      {
        id: 'game-james',
        name: 'James',
        number: '12',
      },
    ]);
  });

  it('passes through undefined number', () => {
    const participants: Participant[] = [
      {
        id: 'guest-player',
        name: 'Guest',
      },
    ];

    expect(buildVoiceParticipantContexts(participants)).toEqual([
      {
        id: 'guest-player',
        name: 'Guest',
        number: undefined,
      },
    ]);
  });

  it('passes through participant numbers', () => {
    const participants: Participant[] = [
      {
        id: 'guest-player',
        name: 'Guest',
        number: '9',
      },
    ];

    expect(buildVoiceParticipantContexts(participants)).toEqual([
      {
        id: 'guest-player',
        name: 'Guest',
        number: '9',
      },
    ]);
  });
});

describe('mergeRosterNumbersIntoParticipants', () => {
  it('merges saved roster numbers into participant snapshots', () => {
    const merged = mergeRosterNumbersIntoParticipants(
      [
        { id: 'anne', name: 'Anne Wilson', sourcePlayerId: 'saved-anne' },
        { id: 'katy', name: 'Katy Morris', number: '8' },
      ],
      [
        {
          id: 'saved-anne',
          name: 'Anne Wilson',
          number: '12',
          isActive: true,
          matchingType: null,
          role: null,
        },
      ],
    );

    expect(merged.map((participant) => participant.number)).toEqual(['12', '8']);
  });
});
