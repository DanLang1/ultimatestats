import { PointLineRecord } from '@/lib/storage/types';
import { GameEvent, GoalEvent, TurnoverType } from '@/store/gameStore.types';
import {
  buildPointCardTimelineData,
  buildTimelineLineupEntries,
  computePointByPointEvents,
  computeRoundedSplitMs,
  DisplayTimeout,
  DisplayTurnover,
  filterCallahanBlock,
  formatClockDuration,
  formatSplitDuration,
  getEventTimeValidationError,
  getMatchingTypeColor,
  getMinAllowedPointDurationMs,
  getPointDurationValidationError,
  getPointTimingBounds,
  getTurnoverSummary,
  mergeTimelineEvents,
  TimelineEvent,
} from '../timelineUtils';

describe('timelineUtils', () => {
  describe('computePointByPointEvents', () => {
    const goal = (
      team: 'team1' | 'team2',
      goalPlayerId?: string,
      assistPlayerId?: string,
    ): GoalEvent => ({
      type: 'goal',
      team,
      goalPlayerId: goalPlayerId ?? null,
      assistPlayerId: assistPlayerId ?? null,
    });

    const turnover = (team: 'team1' | 'team2', subtype: TurnoverType): GameEvent => ({
      type: 'turnover',
      team,
      subtype,
      playerId: null,
    });

    const timeout = (team: 'team1' | 'team2', isFloater = false): GameEvent => ({
      type: 'timeout',
      team,
      index: 0,
      isFloater,
    });

    it('should correctly group turnovers into points', () => {
      const events: GameEvent[] = [
        turnover('team1', 'throwaway'),
        turnover('team2', 'block'),
        goal('team1', 'Alice', 'Bob'),
        turnover('team1', 'drop'),
        goal('team2'),
      ];

      const points = computePointByPointEvents(events, 'team1', 15);

      expect(points).toHaveLength(2);

      // Point 1
      expect(points[0].pointNumber).toBe(1);
      expect(points[0].scoringTeam).toBe('team1');
      expect(points[0].turnovers).toHaveLength(2);
      expect(points[0].turnovers[0].type).toBe('throwaway');
      expect(points[0].turnovers[1].type).toBe('block');
      expect(points[0].scoreAfter).toEqual({ team1: 1, team2: 0 });

      // Point 2
      expect(points[1].pointNumber).toBe(2);
      expect(points[1].scoringTeam).toBe('team2');
      expect(points[1].turnovers).toHaveLength(1);
      expect(points[1].turnovers[0].type).toBe('drop');
      expect(points[1].scoreAfter).toEqual({ team1: 1, team2: 1 });
    });

    it('should track possession changes (scoring team pulls)', () => {
      const events: GameEvent[] = [
        goal('team1'), // Point 1: team1 starts O, scores. Next point: team2 is O.
        goal('team1'), // Point 2: team2 starts O, team1 scores. Next point: team1 is O.
        goal('team2'), // Point 3: team1 starts O, team2 scores. Next point: team2 is O.
      ];

      const points = computePointByPointEvents(events, 'team1', 15);

      expect(points[0].offensiveTeam).toBe('team1');
      expect(points[0].possessionType).toBe('hold');

      expect(points[1].offensiveTeam).toBe('team2');
      expect(points[1].possessionType).toBe('break');

      // Point 3: Team 1 scored Point 2, so Team 1 pulls. Team 2 is O for Point 3.
      expect(points[2].offensiveTeam).toBe('team2');
      expect(points[2].possessionType).toBe('hold');
    });

    it('should handle halftime flip', () => {
      // gameTo = 3, halftime = 2
      const events: GameEvent[] = [
        goal('team2'), // P1: T1 O, T2 scores. Score: 0-1.
        { ...goal('team2'), triggeredHalftime: true }, // P2: actual halftime goal
        goal('team1'), // P3: T2 starts O (because T1 started game on O).
      ];

      const points = computePointByPointEvents(events, 'team1', 3);

      expect(points[1].scoreAfter.team2).toBe(2); // Halftime reached

      // Point 3: Team that started on defense (team2) receives 2nd half
      expect(points[2].offensiveTeam).toBe('team2');
    });

    it('should not apply a halftime flip when auto halftime is disabled', () => {
      const events: GameEvent[] = [
        goal('team2'), // P1: team1 starts on offense, team2 scores
        goal('team2'), // P2: team2 starts on offense, team2 scores
        goal('team1'), // P3 should start with team1 when halftime is disabled
      ];

      const points = computePointByPointEvents(events, 'team1', 3, undefined, undefined, false);

      expect(points[2].offensiveTeam).toBe('team1');
    });

    it('should prefer the explicit halftime marker over final gameTo reconstruction', () => {
      const events: GameEvent[] = [
        goal('team2'), // P1: team1 starts on offense
        goal('team2'), // P2: team1 still receives after a break
        goal('team2'), // P3: soft-cap-reduced gameTo would incorrectly infer halftime here
        goal('team2'), // P4: should still be team1 offense until the marked halftime goal
        goal('team2'),
        goal('team2'),
        goal('team2'),
        { ...goal('team2'), triggeredHalftime: true }, // Actual halftime goal from original baseGameTo
        goal('team1'),
      ];

      const points = computePointByPointEvents(events, 'team1', 6);

      expect(points[3].offensiveTeam).toBe('team1');
      expect(points[8].offensiveTeam).toBe('team2');
    });

    it('should correctly group timeouts into points', () => {
      const events: GameEvent[] = [
        timeout('team1'),
        turnover('team1', 'throwaway'),
        timeout('team2'),
        goal('team1'),
        timeout('team1', true), // floater
        goal('team2'),
      ];

      const points = computePointByPointEvents(events, 'team1', 15);

      expect(points).toHaveLength(2);

      // Point 1: has 2 timeouts
      expect(points[0].timeouts).toHaveLength(2);
      expect(points[0].timeouts[0].team).toBe('team1');
      expect(points[0].timeouts[0].isFloater).toBe(false);
      expect(points[0].timeouts[1].team).toBe('team2');

      // Point 2: has 1 floater timeout
      expect(points[1].timeouts).toHaveLength(1);
      expect(points[1].timeouts[0].team).toBe('team1');
      expect(points[1].timeouts[0].isFloater).toBe(true);
    });

    it('should include timeouts in in-progress points', () => {
      const events: GameEvent[] = [goal('team1'), timeout('team1'), turnover('team1', 'drop')];

      const points = computePointByPointEvents(events, 'team1', 15);

      expect(points).toHaveLength(2);

      // Point 2 is in progress with 1 timeout and 1 turnover
      expect(points[1].isInProgress).toBe(true);
      expect(points[1].timeouts).toHaveLength(1);
      expect(points[1].turnovers).toHaveLength(1);
    });

    it('should show in-progress point with only timeout', () => {
      const events: GameEvent[] = [goal('team1'), timeout('team2')];

      const points = computePointByPointEvents(events, 'team1', 15);

      expect(points).toHaveLength(2);
      expect(points[1].isInProgress).toBe(true);
      expect(points[1].timeouts).toHaveLength(1);
      expect(points[1].turnovers).toHaveLength(0);
    });
  });

  describe('buildTimelineLineupEntries', () => {
    it('falls back to showing all players when injury metadata is absent', () => {
      const pointRecords: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['a', 'b', 'c'], timestamp: 1 },
        { pointNumber: 1, playerIds: ['a', 'b', 'd'], timestamp: 2, isSubstitution: true },
      ];

      expect(buildTimelineLineupEntries(['a', 'b', 'c', 'd'], pointRecords)).toEqual([
        { playerId: 'a', isSubIn: false, isInjuredOut: false },
        { playerId: 'b', isSubIn: false, isInjuredOut: false },
        { playerId: 'c', isSubIn: false, isInjuredOut: false },
        { playerId: 'd', isSubIn: false, isInjuredOut: false },
      ]);
    });

    it('shows final line plus injured-out players when injury metadata exists', () => {
      const pointRecords: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['a', 'b', 'c'], timestamp: 1 },
        {
          pointNumber: 1,
          playerIds: ['a', 'b', 'd'],
          timestamp: 2,
          isSubstitution: true,
          substitutionType: 'injury',
          subbedInPlayerIds: ['d'],
          subbedOutPlayerIds: ['c'],
        },
      ];

      expect(buildTimelineLineupEntries(['a', 'b', 'c', 'd'], pointRecords)).toEqual([
        { playerId: 'a', isSubIn: false, isInjuredOut: false },
        { playerId: 'b', isSubIn: false, isInjuredOut: false },
        { playerId: 'd', isSubIn: true, isInjuredOut: false },
        { playerId: 'c', isSubIn: false, isInjuredOut: true },
      ]);
    });

    it('accumulates labels across multiple injury substitutions while preserving display order', () => {
      const pointRecords: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['a', 'b', 'c'], timestamp: 1 },
        {
          pointNumber: 1,
          playerIds: ['a', 'b', 'd'],
          timestamp: 2,
          isSubstitution: true,
          substitutionType: 'injury',
          subbedInPlayerIds: ['d'],
          subbedOutPlayerIds: ['c'],
        },
        {
          pointNumber: 1,
          playerIds: ['a', 'e', 'd'],
          timestamp: 3,
          isSubstitution: true,
          substitutionType: 'injury',
          subbedInPlayerIds: ['e'],
          subbedOutPlayerIds: ['b'],
        },
      ];

      expect(buildTimelineLineupEntries(['a', 'b', 'c', 'd', 'e'], pointRecords)).toEqual([
        { playerId: 'a', isSubIn: false, isInjuredOut: false },
        { playerId: 'e', isSubIn: true, isInjuredOut: false },
        { playerId: 'd', isSubIn: true, isInjuredOut: false },
        { playerId: 'b', isSubIn: false, isInjuredOut: true },
        { playerId: 'c', isSubIn: false, isInjuredOut: true },
      ]);
    });
  });

  describe('formatClockDuration', () => {
    it('formats seconds only', () => {
      expect(formatClockDuration(5000)).toBe('0:05');
      expect(formatClockDuration(45000)).toBe('0:45');
    });

    it('formats minutes and seconds', () => {
      expect(formatClockDuration(90000)).toBe('1:30');
      expect(formatClockDuration(212000)).toBe('3:32');
    });

    it('formats hours', () => {
      expect(formatClockDuration(3661000)).toBe('1:01:01');
    });

    it('rounds to nearest second', () => {
      expect(formatClockDuration(212400)).toBe('3:32'); // 212.4s rounds to 212
      expect(formatClockDuration(212600)).toBe('3:33'); // 212.6s rounds to 213
    });
  });

  describe('formatSplitDuration', () => {
    it('formats seconds only as +Xs', () => {
      expect(formatSplitDuration(5000)).toBe('+5s');
      expect(formatSplitDuration(45000)).toBe('+45s');
    });

    it('formats minutes and seconds as +m:ss', () => {
      expect(formatSplitDuration(90000)).toBe('+1:30');
    });

    it('formats hours as +h:mm:ss', () => {
      expect(formatSplitDuration(3661000)).toBe('+1:01:01');
    });

    it('rounds to nearest second', () => {
      expect(formatSplitDuration(11200)).toBe('+11s'); // raw ms would show 11
      expect(formatSplitDuration(11500)).toBe('+12s'); // rounds up
    });
  });

  describe('computeRoundedSplitMs', () => {
    it('returns difference rounded to seconds', () => {
      expect(computeRoundedSplitMs(212000, 224000)).toBe(12000); // exactly 12s
    });

    it('matches displayed timestamps — 3:32 to 3:44 is +12s not +11s', () => {
      // 212,400ms displays as 3:32; 223,600ms displays as 3:44
      // raw diff = 11,200ms, but rounded diff = 12s
      expect(computeRoundedSplitMs(212400, 223600)).toBe(12000);
    });

    it('handles exact second boundaries', () => {
      expect(computeRoundedSplitMs(60000, 75000)).toBe(15000);
    });

    it('returns 0 when timestamps round to the same second', () => {
      // 10100ms and 10400ms both round to 10s
      expect(computeRoundedSplitMs(10100, 10400)).toBe(0);
    });
  });

  describe('getMatchingTypeColor', () => {
    const colors = {
      mmpColor: '#111111',
      fmpColor: '#222222',
      fallbackColor: '#333333',
    };

    it('returns the MMP color for mmp players', () => {
      expect(getMatchingTypeColor('mmp', colors)).toBe('#111111');
    });

    it('returns the FMP color for fmp players', () => {
      expect(getMatchingTypeColor('fmp', colors)).toBe('#222222');
    });

    it('returns the fallback color when matching is missing', () => {
      expect(getMatchingTypeColor(null, colors)).toBe('#333333');
      expect(getMatchingTypeColor(undefined, colors)).toBe('#333333');
    });
  });

  describe('mergeTimelineEvents', () => {
    const makeTurnover = (eventIndex: number, elapsedMs?: number): DisplayTurnover => ({
      team: 'team1',
      type: 'throwaway',
      playerId: null,
      eventIndex,
      elapsedMs,
    });

    const makeTimeout = (eventIndex: number, elapsedMs?: number): DisplayTimeout => ({
      team: 'team1',
      isFloater: false,
      eventIndex,
      elapsedMs,
    });

    it('sorts turnovers and timeouts by elapsedMs', () => {
      const result = mergeTimelineEvents(
        [makeTurnover(0, 10000), makeTurnover(2, 30000)],
        [makeTimeout(1, 20000)],
      );
      expect(result.map((e) => e.data.eventIndex)).toEqual([0, 1, 2]);
      expect(result.map((e) => e.kind)).toEqual(['turnover', 'timeout', 'turnover']);
    });

    it('places events without elapsedMs after timed events', () => {
      const result = mergeTimelineEvents([makeTurnover(0, undefined), makeTurnover(1, 5000)], []);
      expect(result[0].data.eventIndex).toBe(1); // timed first
      expect(result[1].data.eventIndex).toBe(0); // untimed last
    });

    it('uses raw eventIndex to order untimed turnovers and timeouts', () => {
      const result = mergeTimelineEvents([makeTurnover(1, undefined)], [makeTimeout(0, undefined)]);
      expect(result.map((e) => e.data.eventIndex)).toEqual([0, 1]);
      expect(result.map((e) => e.kind)).toEqual(['timeout', 'turnover']);
    });

    it('preserves originalIndex for each kind independently', () => {
      const result = mergeTimelineEvents(
        [makeTurnover(10, 1000), makeTurnover(20, 3000)],
        [makeTimeout(15, 2000)],
      );
      expect(result[0]).toMatchObject({ kind: 'turnover', originalIndex: 0 });
      expect(result[1]).toMatchObject({ kind: 'timeout', originalIndex: 0 });
      expect(result[2]).toMatchObject({ kind: 'turnover', originalIndex: 1 });
    });

    it('returns empty array when both inputs are empty', () => {
      expect(mergeTimelineEvents([], [])).toEqual([]);
    });
  });

  describe('point duration editing validation', () => {
    const timedPoint = {
      turnovers: [
        {
          team: 'team1' as const,
          type: 'throwaway' as const,
          playerId: null,
          eventIndex: 0,
          elapsedMs: 12000,
        },
      ],
      timeouts: [{ team: 'team1' as const, isFloater: false, eventIndex: 1, elapsedMs: 33000 }],
    };

    it('returns the latest timed non-goal event in the point', () => {
      expect(getMinAllowedPointDurationMs(timedPoint)).toBe(33000);
    });

    it('allows a goal duration at or after the latest event', () => {
      expect(getPointDurationValidationError(timedPoint, 33000)).toBeNull();
      expect(getPointDurationValidationError(timedPoint, 45000)).toBeNull();
    });

    it('blocks a goal duration earlier than the latest event', () => {
      expect(getPointDurationValidationError(timedPoint, 32000)).toBe(
        "Duration can't be earlier than the last event (0:33).",
      );
    });

    it('allows clearing or untimed points', () => {
      expect(getPointDurationValidationError(timedPoint, 0)).toBeNull();
      expect(getPointDurationValidationError({ turnovers: [], timeouts: [] }, 15000)).toBeNull();
      expect(getPointDurationValidationError(undefined, 15000)).toBeNull();
    });
  });

  describe('event time editing validation', () => {
    const point = {
      pointNumber: 1,
      scoringTeam: 'team1' as const,
      scoreAfter: { team1: 1, team2: 0 },
      goalPlayerId: null,
      assistPlayerId: null,
      goalEventIndex: 3,
      goalElapsedMs: 45000,
      turnovers: [
        {
          team: 'team1' as const,
          type: 'throwaway' as const,
          playerId: null,
          eventIndex: 0,
          elapsedMs: 12000,
        },
      ],
      timeouts: [
        {
          team: 'team1' as const,
          isFloater: false,
          eventIndex: 1,
        },
        {
          team: 'team2' as const,
          isFloater: false,
          eventIndex: 2,
          elapsedMs: 33000,
        },
      ],
      offensiveTeam: 'team1' as const,
      possessionType: 'hold' as const,
      pointDurationMs: 45000,
    };

    it('returns previous and next timed bounds for an event by raw event order', () => {
      expect(getPointTimingBounds(point, 1)).toEqual({
        minAllowedMs: 12000,
        maxAllowedMs: 33000,
      });
      expect(getPointTimingBounds(point, 2)).toEqual({
        minAllowedMs: 12000,
        maxAllowedMs: 45000,
      });
      expect(getPointTimingBounds(point, 3)).toEqual({
        minAllowedMs: 33000,
        maxAllowedMs: undefined,
      });
    });

    it('allows event times within neighboring timed bounds', () => {
      expect(getEventTimeValidationError(point, 1, 20000)).toBeNull();
      expect(getEventTimeValidationError(point, 2, 45000)).toBeNull();
    });

    it('blocks event times that would break chronological order', () => {
      expect(getEventTimeValidationError(point, 1, 11000)).toBe(
        "Time can't be earlier than the previous timed event (0:12).",
      );
      expect(getEventTimeValidationError(point, 1, 34000)).toBe(
        "Time can't be later than the next timed event (0:33).",
      );
    });

    it('allows clearing or editing when no point context is found', () => {
      expect(getEventTimeValidationError(point, 1, 0)).toBeNull();
      expect(getEventTimeValidationError(undefined, 1, 15000)).toBeNull();
      expect(getPointTimingBounds(undefined, 1)).toEqual({});
    });
  });

  describe('filterCallahanBlock', () => {
    const makeTurnoverEvent = (eventIndex: number): TimelineEvent => ({
      kind: 'turnover',
      data: { team: 'team1', type: 'block', playerId: 'p1', eventIndex, elapsedMs: undefined },
      originalIndex: 0,
    });

    const makeTimeoutEvent = (eventIndex: number): TimelineEvent => ({
      kind: 'timeout',
      data: { team: 'team1', isFloater: false, eventIndex, elapsedMs: undefined },
      originalIndex: 0,
    });

    it('removes the turnover event matching callahanBlockEventIndex', () => {
      const events = [makeTurnoverEvent(3), makeTurnoverEvent(7)];
      const result = filterCallahanBlock(events, 3);
      expect(result).toHaveLength(1);
      expect(result[0].data.eventIndex).toBe(7);
    });

    it('does not remove timeout events even if eventIndex matches', () => {
      const events = [makeTurnoverEvent(3), makeTimeoutEvent(3)];
      const result = filterCallahanBlock(events, 3);
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('timeout');
    });

    it('returns events unchanged when callahanBlockEventIndex is undefined', () => {
      const events = [makeTurnoverEvent(3), makeTurnoverEvent(7)];
      const result = filterCallahanBlock(events, undefined);
      expect(result).toHaveLength(2);
    });

    it('returns events unchanged when no event matches', () => {
      const events = [makeTurnoverEvent(3), makeTurnoverEvent(7)];
      const result = filterCallahanBlock(events, 99);
      expect(result).toHaveLength(2);
    });
  });

  describe('buildPointCardTimelineData', () => {
    const basePoint = {
      pointNumber: 1,
      scoringTeam: 'team1' as const,
      scoreAfter: { team1: 1, team2: 0 },
      goalPlayerId: 'goal-player',
      assistPlayerId: 'assist-player',
      goalEventIndex: 4,
      goalElapsedMs: 45000,
      turnovers: [
        {
          team: 'team1' as const,
          type: 'throwaway' as const,
          playerId: 'thrower',
          eventIndex: 1,
          elapsedMs: 12000,
        },
      ],
      timeouts: [
        {
          team: 'team1' as const,
          isFloater: false,
          eventIndex: 2,
          elapsedMs: 30000,
        },
      ],
      offensiveTeam: 'team1' as const,
      possessionType: 'hold' as const,
      pointDurationMs: 45000,
    };

    it('builds visible merged events and a split-to-goal value when timing is shown', () => {
      const result = buildPointCardTimelineData(basePoint, {
        isTeam1: true,
        timingEnabled: true,
        showSplitSeparators: true,
      });

      expect(result.isCallahan).toBe(false);
      expect(result.callahanBlockEventIndex).toBeUndefined();
      expect(result.hasVisibleEvents).toBe(true);
      expect(result.mergedEvents.map((event) => event.data.eventIndex)).toEqual([1, 2]);
      expect(result.splitToGoalMs).toBe(15000);
    });

    it('filters the implicit Callahan block from the merged event list', () => {
      const callahanPoint = {
        ...basePoint,
        assistPlayerId: 'OTHER_TEAM',
        turnovers: [
          {
            team: 'team1' as const,
            type: 'block' as const,
            playerId: 'goal-player',
            eventIndex: 0,
            elapsedMs: 8000,
          },
          ...basePoint.turnovers,
        ],
      };

      const result = buildPointCardTimelineData(callahanPoint, {
        isTeam1: true,
        timingEnabled: true,
        showSplitSeparators: true,
      });

      expect(result.isCallahan).toBe(true);
      expect(result.callahanBlockEventIndex).toBe(0);
      expect(result.mergedEvents.map((event) => event.data.eventIndex)).toEqual([1, 2]);
      expect(result.splitToGoalMs).toBe(15000);
    });

    it('omits split-to-goal when timing or split separators are disabled', () => {
      expect(
        buildPointCardTimelineData(basePoint, {
          isTeam1: true,
          timingEnabled: false,
          showSplitSeparators: true,
        }).splitToGoalMs,
      ).toBeUndefined();

      expect(
        buildPointCardTimelineData(basePoint, {
          isTeam1: true,
          timingEnabled: true,
          showSplitSeparators: false,
        }).splitToGoalMs,
      ).toBeUndefined();
    });

    it('omits split-to-goal when the goal is earlier than the last visible timed event', () => {
      const invalidPoint = {
        ...basePoint,
        goalElapsedMs: 25000,
      };

      const result = buildPointCardTimelineData(invalidPoint, {
        isTeam1: true,
        timingEnabled: true,
        showSplitSeparators: true,
      });

      expect(result.splitToGoalMs).toBeUndefined();
    });
  });

  describe('getTurnoverSummary', () => {
    it('summarizes different turnover types', () => {
      const turnovers: DisplayTurnover[] = [
        { team: 'team1', type: 'block', playerId: null, eventIndex: 0 },
        { team: 'team1', type: 'block', playerId: null, eventIndex: 1 },
        { team: 'team1', type: 'throwaway', playerId: null, eventIndex: 2 },
        { team: 'team1', type: 'fiftyfifty', playerId: null, eventIndex: 3 },
        { team: 'team1', type: 'drop', playerId: null, eventIndex: 4 },
      ];

      const summary = getTurnoverSummary(turnovers);

      expect(summary.blocks).toBe(2);
      expect(summary.throwaways).toBe(2); // throwaway + fiftyfifty
      expect(summary.drops).toBe(1);
    });
  });
});
