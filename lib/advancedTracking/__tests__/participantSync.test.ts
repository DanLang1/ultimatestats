import {
  deriveRosterParticipantSyncPlan,
  getUnavailableRosterParticipantIds,
  hasPlayerRecordedAdvancedActions,
} from '@/lib/advancedTracking/participantSync';
import { AdvancedTrackedGame, Participant, TrackedPoint } from '@/lib/advancedTracking/types';
import { Player } from '@/lib/storage/types';

function makePlayer(overrides: Partial<Player> & { id: string }): Player {
  return {
    name: `Player ${overrides.id}`,
    isActive: true,
    matchingType: null,
    role: null,
    ...overrides,
  };
}

function makePoint(participantIdsInActions: string[]): TrackedPoint {
  return {
    id: 'point-1',
    lines: [
      { sideId: 'home', participantIds: ['anne', 'bryan', 'casey', 'dee', 'eli', 'fay', 'gus'] },
    ],
    possessions: [
      {
        id: 'possession-1',
        sideId: 'home',
        actions:
          participantIdsInActions.length > 0
            ? [
                {
                  id: 'action-1',
                  kind: 'throw',
                  sideId: 'home',
                  thrower: { refType: 'participant', participantId: participantIdsInActions[0] },
                  toPlayer:
                    participantIdsInActions[1] != null
                      ? { refType: 'participant', participantId: participantIdsInActions[1] }
                      : undefined,
                  result: 'complete',
                },
              ]
            : [],
      },
    ],
  };
}

function makeGame(
  overrides: Partial<AdvancedTrackedGame> & { participants: Participant[] },
): AdvancedTrackedGame {
  return {
    id: 'game-1',
    schemaVersion: 2,
    createdAt: 1,
    updatedAt: 1,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: 'home',
    initialReceivingSideId: 'home',
    settings: { locationMode: 'none' },
    sides: [
      { id: 'home', label: 'Home', sourceTeamId: 'team-1', trackingMode: 'full-roster' },
      { id: 'away', label: 'Away', trackingMode: 'anonymous' },
    ],
    points: [],
    ...overrides,
  };
}

