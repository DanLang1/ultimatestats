import { computeAdvancedTimeOfPossessionStats } from '@/lib/advancedTracking/advancedTimeOfPossessionUtils';

import type {
  AnalyticsAction,
  AnalyticsGame,
  AnalyticsPossession,
  ThrowAnalyticsAction,
} from '../analyticsTypes';

const FOCUS = 'focus';
const OPP = 'opp';

function makeAction(
  id: string,
  pointId: string,
  possessionId: string,
  possessionIndex: number,
  elapsedMs: number | null,
): ThrowAnalyticsAction {
  return {
    id,
    pointId,
    pointIndex: 0,
    possessionId,
    possessionIndex,
    actionIndex: 0,
    sideId: possessionIndex % 2 === 0 ? FOCUS : OPP,
    actorId: null,
    receiverId: null,
    defenderId: null,
    previousActionId: null,
    elapsedMs,
    kind: 'throw',
    result: possessionIndex === 0 ? 'throwaway' : 'goal',
    splitAttribution: false,
  };
}

function makePossession(
  id: string,
  pointId: string,
  possessionIndex: number,
  sideId: string,
): AnalyticsPossession {
  return {
    id,
    pointId,
    pointIndex: 0,
    possessionIndex,
    sideId,
    result: possessionIndex === 0 ? 'turned_over' : 'scored',
  };
}

function makeGame(
  possessions: AnalyticsPossession[],
  actions: AnalyticsAction[],
  durationMs: number | null,
): AnalyticsGame {
  return {
    gameType: 'game',
    focusSideId: FOCUS,
    oppSideId: OPP,
    initialReceivingSideId: FOCUS,
    sideLabels: { [FOCUS]: 'Us', [OPP]: 'Them' },
    participantNames: new Map(),
    createdAt: 1,
    points: [
      {
        id: 'pt1',
        pointIndex: 0,
        half: 1,
        receivingSideId: FOCUS,
        pullingSideId: OPP,
        scoringSideId: possessions.at(-1)?.sideId ?? FOCUS,
        state: 'hold',
        linesBySide: { [FOCUS]: [], [OPP]: [] },
        scoresBySide: { [FOCUS]: 0, [OPP]: 0 },
        durationMs,
        isCleanHold: possessions.length === 1,
      },
    ],
    possessions,
    actions,
    attributions: [],
  };
}

describe('computeAdvancedTimeOfPossessionStats', () => {
  it('counts a clean scored possession for the possessing side', () => {
    const possession = makePossession('pos1', 'pt1', 0, FOCUS);
    const action = {
      ...makeAction('a1', 'pt1', 'pos1', 0, 20_000),
      result: 'goal' as const,
    };

    const stats = computeAdvancedTimeOfPossessionStats(
      makeGame([possession], [action], 20_000),
      FOCUS,
      OPP,
    );

    expect(stats.hasTopData).toBe(true);
    expect(stats.team1TotalPossessionMs).toBe(20_000);
    expect(stats.team2TotalPossessionMs).toBe(0);
    expect(stats.team1PossessionPct).toBe(100);
    expect(stats.timedPointCount).toBe(1);
  });

  it('splits possession time across turnover segments', () => {
    const focusPossession = makePossession('pos1', 'pt1', 0, FOCUS);
    const oppPossession = makePossession('pos2', 'pt1', 1, OPP);
    const focusTurn = makeAction('a1', 'pt1', 'pos1', 0, 12_000);
    const oppGoal = makeAction('a2', 'pt1', 'pos2', 1, 30_000);

    const stats = computeAdvancedTimeOfPossessionStats(
      makeGame([focusPossession, oppPossession], [focusTurn, oppGoal], 30_000),
      FOCUS,
      OPP,
    );

    expect(stats.team1TotalPossessionMs).toBe(12_000);
    expect(stats.team2TotalPossessionMs).toBe(18_000);
    expect(stats.team1PossessionPct).toBe(40);
    expect(stats.team2PossessionPct).toBe(60);
  });

  it('skips points with missing possession timing', () => {
    const possession = makePossession('pos1', 'pt1', 0, FOCUS);
    const action = makeAction('a1', 'pt1', 'pos1', 0, null);

    const stats = computeAdvancedTimeOfPossessionStats(
      makeGame([possession], [action], null),
      FOCUS,
      OPP,
    );

    expect(stats.hasTopData).toBe(false);
    expect(stats.timedPointCount).toBe(0);
  });
});
