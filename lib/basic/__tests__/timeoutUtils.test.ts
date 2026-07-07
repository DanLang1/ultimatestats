import { GameEvent, GoalEvent } from '@/store/basic/gameStore.types';
import { deriveTimeoutState } from '../timeoutUtils';

// Helper to create goal events
const goal = (team: 'team1' | 'team2'): GoalEvent => ({
  type: 'goal',
  team,
  goalPlayerId: null,
  assistPlayerId: null,
});

const goalRun = (
  team: 'team1' | 'team2',
  count: number,
  halftimeGoalNumber?: number,
): GoalEvent[] =>
  Array.from({ length: count }, (_, index) => ({
    ...goal(team),
    ...(halftimeGoalNumber !== undefined && index === halftimeGoalNumber - 1
      ? { triggeredHalftime: true }
      : {}),
  }));

// Helper to create timeout events
const timeout = (team: 'team1' | 'team2', index: number, isFloater = false): GameEvent => ({
  type: 'timeout',
  team,
  index,
  isFloater,
});

// Helper to create turnover events (should be ignored)
const turnover = (team: 'team1' | 'team2'): GameEvent => ({
  type: 'turnover',
  team,
  subtype: 'drop',
  playerId: null,
});

describe('deriveTimeoutState', () => {
  describe('initial state (no events)', () => {
    it('returns all timeouts available when no events', () => {
      const result = deriveTimeoutState([], 15, true);

      expect(result).toEqual({
        team1Timeouts: [true, true],
        team2Timeouts: [true, true],
        team1Floater: true,
        team2Floater: true,
      });
    });

    it('respects configured timeout count', () => {
      const result = deriveTimeoutState([], 15, true, 1);

      expect(result).toEqual({
        team1Timeouts: [true],
        team2Timeouts: [true],
        team1Floater: true,
        team2Floater: true,
      });
    });
  });

  describe('timeout usage', () => {
    it('marks team1 first timeout as used', () => {
      const events: GameEvent[] = [timeout('team1', 0)];
      const result = deriveTimeoutState(events, 15, true);

      expect(result.team1Timeouts).toEqual([false, true]);
      expect(result.team2Timeouts).toEqual([true, true]);
    });

    it('marks team1 second timeout as used', () => {
      const events: GameEvent[] = [timeout('team1', 1)];
      const result = deriveTimeoutState(events, 15, true);

      expect(result.team1Timeouts).toEqual([true, false]);
    });

    it('marks team2 timeouts as used', () => {
      const events: GameEvent[] = [timeout('team2', 0), timeout('team2', 1)];
      const result = deriveTimeoutState(events, 15, true);

      expect(result.team1Timeouts).toEqual([true, true]);
      expect(result.team2Timeouts).toEqual([false, false]);
    });

    it('marks team1 floater as used', () => {
      const events: GameEvent[] = [timeout('team1', 0, true)];
      const result = deriveTimeoutState(events, 15, true);

      expect(result.team1Floater).toBe(false);
      expect(result.team2Floater).toBe(true);
    });

    it('marks team2 floater as used', () => {
      const events: GameEvent[] = [timeout('team2', 0, true)];
      const result = deriveTimeoutState(events, 15, true);

      expect(result.team1Floater).toBe(true);
      expect(result.team2Floater).toBe(false);
    });

    it('handles multiple timeouts from both teams', () => {
      const events: GameEvent[] = [
        timeout('team1', 0),
        timeout('team2', 1),
        timeout('team1', 1),
        timeout('team2', 0, true),
      ];
      const result = deriveTimeoutState(events, 15, true);

      expect(result.team1Timeouts).toEqual([false, false]);
      expect(result.team2Timeouts).toEqual([true, false]);
      expect(result.team1Floater).toBe(true);
      expect(result.team2Floater).toBe(false);
    });
  });

  describe('halftime reset with autoHalftimeEnabled', () => {
    it('prefers the explicit halftime marker over the final gameTo when replaying timeouts', () => {
      const events: GameEvent[] = [
        timeout('team1', 0),
        goal('team2'),
        goal('team2'),
        goal('team2'),
        goal('team2'),
        timeout('team1', 1),
        goal('team2'),
        goal('team2'),
        goal('team2'),
        { ...goal('team2'), triggeredHalftime: true },
      ];

      const result = deriveTimeoutState(events, 6, true);

      // Both timeouts happened before the actual halftime goal, so both reset.
      expect(result.team1Timeouts).toEqual([true, true]);
    });

    it('resets regular timeouts at halftime but NOT floaters (game to 15, halftime at 8)', () => {
      const events: GameEvent[] = [
        timeout('team1', 0),
        timeout('team1', 1),
        timeout('team1', 0, true), // Floater
        timeout('team2', 0),
        // Score reaches 8-0 (halftime)
        ...goalRun('team1', 8, 8),
      ];
      const result = deriveTimeoutState(events, 15, true);

      // Regular timeouts should be reset after halftime
      expect(result.team1Timeouts).toEqual([true, true]);
      expect(result.team2Timeouts).toEqual([true, true]);
      // Floaters are NOT reset - they're once per game
      expect(result.team1Floater).toBe(false); // Used in 1st half, stays used
      expect(result.team2Floater).toBe(true); // Not used
    });

    it('resets timeouts when team2 reaches halftime score', () => {
      const events: GameEvent[] = [
        timeout('team1', 0),
        timeout('team2', 0),
        timeout('team2', 1),
        // Score reaches 0-8 (halftime)
        ...goalRun('team2', 8, 8),
      ];
      const result = deriveTimeoutState(events, 15, true);

      expect(result.team1Timeouts).toEqual([true, true]);
      expect(result.team2Timeouts).toEqual([true, true]);
    });

    it('tracks timeouts used after halftime', () => {
      const events: GameEvent[] = [
        timeout('team1', 0), // Used before halftime
        ...goalRun('team1', 8, 8), // Halftime reached
        timeout('team1', 1), // Used after halftime
        timeout('team2', 0, true), // Floater used after halftime
      ];
      const result = deriveTimeoutState(events, 15, true);

      expect(result.team1Timeouts).toEqual([true, false]);
      expect(result.team2Timeouts).toEqual([true, true]);
      expect(result.team1Floater).toBe(true);
      expect(result.team2Floater).toBe(false);
    });

    it('only resets once at first halftime', () => {
      const events: GameEvent[] = [
        timeout('team1', 0),
        ...goalRun('team1', 8, 8), // First halftime at 8-0
        timeout('team1', 1),
        ...goalRun('team2', 7), // Would be 8-7, but halftime already passed
      ];
      const result = deriveTimeoutState(events, 15, true);

      // Timeout used after halftime should still be marked
      expect(result.team1Timeouts).toEqual([true, false]);
    });

    it('handles game to 13 (halftime at 7)', () => {
      const events: GameEvent[] = [
        timeout('team1', 0),
        timeout('team1', 1),
        ...goalRun('team1', 7, 7), // Halftime at 7
      ];
      const result = deriveTimeoutState(events, 13, true);

      expect(result.team1Timeouts).toEqual([true, true]);
    });

    it('handles game to 11 (halftime at 6)', () => {
      const events: GameEvent[] = [
        timeout('team2', 0),
        ...goalRun('team2', 6, 6), // Halftime at 6
        timeout('team2', 1), // After halftime
      ];
      const result = deriveTimeoutState(events, 11, true);

      expect(result.team2Timeouts).toEqual([true, false]);
    });
  });

  describe('autoHalftimeEnabled = false', () => {
    it('does not reset timeouts at halftime score when disabled', () => {
      const events: GameEvent[] = [
        timeout('team1', 0),
        timeout('team1', 1),
        ...goalRun('team1', 8, 8), // Would be halftime at 8
      ];
      const result = deriveTimeoutState(events, 15, false);

      // Timeouts should NOT be reset
      expect(result.team1Timeouts).toEqual([false, false]);
    });

    it('ignores explicit halftime markers when halftime is disabled', () => {
      const events: GameEvent[] = [
        timeout('team1', 0),
        { ...goal('team1'), triggeredHalftime: true },
      ];
      const result = deriveTimeoutState(events, 15, false);

      expect(result.team1Timeouts).toEqual([false, true]);
    });
  });

  describe('ignores non-timeout/goal events', () => {
    it('turnovers do not affect timeout state', () => {
      const events: GameEvent[] = [
        timeout('team1', 0),
        turnover('team1'),
        turnover('team2'),
        timeout('team2', 1),
      ];
      const result = deriveTimeoutState(events, 15, true);

      expect(result.team1Timeouts).toEqual([false, true]);
      expect(result.team2Timeouts).toEqual([true, false]);
    });
  });

  describe('complex game scenarios', () => {
    it('full first half with multiple timeouts then halftime reset', () => {
      const events: GameEvent[] = [
        goal('team1'), // 1-0
        timeout('team1', 0),
        goal('team2'), // 1-1
        timeout('team2', 0),
        goal('team1'), // 2-1
        goal('team2'), // 2-2
        timeout('team1', 1),
        timeout('team2', 1),
        timeout('team1', 0, true), // team1 floater
        goal('team1'), // 3-2
        goal('team1'), // 4-2
        goal('team1'), // 5-2
        goal('team1'), // 6-2
        goal('team1'), // 7-2
        { ...goal('team1'), triggeredHalftime: true }, // 8-2 - HALFTIME
      ];
      const result = deriveTimeoutState(events, 15, true);

      // Regular timeouts reset at halftime
      expect(result.team1Timeouts).toEqual([true, true]);
      expect(result.team2Timeouts).toEqual([true, true]);
      // Floaters do NOT reset - once per game
      expect(result.team1Floater).toBe(false); // Used
      expect(result.team2Floater).toBe(true); // Not used
    });

    it('simulates undo past halftime restoring pre-halftime state', () => {
      // Full game up to halftime
      const fullEvents: GameEvent[] = [
        timeout('team1', 0),
        timeout('team1', 1),
        timeout('team1', 0, true), // Floater
        ...goalRun('team1', 8, 8), // Halftime
      ];

      // After halftime: regular timeouts reset, floater stays used
      const afterHalftime = deriveTimeoutState(fullEvents, 15, true);
      expect(afterHalftime.team1Timeouts).toEqual([true, true]);
      expect(afterHalftime.team1Floater).toBe(false); // Floater does NOT reset

      // Undo the halftime goal (pop last event)
      const eventsBeforeHalftime = fullEvents.slice(0, -1);
      const beforeHalftime = deriveTimeoutState(eventsBeforeHalftime, 15, true);

      // Should show pre-halftime state (all timeouts used, no halftime reset yet)
      expect(beforeHalftime.team1Timeouts).toEqual([false, false]);
      expect(beforeHalftime.team1Floater).toBe(false);
    });

    it('undo 2nd half timeout after using all timeouts+floater in 1st half', () => {
      // User scenario:
      // 1st half: use all timeouts + floater
      // 2nd half: use both timeouts (floater already used, stays used)
      // Undo: regular timeout restored, floater stays used
      const events: GameEvent[] = [
        // First half: use all timeouts + floater
        timeout('team1', 0),
        timeout('team1', 1),
        timeout('team1', 0, true), // Floater - once per game!
        // Goals to reach halftime (8 for game to 15)
        ...goalRun('team1', 8, 8),
        // Second half: use both timeouts (floater can't be used again)
        timeout('team1', 0),
        timeout('team1', 1),
      ];

      // Before undo: both 2nd half timeouts used, floater still used from 1st half
      const beforeUndo = deriveTimeoutState(events, 15, true);
      expect(beforeUndo.team1Timeouts).toEqual([false, false]);
      expect(beforeUndo.team1Floater).toBe(false); // Used in 1st half, does NOT reset

      // After undo: pop last timeout
      const afterUndo = deriveTimeoutState(events.slice(0, -1), 15, true);
      expect(afterUndo.team1Timeouts).toEqual([false, true]); // One restored
      expect(afterUndo.team1Floater).toBe(false); // Still used (once per game)
    });
  });

  describe('single-timeout configuration', () => {
    it('restores one-timeout shape after undo replay', () => {
      const events: GameEvent[] = [timeout('team1', 0)];
      const afterUndo = deriveTimeoutState(events.slice(0, -1), 15, true, 1);

      expect(afterUndo.team1Timeouts).toEqual([true]);
      expect(afterUndo.team2Timeouts).toEqual([true]);
    });

    it('ignores out-of-range timeout indices for configured count', () => {
      const events: GameEvent[] = [timeout('team1', 1)];
      const result = deriveTimeoutState(events, 15, true, 1);

      expect(result.team1Timeouts).toEqual([true]);
      expect(result.team2Timeouts).toEqual([true]);
    });
  });
});
