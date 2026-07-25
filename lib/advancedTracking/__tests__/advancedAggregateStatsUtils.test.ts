import { computeFlipStats, computeInitialPullWinStats } from '../advancedAggregateStatsUtils';
import type { AnalyticsGame } from '../analyticsTypes';
import type { GameFlip } from '../types';

const ZOO = 'zoo';
const RIVALS = 'rivals';

function makeGame(input: {
  id: string;
  initialReceivingSideId: string;
  focusScore: number;
  opponentScore: number;
  flip?: GameFlip;
}): AnalyticsGame {
  const scoringSideId = input.focusScore > input.opponentScore ? ZOO : RIVALS;

  return {
    gameType: 'game',
    focusSideId: ZOO,
    oppSideId: RIVALS,
    initialReceivingSideId: input.initialReceivingSideId,
    ...(input.flip != null ? { flip: input.flip } : {}),
    sideLabels: {
      [ZOO]: 'Zoo',
      [RIVALS]: 'Rivals',
    },
    participantNames: new Map(),
    createdAt: 1000,
    points: [
      {
        id: `${input.id}-final-point`,
        pointIndex: 0,
        half: 1,
        receivingSideId: input.initialReceivingSideId,
        pullingSideId: input.initialReceivingSideId === ZOO ? RIVALS : ZOO,
        scoringSideId,
        state: scoringSideId === ZOO ? 'hold' : 'broken',
        linesBySide: {},
        scoresBySide: {
          [ZOO]: input.focusScore - (scoringSideId === ZOO ? 1 : 0),
          [RIVALS]: input.opponentScore - (scoringSideId === RIVALS ? 1 : 0),
        },
        durationMs: null,
        isCleanHold: null,
      },
    ],
    possessions: [],
    actions: [],
    attributions: [],
  };
}

describe('computeInitialPullWinStats', () => {
  it('computes win percentage when the focus side receives first', () => {
    const stats = computeInitialPullWinStats([
      makeGame({ id: 'g1', initialReceivingSideId: ZOO, focusScore: 15, opponentScore: 12 }),
      makeGame({ id: 'g2', initialReceivingSideId: ZOO, focusScore: 10, opponentScore: 11 }),
    ]);

    expect(stats.receivingFirst).toEqual({
      games: 2,
      wins: 1,
      losses: 1,
      winPercentage: 0.5,
    });
    expect(stats.pullingFirst).toEqual({
      games: 0,
      wins: 0,
      losses: 0,
      winPercentage: null,
    });
  });

  it('computes win percentage when the focus side pulls first', () => {
    const stats = computeInitialPullWinStats([
      makeGame({ id: 'g1', initialReceivingSideId: RIVALS, focusScore: 15, opponentScore: 9 }),
      makeGame({ id: 'g2', initialReceivingSideId: RIVALS, focusScore: 13, opponentScore: 15 }),
      makeGame({ id: 'g3', initialReceivingSideId: RIVALS, focusScore: 12, opponentScore: 11 }),
    ]);

    expect(stats.pullingFirst).toEqual({
      games: 3,
      wins: 2,
      losses: 1,
      winPercentage: 2 / 3,
    });
  });

  it('skips tied or scoreless games', () => {
    const stats = computeInitialPullWinStats([
      makeGame({ id: 'g1', initialReceivingSideId: ZOO, focusScore: 0, opponentScore: 0 }),
      makeGame({ id: 'g2', initialReceivingSideId: RIVALS, focusScore: 12, opponentScore: 12 }),
    ]);

    expect(stats.receivingFirst.games).toBe(0);
    expect(stats.pullingFirst.games).toBe(0);
  });
});

describe('computeFlipStats', () => {
  it('computes flip win percentage and game results by the choice made after a win', () => {
    const stats = computeFlipStats([
      makeGame({
        id: 'g1',
        initialReceivingSideId: ZOO,
        focusScore: 15,
        opponentScore: 12,
        flip: { result: 'won', choice: 'offense' },
      }),
      makeGame({
        id: 'g2',
        initialReceivingSideId: ZOO,
        focusScore: 13,
        opponentScore: 15,
        flip: { result: 'won', choice: 'offense' },
      }),
      makeGame({
        id: 'g3',
        initialReceivingSideId: RIVALS,
        focusScore: 15,
        opponentScore: 10,
        flip: { result: 'won', choice: 'side' },
      }),
      makeGame({
        id: 'g4',
        initialReceivingSideId: RIVALS,
        focusScore: 11,
        opponentScore: 13,
        flip: { result: 'won', choice: 'defense' },
      }),
      makeGame({
        id: 'g5',
        initialReceivingSideId: ZOO,
        focusScore: 15,
        opponentScore: 8,
        flip: { result: 'lost' },
      }),
      makeGame({
        id: 'g6',
        initialReceivingSideId: ZOO,
        focusScore: 15,
        opponentScore: 14,
        flip: { result: 'won' },
      }),
      makeGame({
        id: 'g7',
        initialReceivingSideId: RIVALS,
        focusScore: 12,
        opponentScore: 12,
        flip: { result: 'won', choice: 'side' },
      }),
      makeGame({
        id: 'legacy',
        initialReceivingSideId: ZOO,
        focusScore: 15,
        opponentScore: 9,
      }),
    ]);

    expect(stats.recorded).toBe(7);
    expect(stats.wins).toBe(6);
    expect(stats.losses).toBe(1);
    expect(stats.winPercentage).toBe(6 / 7);
    expect(stats.byChoice.offense).toEqual({
      games: 2,
      wins: 1,
      losses: 1,
      ties: 0,
      winPercentage: 0.5,
    });
    expect(stats.byChoice.defense).toEqual({
      games: 1,
      wins: 0,
      losses: 1,
      ties: 0,
      winPercentage: 0,
    });
    expect(stats.byChoice.side).toEqual({
      games: 2,
      wins: 1,
      losses: 0,
      ties: 1,
      winPercentage: 1,
    });
  });

  it('returns empty flip stats when no selected game recorded the flip', () => {
    const stats = computeFlipStats([
      makeGame({
        id: 'legacy',
        initialReceivingSideId: ZOO,
        focusScore: 15,
        opponentScore: 9,
      }),
    ]);

    expect(stats.recorded).toBe(0);
    expect(stats.winPercentage).toBeNull();
    expect(stats.byChoice.offense.games).toBe(0);
    expect(stats.byChoice.offense.ties).toBe(0);
    expect(stats.byChoice.defense.games).toBe(0);
    expect(stats.byChoice.defense.ties).toBe(0);
    expect(stats.byChoice.side.games).toBe(0);
    expect(stats.byChoice.side.ties).toBe(0);
  });
});