describe('deriveRosterParticipantSyncPlan', () => {
  it('plans a participant for a new active roster player', () => {
    const game = makeGame({ participants: [{ id: 'anne', name: 'Anne', sourcePlayerId: 'anne' }] });

    const plan = deriveRosterParticipantSyncPlan(game, {
      id: 'team-1',
      roster: [
        makePlayer({ id: 'anne', name: 'Anne' }),
        makePlayer({
          id: 'newbie',
          name: 'Newbie',
          number: '9',
          matchingType: 'fmp',
          role: 'handler',
        }),
      ],
    });

    expect(plan?.participantsToAdd).toEqual([
      {
        id: 'newbie',
        name: 'Newbie',
        number: '9',
        sourcePlayerId: 'newbie',
        matchingType: 'fmp',
        role: 'handler',
      },
    ]);
  });

  it('plans a participant when a previously inactive roster player is reactivated', () => {
    const game = makeGame({ participants: [{ id: 'anne', name: 'Anne', sourcePlayerId: 'anne' }] });

    const plan = deriveRosterParticipantSyncPlan(game, {
      id: 'team-1',
      roster: [
        makePlayer({ id: 'anne', name: 'Anne' }),
        makePlayer({ id: 'late-arrival', name: 'Late', isActive: true }),
      ],
    });

    expect(plan?.participantsToAdd.map((participant) => participant.id)).toEqual(['late-arrival']);
  });

  it('does not plan a participant for an inactive roster player', () => {
    const game = makeGame({ participants: [{ id: 'anne', name: 'Anne', sourcePlayerId: 'anne' }] });

    const plan = deriveRosterParticipantSyncPlan(game, {
      id: 'team-1',
      roster: [
        makePlayer({ id: 'anne', name: 'Anne' }),
        makePlayer({ id: 'bench', isActive: false }),
      ],
    });

    expect(plan).toBeNull();
  });

  it('skips roster players already represented by a participant id fallback', () => {
    const game = makeGame({ participants: [{ id: 'anne', name: 'Anne' }] });

    const plan = deriveRosterParticipantSyncPlan(game, {
      id: 'team-1',
      roster: [makePlayer({ id: 'anne', name: 'Anne Updated' })],
    });

    expect(plan).toBeNull();
  });

  it('marks a participant unavailable when their roster player is deactivated', () => {
    const game = makeGame({
      participants: [
        { id: 'anne', name: 'Anne', sourcePlayerId: 'anne' },
        { id: 'bea', name: 'Bea', sourcePlayerId: 'bea' },
      ],
    });

    const plan = deriveRosterParticipantSyncPlan(game, {
      id: 'team-1',
      roster: [
        makePlayer({ id: 'anne', name: 'Anne' }),
        makePlayer({ id: 'bea', name: 'Bea', isActive: false }),
      ],
    });

    expect(plan?.participantsToAdd).toEqual([]);
    expect(plan?.unavailableParticipantIds).toEqual(new Set(['bea']));
  });

  it('returns null when nothing changed', () => {
    const game = makeGame({ participants: [{ id: 'anne', name: 'Anne', sourcePlayerId: 'anne' }] });

    expect(
      deriveRosterParticipantSyncPlan(game, {
        id: 'team-1',
        roster: [makePlayer({ id: 'anne', name: 'Anne' })],
      }),
    ).toBeNull();
  });

  it('ignores games that are not in progress', () => {
    const game = makeGame({
      status: 'final',
      participants: [{ id: 'anne', name: 'Anne', sourcePlayerId: 'anne' }],
    });

    expect(
      deriveRosterParticipantSyncPlan(game, {
        id: 'team-1',
        roster: [makePlayer({ id: 'anne' }), makePlayer({ id: 'newbie' })],
      }),
    ).toBeNull();
  });

  it('ignores games whose sides do not link to the roster team', () => {
    const game = makeGame({ participants: [] });

    expect(
      deriveRosterParticipantSyncPlan(game, {
        id: 'other-team',
        roster: [makePlayer({ id: 'newbie' })],
      }),
    ).toBeNull();
  });
});

describe('getUnavailableRosterParticipantIds', () => {
  it('keeps participants without a matching roster player available', () => {
    const unavailable = getUnavailableRosterParticipantIds(
      [
        { id: 'deleted', name: 'Deleted', sourcePlayerId: 'deleted' },
        { id: 'imported', name: 'Imported' },
      ],
      [makePlayer({ id: 'anne' })],
    );

    expect(unavailable.size).toBe(0);
  });
});

describe('hasPlayerRecordedAdvancedActions', () => {
  it('detects actions through the sourcePlayerId link', () => {
    const game = makeGame({
      participants: [{ id: 'p-anne', name: 'Anne', sourcePlayerId: 'anne' }],
      points: [makePoint(['p-anne'])],
    });

    expect(hasPlayerRecordedAdvancedActions(game, 'anne')).toBe(true);
  });

  it('detects actions via participant id when sourcePlayerId is null', () => {
    const game = makeGame({
      participants: [{ id: 'anne', name: 'Anne' }],
      points: [makePoint(['anne'])],
    });

    expect(hasPlayerRecordedAdvancedActions(game, 'anne')).toBe(true);
  });

  it('is false for a player with no recorded actions even when on a line', () => {
    const game = makeGame({
      participants: [{ id: 'anne', name: 'Anne', sourcePlayerId: 'anne' }],
      points: [makePoint([])],
    });

    expect(hasPlayerRecordedAdvancedActions(game, 'anne')).toBe(false);
  });

  it('is false for a player with no participant in the game', () => {
    const game = makeGame({
      participants: [{ id: 'anne', name: 'Anne', sourcePlayerId: 'anne' }],
      points: [makePoint(['anne'])],
    });

    expect(hasPlayerRecordedAdvancedActions(game, 'stranger')).toBe(false);
  });
});
