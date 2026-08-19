import {
  computeAdvancedPlayerThrowTypeStats,
  computeAdvancedThrowTypeStats,
} from '../advancedThrowTypeStatsUtils';
import type { AnalyticsGame } from '../analyticsTypes';
import { getEligibleThrowTypes } from '../types';

function makeGame(): AnalyticsGame {
  return {
    gameType: 'game',
    focusSideId: 'home',
    oppSideId: 'away',
    initialReceivingSideId: 'home',
    sideLabels: { home: 'Home', away: 'Away' },
    participantNames: new Map([
      ['alice', 'Alice'],
      ['bob', 'Bob'],
    ]),
    createdAt: 0,
    points: [],
    possessions: [],
    attributions: [],
    actions: [
      {
        id: 'a1',
        kind: 'throw',
        sideId: 'home',
        actorId: 'alice',
        receiverId: 'bob',
        defenderId: null,
        previousActionId: null,
        pointId: 'p1',
        pointIndex: 0,
        possessionId: 'poss1',
        possessionIndex: 0,
        actionIndex: 0,
        elapsedMs: null,
        result: 'complete',
        splitAttribution: false,
        details: { type: 'huck' },
      },
      {
        id: 'a2',
        kind: 'throw',
        sideId: 'home',
        actorId: 'alice',
        receiverId: 'bob',
        defenderId: null,
        previousActionId: 'a1',
        pointId: 'p1',
        pointIndex: 0,
        possessionId: 'poss1',
        possessionIndex: 0,
        actionIndex: 1,
        elapsedMs: null,
        result: 'drop',
        splitAttribution: true,
        details: { type: 'huck' },
      },
      {
        id: 'a3',
        kind: 'throw',
        sideId: 'home',
        actorId: 'alice',
        receiverId: null,
        defenderId: null,
        previousActionId: null,
        pointId: 'p2',
        pointIndex: 1,
        possessionId: 'poss2',
        possessionIndex: 0,
        actionIndex: 0,
        elapsedMs: null,
        result: 'throwaway',
        splitAttribution: false,
        details: { type: 'backfield_reset' },
      },
      {
        id: 'a4',
        kind: 'throw',
        sideId: 'away',
        actorId: null,
        receiverId: null,
        defenderId: null,
        previousActionId: null,
        pointId: 'p3',
        pointIndex: 2,
        possessionId: 'poss3',
        possessionIndex: 0,
        actionIndex: 0,
        elapsedMs: null,
        result: 'complete',
        splitAttribution: false,
        details: { type: 'huck' },
      },
    ],
  };
}

describe('advanced throw type stats', () => {
  it('returns the shared throw classification eligibility matrix', () => {
    expect(getEligibleThrowTypes('complete')).toEqual(['huck']);
    expect(getEligibleThrowTypes('goal')).toEqual(['huck']);
    expect(getEligibleThrowTypes('drop')).toEqual(['huck', 'backfield_reset']);
    expect(getEligibleThrowTypes('throwaway')).toEqual(['huck', 'backfield_reset']);
    expect(getEligibleThrowTypes('block')).toEqual(['huck', 'backfield_reset']);
    expect(getEligibleThrowTypes('pressure')).toEqual(['huck', 'backfield_reset']);
    expect(getEligibleThrowTypes('stall')).toEqual([]);
    expect(getEligibleThrowTypes('callahan')).toEqual([]);
  });

  it('derives team huck and reset metrics from classified actions', () => {
    const stats = computeAdvancedThrowTypeStats(makeGame(), 'home');

    expect(stats).toMatchObject({
      huckAttempts: 2,
      huckCompletions: 1,
      huckIncompletions: 1,
      huckTurnovers: 1,
      huckDrops: 1,
      resetTurnovers: 1,
      resetThrowaways: 1,
    });
    expect(stats.huckCompletionPct).toBe(0.5);
  });

  it('derives thrower and receiver event counts without weighted split attribution', () => {
    const stats = computeAdvancedPlayerThrowTypeStats(makeGame(), 'home');
    expect(stats.get('alice')).toMatchObject({
      huckAttempts: 2,
      huckCompletions: 1,
      huckIncompletions: 1,
      resetTurnovers: 1,
    });
    expect(stats.get('bob')).toMatchObject({ hucksCaught: 1, hucksDropped: 1 });
  });

  it('uses the complete eligibility matrix and keeps outcome breakdowns separate', () => {
    const game = makeGame();
    const template = game.actions[0];
    if (template.kind !== 'throw') throw new Error('Expected throw action fixture.');
    const huckResults = [
      'complete',
      'goal',
      'drop',
      'throwaway',
      'block',
      'pressure',
      'stall',
      'callahan',
    ] as const;
    const resetResults = ['drop', 'throwaway', 'block', 'pressure'] as const;
    game.actions = [
      ...huckResults.map((result, index) => ({
        ...template,
        id: `huck-${result}`,
        actionIndex: index,
        result,
        receiverId: result === 'complete' || result === 'goal' || result === 'drop' ? 'bob' : null,
        details: { type: 'huck' as const },
      })),
      ...resetResults.map((result, index) => ({
        ...template,
        id: `reset-${result}`,
        actionIndex: huckResults.length + index,
        result,
        receiverId: result === 'drop' ? 'bob' : null,
        details: { type: 'backfield_reset' as const },
      })),
    ];

    expect(computeAdvancedThrowTypeStats(game, 'home')).toMatchObject({
      huckAttempts: 6,
      huckCompletions: 2,
      huckCompletionPct: 2 / 6,
      huckIncompletions: 4,
      huckTurnovers: 4,
      huckDrops: 1,
      huckThrowaways: 1,
      huckBlocks: 1,
      huckPressures: 1,
      resetTurnovers: 4,
      resetDrops: 1,
      resetThrowaways: 1,
      resetBlocks: 1,
      resetPressures: 1,
    });

    const playerStats = computeAdvancedPlayerThrowTypeStats(game, 'home');
    expect(playerStats.get('alice')).toMatchObject({
      huckAttempts: 6,
      huckCompletions: 2,
      huckIncompletions: 4,
      resetTurnovers: 4,
    });
    expect(playerStats.get('bob')).toMatchObject({
      hucksCaught: 2,
      hucksDropped: 1,
      resetsDropped: 1,
    });
  });
});
