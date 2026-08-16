import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import {
  getCurrentPendingNextPointLineSelection,
  resolvePendingNextPointLines,
} from '@/store/advancedTracking/pendingLineSelection';
import type { PendingNextPointLineSelection } from '@/store/advancedTracking/trackingStore.types';

function makeGame(trackingModes: ['full-roster', 'anonymous'] | ['full-roster', 'full-roster']) {
  const participants = Array.from(
    { length: trackingModes[1] === 'full-roster' ? 14 : 7 },
    (_, index) => ({ id: `player-${index + 1}`, name: `Player ${index + 1}` }),
  );
  const game: AdvancedTrackedGame = {
    id: 'pending-line-game',
    schemaVersion: 2,
    createdAt: 0,
    updatedAt: 0,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: 'home',
    initialReceivingSideId: 'home',
    settings: { locationMode: 'none' },
    sides: trackingModes.map((trackingMode, index) => ({
      id: index === 0 ? 'home' : 'away',
      label: index === 0 ? 'Home' : 'Away',
      trackingMode,
    })),
    participants,
    points: [],
  };
  return game;
}

function selection(
  game: AdvancedTrackedGame,
  participantIdsBySide: Record<string, string[]>,
  afterPointId: string | null = null,
): PendingNextPointLineSelection {
  return { gameId: game.id, afterPointId, participantIdsBySide };
}

describe('pending line selection resolution', () => {
  it('accepts a current partial draft but does not resolve it as ready', () => {
    const game = makeGame(['full-roster', 'anonymous']);
    const draft = selection(game, { home: ['player-1'] });

    expect(getCurrentPendingNextPointLineSelection(game, draft)).toBe(draft);
    expect(resolvePendingNextPointLines(game, draft)).toBeNull();
  });

  it('rejects stale game and point contexts', () => {
    const game = makeGame(['full-roster', 'anonymous']);
    const draft = selection(game, { home: [] });

    expect(
      getCurrentPendingNextPointLineSelection(game, { ...draft, gameId: 'other-game' }),
    ).toBeNull();
    expect(
      getCurrentPendingNextPointLineSelection(game, { ...draft, afterPointId: 'completed-point' }),
    ).toBeNull();
  });

  it('accepts a draft after a completed point and rejects one while that point is in progress', () => {
    const game = makeGame(['full-roster', 'anonymous']);
    game.points.push({ id: 'point-1', lines: [], possessions: [] });
    const draft = selection(game, { home: [] }, 'point-1');

    expect(getCurrentPendingNextPointLineSelection(game, draft)).toBeNull();

    game.points[0].possessions.push({
      id: 'possession-1',
      sideId: 'home',
      actions: [
        {
          id: 'goal-1',
          kind: 'throw',
          sideId: 'home',
          thrower: { refType: 'participant', participantId: 'player-1' },
          toPlayer: { refType: 'participant', participantId: 'player-2' },
          result: 'goal',
        },
      ],
    });

    expect(getCurrentPendingNextPointLineSelection(game, draft)).toBe(draft);
  });

  it('resolves a ready single-team line in game side order and keeps anonymous empty', () => {
    const game = makeGame(['full-roster', 'anonymous']);
    const lineIds = game.participants.map((participant) => participant.id);
    const draft = selection(game, { home: lineIds, away: [] });

    expect(resolvePendingNextPointLines(game, draft)).toEqual([
      { sideId: 'home', participantIds: lineIds },
      { sideId: 'away', participantIds: [] },
    ]);
  });

  it('resolves both tracked sides in game side order', () => {
    const game = makeGame(['full-roster', 'full-roster']);
    const draft = selection(game, {
      away: game.participants.slice(7).map((participant) => participant.id),
      home: game.participants.slice(0, 7).map((participant) => participant.id),
    });

    expect(resolvePendingNextPointLines(game, draft)?.map((line) => line.sideId)).toEqual([
      'home',
      'away',
    ]);
  });

  it.each([
    ['incomplete', { home: ['player-1'], away: [] }],
    [
      'unknown participant',
      { home: [...Array.from({ length: 6 }, (_, i) => `player-${i + 1}`), 'unknown'], away: [] },
    ],
    [
      'duplicate within side',
      { home: [...Array.from({ length: 6 }, (_, i) => `player-${i + 1}`), 'player-1'], away: [] },
    ],
    [
      'anonymous side not empty',
      { home: Array.from({ length: 7 }, (_, i) => `player-${i + 1}`), away: ['player-1'] },
    ],
  ])('rejects %s line drafts', (_label, participantIdsBySide) => {
    const game = makeGame(['full-roster', 'anonymous']);
    expect(resolvePendingNextPointLines(game, selection(game, participantIdsBySide))).toBeNull();
  });

  it('rejects a participant selected on both tracked sides', () => {
    const game = makeGame(['full-roster', 'full-roster']);
    const homeIds = game.participants.slice(0, 7).map((participant) => participant.id);
    const awayIds = game.participants.slice(7).map((participant) => participant.id);
    awayIds[0] = homeIds[0];

    expect(
      resolvePendingNextPointLines(game, selection(game, { home: homeIds, away: awayIds })),
    ).toBeNull();
  });
});
