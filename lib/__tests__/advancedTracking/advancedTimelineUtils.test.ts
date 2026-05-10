import {
  buildAdvancedTimeline,
  getPointStateLabel,
  getTransitionLabel,
} from '../../advancedTracking/advancedTimelineUtils';
import type { AdvancedTrackedGame } from '../../advancedTracking/types';

const ZOO = 'Zoo';
const RIVALS = 'rivals';

const participants = [
  { id: 'p_august', name: 'August' },
  { id: 'p_meves', name: 'Meves' },
  { id: 'p_joah', name: 'Joah' },
  { id: 'p_max', name: 'Max' },
  { id: 'p_sam', name: 'Sam' },
];

const august = { refType: 'participant' as const, participantId: 'p_august' };
const meves = { refType: 'participant' as const, participantId: 'p_meves' };
const joah = { refType: 'participant' as const, participantId: 'p_joah' };
const maxRef = { refType: 'participant' as const, participantId: 'p_max' };
const untracked = { refType: 'untracked' as const };
const unknown = { refType: 'unknown' as const };

const baseGame: Omit<AdvancedTrackedGame, 'points'> = {
  id: 'g1',
  schemaVersion: 1,
  createdAt: 0,
  updatedAt: 0,
  gameType: 'game',
  status: 'final',
  focusSideId: ZOO,
  initialReceivingSideId: ZOO,
  settings: { locationMode: 'none' },
  sides: [
    { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
    { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
  ],
  participants,
};

// ── Test cases ──────────────────────────────────────────────────────────────

describe('buildAdvancedTimeline', () => {
  it('clean hold with pull, pass, goal', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                { id: 'a2', kind: 'disc_pickup', sideId: ZOO, player: august },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'complete',
                },
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: joah,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    expect(timeline).toHaveLength(1);

    const point = timeline[0];
    expect(point.pointNumber).toBe(1);
    expect(point.state).toBe('hold');
    expect(point.scoreBefore).toEqual({ [ZOO]: 0, [RIVALS]: 0 });
    expect(point.scoreAfter).toEqual({ [ZOO]: 1, [RIVALS]: 0 });
    expect(point.receivingSideId).toBe(ZOO);
    expect(point.pullingSideId).toBe(RIVALS);
    expect(point.scoringSideId).toBe(ZOO);

    expect(point.possessions).toHaveLength(1);
    const possession = point.possessions[0];
    expect(possession.result).toBe('scored');
    expect(possession.actions).toHaveLength(2);

    // Complete pass
    expect(possession.actions[0].kind).toBe('throw');
    expect(possession.actions[0].primaryLabel).toContain('August');
    expect(possession.actions[0].primaryLabel).toContain('Meves');
    expect(possession.actions[0].tone).toBe('muted');

    // Goal
    expect(possession.actions[1].kind).toBe('throw');
    expect(possession.actions[1].primaryLabel).toContain('Goal');
    expect(possession.actions[1].tone).toBe('success');
  });

  it('multi-possession point with throwaway, block, and drop', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          possessions: [
            {
              id: 'pos1a',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos1b',
              sideId: ZOO,
              actions: [
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: joah,
                  result: 'drop',
                },
              ],
            },
            {
              id: 'pos1c',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'block',
                  defender: maxRef,
                },
              ],
            },
            {
              id: 'pos1d',
              sideId: ZOO,
              actions: [
                {
                  id: 'a5',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: maxRef,
                  toPlayer: august,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    const point = timeline[0];
    expect(point.state).toBe('break');
    expect(point.possessions).toHaveLength(4);

    // Throwaway
    const throwawayAction = point.possessions[0].actions[1];
    expect(throwawayAction.kind).toBe('throw');
    expect(throwawayAction.primaryLabel).toContain('Throwaway');
    expect(throwawayAction.tone).toBe('danger');

    // Drop
    const dropAction = point.possessions[1].actions[0];
    expect(dropAction.kind).toBe('throw');
    expect(dropAction.primaryLabel).toContain('Drop');
    expect(dropAction.tone).toBe('danger');

    // Block
    const blockAction = point.possessions[2].actions[0];
    expect(blockAction.kind).toBe('throw');
    expect(blockAction.primaryLabel).toContain('Max');
    expect(blockAction.primaryLabel).toContain('D');
    expect(blockAction.secondaryLabel).toBeNull();
    expect(blockAction.tone).toBe('success');

    // Goal
    const goalAction = point.possessions[3].actions[0];
    expect(goalAction.kind).toBe('throw');
    expect(goalAction.primaryLabel).toContain('Goal');
    expect(goalAction.tone).toBe('success');
  });

  it('callahan scoring side and scoreAfter', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'callahan',
                  defender: meves,
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    const point = timeline[0];
    expect(point.state).toBe('break');
    expect(point.scoringSideId).toBe(ZOO);
    expect(point.scoreAfter).toEqual({ [ZOO]: 1, [RIVALS]: 0 });

    const callahanAction = point.possessions[0].actions[1];
    expect(callahanAction.kind).toBe('throw');
    expect(callahanAction.primaryLabel).toContain('Callahan');
    expect(callahanAction.primaryLabel).toContain('Meves');
    expect(callahanAction.tone).toBe('success');
  });

  it('pull dropped as turnover', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'dropped',
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    const point = timeline[0];
    expect(point.possessions[0].result).toBe('turned_over');
    expect(point.possessions[0].turnoverType).toBe('drop');
    expect(point.possessions[0].actions).toHaveLength(0);
  });

  it('focus-side pull is shown with hang time', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos1a',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                  hangTimeMs: 4200,
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos1b',
              sideId: ZOO,
              actions: [
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    expect(timeline[0].possessions).toHaveLength(2);

    const pullActions = timeline[0].possessions[0].actions;
    expect(pullActions).toHaveLength(2);
    const pullAction = pullActions[0];
    expect(pullAction.kind).toBe('pull');
    expect(pullAction.primaryLabel).toContain('August');
    expect(pullAction.secondaryLabel).toBe('4.2s hang');
    expect(pullAction.tone).toBe('muted');

    const throwActions = timeline[0].possessions[1].actions;
    expect(throwActions).toHaveLength(1);
    expect(throwActions[0].kind).toBe('throw');
  });

  it('timeout during point (mid-possession stoppage)', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'stoppage',
                  sideId: ZOO,
                  reason: 'timeout',
                  isFloater: true,
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    const actions = timeline[0].possessions[0].actions;
    expect(actions[0].kind).toBe('stoppage');
    expect(actions[0].primaryLabel).toBe('Floater Timeout');
    expect(actions[0].tone).toBe('accent');
  });

  it('between-point timeout in transitionsAfter', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
          transitionsAfter: [
            { id: 't1', transitionType: 'timeout', sideId: ZOO, isFloater: false },
          ],
        },
        {
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                {
                  id: 'b1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    expect(timeline[0].transitionsAfter).toHaveLength(1);
    expect(timeline[0].transitionsAfter[0].transitionType).toBe('timeout');
    expect(timeline[1].transitionsAfter).toHaveLength(0);
  });

  it('halftime, soft cap, and hard cap separators', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: ZOO,
      gameTransitions: [
        { id: 'gt1', transitionType: 'halftime', afterPointId: 'pt1' },
        { id: 'gt2', transitionType: 'soft_cap', afterPointId: 'pt2' },
        { id: 'gt3', transitionType: 'hard_cap' },
      ],
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        {
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                {
                  id: 'b1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    expect(timeline[0].gameTransitionsAfter).toHaveLength(1);
    expect(timeline[0].gameTransitionsAfter[0].transitionType).toBe('halftime');

    expect(timeline[1].gameTransitionsAfter).toHaveLength(2);
    const types = timeline[1].gameTransitionsAfter.map((t) => t.transitionType);
    expect(types).toContain('soft_cap');
    expect(types).toContain('hard_cap');
  });

  it('injury stoppage plus linked sub', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah'] }],
          subs: [
            {
              id: 'sub1',
              sideId: ZOO,
              type: 'injury',
              inIds: ['p_max'],
              outIds: ['p_joah'],
              stoppageActionId: 'a_stoppage',
            },
          ],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a_stoppage',
                  kind: 'stoppage',
                  sideId: ZOO,
                  reason: 'injury',
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    const point = timeline[0];

    // Subs are present
    expect(point.subs).toHaveLength(1);
    expect(point.subs[0].stoppageActionId).toBe('a_stoppage');
    expect(point.subs[0].inNames).toContain('Max');
    expect(point.subs[0].outNames).toContain('Joah');

    // Line footer shows sub badges
    const linePlayers = point.linesBySide[ZOO];
    expect(linePlayers).toBeDefined();
    const maxPlayer = linePlayers.find((p) => p.participantId === 'p_max');
    const joahPlayer = linePlayers.find((p) => p.participantId === 'p_joah');
    expect(maxPlayer?.isSubIn).toBe(true);
    expect(joahPlayer?.isInjuredOut).toBe(true);
  });

  it('outputs individual throw actions for UI pass chain grouping', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'complete',
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: joah,
                  result: 'complete',
                },
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: joah,
                  toPlayer: maxRef,
                  result: 'complete',
                },
                {
                  id: 'a5',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: maxRef,
                  toPlayer: august,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    const actions = timeline[0].possessions[0].actions;

    // Utility outputs individual actions; UI will group completes
    const throwActions = actions.filter((a) => a.kind === 'throw');
    expect(throwActions).toHaveLength(4);
    expect(throwActions[0].primaryLabel).toContain('August');
    expect(throwActions[1].primaryLabel).toContain('Meves');
    expect(throwActions[2].primaryLabel).toContain('Joah');
    expect(throwActions[3].primaryLabel).toContain('Goal');
  });

  it('elapsed time excludes resumed stoppage duration', () => {
    const startedAt = 1000;
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          startedAt,
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                  recordedAt: startedAt + 2000,
                },
                {
                  id: 'a2',
                  kind: 'stoppage',
                  sideId: ZOO,
                  reason: 'timeout',
                  recordedAt: startedAt + 5000,
                  pausedAt: startedAt + 5000,
                  resumedAt: startedAt + 15000,
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                  recordedAt: startedAt + 18000,
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    const actions = timeline[0].possessions[0].actions;

    // Stoppage at 5s elapsed
    expect(actions[0].elapsedMs).toBe(5000);

    // Goal at 18s real time, but 10s was paused, so 8s elapsed since start
    expect(actions[1].elapsedMs).toBe(8000);

    // Point duration should also exclude pause
    expect(timeline[0].durationMs).toBe(8000);
  });

  it('opponent goal renders danger tone', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    const goalAction = timeline[0].possessions[0].actions[1];
    expect(goalAction.tone).toBe('danger');
  });

  it('split attribution drop uses danger tone', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'drop',
                  splitAttribution: true,
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    const dropAction = timeline[0].possessions[0].actions[0];
    expect(dropAction.tone).toBe('danger');
    expect(dropAction.primaryLabel).toContain('August');
    expect(dropAction.primaryLabel).toContain('Meves');
  });

  it('unknown player names resolve to Unknown', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'in_progress',
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: unknown,
                  toPlayer: meves,
                  result: 'complete',
                },
              ],
            },
          ],
        },
      ],
    };

    const timeline = buildAdvancedTimeline(game);
    const throwAction = timeline[0].possessions[0].actions[0];
    expect(throwAction.primaryLabel).toContain('Unknown');
  });
});

