import { mergeRosterMetadataIntoParticipants } from '@/lib/advancedTracking/participantUtils';

describe('mergeRosterMetadataIntoParticipants', () => {
  it('merges saved roster metadata into participant snapshots', () => {
    const merged = mergeRosterMetadataIntoParticipants(
      [
        {
          id: 'anne',
          name: 'Anne Wilson',
          sourcePlayerId: 'saved-anne',
          matchingType: 'fmp',
          role: 'handler',
        },
        { id: 'katy', name: 'Katy Morris', number: '8' },
      ],
      [
        {
          id: 'saved-anne',
          name: 'Anne Weaver',
          number: '12',
          isActive: true,
          matchingType: 'mmp',
          role: 'hybrid',
        },
      ],
    );

    expect(merged.map((participant) => participant.number)).toEqual(['12', '8']);
    expect(merged[0]).toMatchObject({
      name: 'Anne Weaver',
      matchingType: 'mmp',
      role: 'hybrid',
    });
  });

  it('falls back to participant.id when sourcePlayerId is null', () => {
    const merged = mergeRosterMetadataIntoParticipants(
      [{ id: 'p1', name: 'Alice', sourcePlayerId: null }],
      [{ id: 'p1', name: 'Alice Updated', isActive: true, matchingType: 'fmp', role: 'cutter' }],
    );

    expect(merged[0]).toMatchObject({ name: 'Alice Updated' });
  });

  it('falls back to participant.id when sourcePlayerId is undefined', () => {
    const merged = mergeRosterMetadataIntoParticipants(
      [{ id: 'p2', name: 'Bob' }],
      [{ id: 'p2', name: 'Bob Updated', isActive: true, matchingType: 'mmp', role: null }],
    );

    expect(merged[0]).toMatchObject({ name: 'Bob Updated' });
  });

  it('preserves participant data when sourcePlayerId matches nothing in roster', () => {
    const merged = mergeRosterMetadataIntoParticipants(
      [{ id: 'nomatch', name: 'Ghost', number: '99', matchingType: 'fmp', role: 'cutter' }],
      [],
    );

    expect(merged[0]).toMatchObject({
      name: 'Ghost',
      number: '99',
      matchingType: 'fmp',
      role: 'cutter',
    });
  });

  it('preserves participant data when participant.id does not match any roster player', () => {
    const merged = mergeRosterMetadataIntoParticipants(
      [{ id: 'orphan', name: 'Orphan', matchingType: null, role: null }],
      [{ id: 'other', name: 'Other', isActive: true, matchingType: 'mmp', role: 'handler' }],
    );

    expect(merged[0]).toMatchObject({
      name: 'Orphan',
      matchingType: null,
      role: null,
    });
  });

  it('handles mixed participants (some matched, some unmatched)', () => {
    const merged = mergeRosterMetadataIntoParticipants(
      [
        { id: 'a', name: 'Alice', sourcePlayerId: 'a', matchingType: 'fmp', role: 'cutter' },
        { id: 'b', name: 'Bob', sourcePlayerId: null, matchingType: null, role: null },
        { id: 'guest', name: 'Guest', number: '3' },
      ],
      [
        { id: 'a', name: 'Alice Renamed', isActive: true, matchingType: 'fmp', role: 'hybrid' },
        { id: 'b', name: 'Bob Renamed', isActive: true, matchingType: 'mmp', role: 'handler' },
      ],
    );

    expect(merged[0]).toMatchObject({ name: 'Alice Renamed', role: 'hybrid' });
    expect(merged[1]).toMatchObject({ name: 'Bob Renamed', matchingType: 'mmp' });
    expect(merged[2]).toMatchObject({ name: 'Guest', number: '3' });
  });
});
