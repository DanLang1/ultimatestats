import type { GameMetadata } from '@/lib/advancedTracking/types';
import { serializeAdvancedGame, serializeAdvancedGames } from '@/lib/sharing/serialize';
import { validatePayload } from '@/lib/sharing/validate';
import {
  ADVANCED_TEST_OPPONENT_SIDE_ID,
  ADVANCED_TEST_TIMESTAMP,
  createAdvancedGameFixture,
  createAdvancedGameScenario,
  participantRef,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';

function makeAdvancedGame(id: string, metadata?: GameMetadata) {
  return createAdvancedGameFixture({
    id,
    schemaVersion: 2,
    createdAt: 1,
    updatedAt: 2,
    gameType: 'game',
    status: 'final',
    focusSideId: 'home',
    initialReceivingSideId: 'home',
    metadata,
    settings: { locationMode: 'none' },
    sides: [
      { id: 'home', label: 'Home', trackingMode: 'full-roster' },
      { id: 'away', label: 'Away', trackingMode: 'anonymous' },
    ],
    participants: [],
    points: [{ id: 'point-1', lines: [], possessions: [], note: 'private point note' }],
  });
}

describe('advanced game sharing serialization', () => {
  it('round-trips a terminated game through sharing validation', () => {
    const game = {
      ...makeAdvancedGame('game-1'),
      status: 'terminated',
      endReason: 'manual',
    } as const;

    const payload = validatePayload(serializeAdvancedGame(game));

    expect(payload.type).toBe('advanced-game');
    if (payload.type !== 'advanced-game') throw new Error('Expected an advanced-game payload.');
    expect(payload.data).toMatchObject({ status: 'terminated', endReason: 'manual' });
  });

  it('round-trips anonymous Red Zone scaffold metadata', () => {
    const redZoneEnteredAt = ADVANCED_TEST_TIMESTAMP + 1_000;
    const game = createAdvancedGameScenario({
      id: 'game-red-zone',
      status: 'final',
    })
      .startPoint({
        puller: UNTRACKED_PLAYER,
        receiver: participantRef('alex'),
        startedAt: ADVANCED_TEST_TIMESTAMP,
        recordedAt: ADVANCED_TEST_TIMESTAMP,
      })
      .turnover('throwaway', { recordedAt: ADVANCED_TEST_TIMESTAMP + 500 })
      .startPossession(ADVANCED_TEST_OPPONENT_SIDE_ID)
      .pickup(UNTRACKED_PLAYER, { recordedAt: redZoneEnteredAt })
      .goal(undefined, { recordedAt: ADVANCED_TEST_TIMESTAMP + 2_000 })
      .build();
    game.points[0].possessions[1].redZone = {
      enteredAt: redZoneEnteredAt,
      anonymousScaffold: true,
    };
    game.points[0].revivalPauses = [
      {
        pausedAt: ADVANCED_TEST_TIMESTAMP + 250,
        resumedAt: ADVANCED_TEST_TIMESTAMP + 500,
      },
    ];

    const payload = validatePayload(serializeAdvancedGame(game));

    expect(payload.type).toBe('advanced-game');
    if (payload.type !== 'advanced-game') throw new Error('Expected an advanced-game payload.');
    expect(payload.data.points[0].possessions[1].redZone).toEqual({
      enteredAt: redZoneEnteredAt,
      anonymousScaffold: true,
    });
    expect(payload.data.points[0].revivalPauses).toEqual(game.points[0].revivalPauses);
  });

  it('omits a private note from a single-game payload without mutating the game', () => {
    const game = makeAdvancedGame('game-1', {
      title: 'Final',
      notes: 'Private coaching observations',
    });

    const payload = serializeAdvancedGame(game);

    expect(payload.type).toBe('advanced-game');
    if (payload.type !== 'advanced-game') throw new Error('Expected an advanced-game payload.');
    expect(payload.data.metadata).toEqual({ title: 'Final' });
    expect(payload.data.points[0]).not.toHaveProperty('note');
    expect(game.metadata?.notes).toBe('Private coaching observations');
  });

  it('omits private notes from every game in a bulk payload', () => {
    const games = [
      makeAdvancedGame('game-1', { notes: 'First private note' }),
      makeAdvancedGame('game-2', { opponentName: 'Rivals', notes: 'Second private note' }),
    ];

    const payload = serializeAdvancedGames(games);

    expect(payload.type).toBe('advanced-games');
    if (payload.type !== 'advanced-games') throw new Error('Expected an advanced-games payload.');
    expect(payload.data[0].metadata).toBeUndefined();
    expect(payload.data[1].metadata).toEqual({ opponentName: 'Rivals' });
  });

  it('omits an undefined note key from shared metadata', () => {
    const game = makeAdvancedGame('game-1', { title: 'Final', notes: undefined });

    const payload = serializeAdvancedGame(game);

    expect(payload.type).toBe('advanced-game');
    if (payload.type !== 'advanced-game') throw new Error('Expected an advanced-game payload.');
    expect(payload.data.metadata).toEqual({ title: 'Final' });
    expect(payload.data.metadata).not.toHaveProperty('notes');
  });
});