describe('getPointStateLabel', () => {
  it('returns correct labels for all states', () => {
    expect(getPointStateLabel('hold')).toBe('Hold');
    expect(getPointStateLabel('break')).toBe('Break');
    expect(getPointStateLabel('broken')).toBe('Broken');
    expect(getPointStateLabel('opp_hold')).toBe('Opp Hold');
    expect(getPointStateLabel('in_progress')).toBe('In Progress');
    expect(getPointStateLabel('terminated')).toBe('Terminated');
  });
});

describe('getTransitionLabel', () => {
  it('returns correct labels for between-point transitions', () => {
    expect(getTransitionLabel({ id: 't1', transitionType: 'timeout', sideId: ZOO })).toBe(
      'Timeout',
    );
    expect(
      getTransitionLabel({ id: 't1', transitionType: 'timeout', sideId: ZOO, isFloater: true }),
    ).toBe('Floater Timeout');
    expect(getTransitionLabel({ id: 't1', transitionType: 'spirit_timeout' })).toBe(
      'Spirit Timeout',
    );
    expect(getTransitionLabel({ id: 't1', transitionType: 'administrative' })).toBe(
      'Administrative',
    );
    expect(getTransitionLabel({ id: 't1', transitionType: 'heat_timeout' })).toBe('Heat Timeout');
  });

  it('returns correct labels for game transitions', () => {
    expect(getTransitionLabel({ id: 'gt1', transitionType: 'halftime', afterPointId: 'pt1' })).toBe(
      'Halftime',
    );
    expect(getTransitionLabel({ id: 'gt1', transitionType: 'soft_cap', afterPointId: 'pt1' })).toBe(
      'Soft Cap',
    );
    expect(getTransitionLabel({ id: 'gt1', transitionType: 'hard_cap' })).toBe('Hard Cap');
  });
});
