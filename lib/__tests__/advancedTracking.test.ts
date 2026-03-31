import {
  completionPercentage,
  deriveConnectionStats,
  deriveGameScore,
  derivePlayerStats,
  derivePullStats,
  deriveScoreAfterPoint,
  deriveTeamPointStats,
  perPointRate,
} from '../advancedTracking/statsUtils';
import type { AdvancedTrackedGame, PointOutcome, TrackedPoint } from '../advancedTracking/types';

// ── Test Fixtures ───────────────────────────────────────────────────────────
//
// A 4-point game between Sharks (full-roster) and Rivals (anonymous in
// single-team mode, but we add rival participants for scenario 3).
//
// Point 1: Clean offensive hold (Sharks receive, score)
// Point 2: Throwaway → opponent break (Sharks receive, Rivals score)
// Point 3: Block → short-field conversion / D-point break (Rivals receive,
//          Sharks score). Both-team tracking for this point.
// Point 4: Hockey assist + Callahan scenario (Sharks on D, Callahan score)
//
// Plus standalone fixtures for fifty-fifty and scrimmage scenarios.

const SHARKS = 'sharks';
const RIVALS = 'rivals';

// ── Point 1: Clean offensive hold ───────────────────────────────────────────

const point1: TrackedPoint = {
  id: 'pt1',
  number: 1,
  scoreStart: { [SHARKS]: 0, [RIVALS]: 0 },
  offenseStartSideId: SHARKS,
  attackingEndzoneBySide: { [SHARKS]: 'far', [RIVALS]: 'near' },
  lineups: [{ sideId: SHARKS, participantIds: ['p_alex', 'p_blair', 'p_casey'] }],
  possessions: [
    {
      id: 'pos1',
      number: 1,
      sideId: SHARKS,
      startedBy: { startType: 'pull_received', actionId: 'a1' },
      actions: [
        {
          id: 'a1',
          kind: 'pull',
          sideId: RIVALS,
          receivingSideId: SHARKS,
          puller: { refType: 'untracked' },
          receiver: { refType: 'participant', participantId: 'p_alex' },
          result: 'caught',
          hangTimeMs: 3200,
        },
        {
          id: 'a2',
          kind: 'throw',
          sideId: SHARKS,
          thrower: { refType: 'participant', participantId: 'p_alex' },
          targetSideId: SHARKS,
          targetPlayer: { refType: 'participant', participantId: 'p_blair' },
          result: 'complete',
        },
        {
          id: 'a3',
          kind: 'throw',
          sideId: SHARKS,
          thrower: { refType: 'participant', participantId: 'p_blair' },
          targetSideId: SHARKS,
          targetPlayer: { refType: 'participant', participantId: 'p_casey' },
          result: 'goal',
        },
      ],
      endedBy: { endType: 'goal', actionId: 'a3' },
    },
  ],
  outcome: {
    outcomeType: 'goal',
    scoringSideId: SHARKS,
    possessionId: 'pos1',
    actionId: 'a3',
  },
};

// ── Point 2: Throwaway → opponent break ─────────────────────────────────────

const point2: TrackedPoint = {
  id: 'pt2',
  number: 2,
  scoreStart: { [SHARKS]: 1, [RIVALS]: 0 },
  offenseStartSideId: SHARKS,
  attackingEndzoneBySide: { [SHARKS]: 'near', [RIVALS]: 'far' },
  lineups: [{ sideId: SHARKS, participantIds: ['p_alex', 'p_blair', 'p_casey'] }],
  possessions: [
    {
      id: 'pos2a',
      number: 1,
      sideId: SHARKS,
      startedBy: { startType: 'pull_pickup', actionId: 'b2' },
      actions: [
        {
          id: 'b1',
          kind: 'pull',
          sideId: RIVALS,
          receivingSideId: SHARKS,
          puller: { refType: 'untracked' },
          result: 'landed_in_bounds',
          hangTimeMs: 2800,
        },
        {
          id: 'b2',
          kind: 'disc_gain',
          sideId: SHARKS,
          player: { refType: 'participant', participantId: 'p_alex' },
          source: 'pull_pickup',
        },
        {
          id: 'b3',
          kind: 'throw',
          sideId: SHARKS,
          thrower: { refType: 'participant', participantId: 'p_alex' },
          targetSideId: SHARKS,
          result: 'throwaway',
          turnoverAttribution: {
            mode: 'single',
            player: { refType: 'participant', participantId: 'p_alex' },
          },
        },
      ],
      endedBy: { endType: 'turnover', actionId: 'b3' },
    },
    {
      id: 'pos2b',
      number: 2,
      sideId: RIVALS,
      startedBy: { startType: 'turnover', causedByActionId: 'b3' },
      actions: [
        {
          id: 'b4',
          kind: 'disc_gain',
          sideId: RIVALS,
          player: { refType: 'untracked' },
          source: 'turnover_pickup',
          causedByActionId: 'b3',
        },
        {
          id: 'b5',
          kind: 'throw',
          sideId: RIVALS,
          thrower: { refType: 'untracked' },
          targetSideId: RIVALS,
          targetPlayer: { refType: 'untracked' },
          result: 'goal',
        },
      ],
      endedBy: { endType: 'goal', actionId: 'b5' },
    },
  ],
  outcome: {
    outcomeType: 'goal',
    scoringSideId: RIVALS,
    possessionId: 'pos2b',
    actionId: 'b5',
  },
};

// ── Point 3: Block → short-field conversion (both-team) ─────────────────────

const point3: TrackedPoint = {
  id: 'pt3',
  number: 3,
  scoreStart: { [SHARKS]: 1, [RIVALS]: 1 },
  offenseStartSideId: RIVALS,
  attackingEndzoneBySide: { [SHARKS]: 'far', [RIVALS]: 'near' },
  lineups: [
    { sideId: SHARKS, participantIds: ['p_alex', 'p_blair', 'p_casey'] },
    { sideId: RIVALS, participantIds: ['p_ryan', 'p_sam', 'p_taylor'] },
  ],
  possessions: [
    {
      id: 'pos3a',
      number: 1,
      sideId: RIVALS,
      startedBy: { startType: 'pull_received', actionId: 'c1' },
      actions: [
        {
          id: 'c1',
          kind: 'pull',
          sideId: SHARKS,
          receivingSideId: RIVALS,
          puller: { refType: 'participant', participantId: 'p_alex' },
          receiver: { refType: 'participant', participantId: 'p_ryan' },
          result: 'caught',
          hangTimeMs: 4100,
        },
        {
          id: 'c2',
          kind: 'throw',
          sideId: RIVALS,
          thrower: { refType: 'participant', participantId: 'p_ryan' },
          targetSideId: RIVALS,
          targetPlayer: { refType: 'participant', participantId: 'p_sam' },
          result: 'block',
          defender: { refType: 'participant', participantId: 'p_blair' },
          turnoverAttribution: {
            mode: 'single',
            player: { refType: 'participant', participantId: 'p_ryan' },
          },
        },
      ],
      endedBy: { endType: 'turnover', actionId: 'c2' },
    },
    {
      id: 'pos3b',
      number: 2,
      sideId: SHARKS,
      startedBy: { startType: 'turnover', causedByActionId: 'c2' },
      actions: [
        {
          id: 'c3',
          kind: 'disc_gain',
          sideId: SHARKS,
          player: { refType: 'participant', participantId: 'p_blair' },
          source: 'turnover_pickup',
          causedByActionId: 'c2',
        },
        {
          id: 'c4',
          kind: 'throw',
          sideId: SHARKS,
          thrower: { refType: 'participant', participantId: 'p_blair' },
          targetSideId: SHARKS,
          targetPlayer: { refType: 'participant', participantId: 'p_casey' },
          result: 'goal',
        },
      ],
      endedBy: { endType: 'goal', actionId: 'c4' },
    },
  ],
  outcome: {
    outcomeType: 'goal',
    scoringSideId: SHARKS,
    possessionId: 'pos3b',
    actionId: 'c4',
  },
};

// ── Point 4: Hockey assist chain + Callahan ─────────────────────────────────
// Sharks pull, Rivals pass twice, then Sharks player intercepts for a Callahan.

const point4: TrackedPoint = {
  id: 'pt4',
  number: 4,
  scoreStart: { [SHARKS]: 2, [RIVALS]: 1 },
  offenseStartSideId: RIVALS,
  attackingEndzoneBySide: { [SHARKS]: 'near', [RIVALS]: 'far' },
  lineups: [
    { sideId: SHARKS, participantIds: ['p_alex', 'p_blair', 'p_casey'] },
    { sideId: RIVALS, participantIds: ['p_ryan', 'p_sam', 'p_taylor'] },
  ],
  possessions: [
    {
      id: 'pos4a',
      number: 1,
      sideId: RIVALS,
      startedBy: { startType: 'pull_received', actionId: 'd1' },
      actions: [
        {
          id: 'd1',
          kind: 'pull',
          sideId: SHARKS,
          receivingSideId: RIVALS,
          puller: { refType: 'participant', participantId: 'p_casey' },
          receiver: { refType: 'participant', participantId: 'p_taylor' },
          result: 'caught',
          hangTimeMs: 3500,
        },
        {
          id: 'd2',
          kind: 'throw',
          sideId: RIVALS,
          thrower: { refType: 'participant', participantId: 'p_taylor' },
          targetSideId: RIVALS,
          targetPlayer: { refType: 'participant', participantId: 'p_sam' },
          result: 'complete',
        },
        {
          id: 'd3',
          kind: 'throw',
          sideId: RIVALS,
          thrower: { refType: 'participant', participantId: 'p_sam' },
          targetSideId: RIVALS,
          targetPlayer: { refType: 'participant', participantId: 'p_ryan' },
          result: 'callahan',
          defender: { refType: 'participant', participantId: 'p_alex' },
        },
      ],
      endedBy: { endType: 'goal', actionId: 'd3' },
    },
  ],
  outcome: {
    outcomeType: 'goal',
    scoringSideId: SHARKS,
    possessionId: 'pos4a',
    actionId: 'd3',
  },
};

// ── Point 5: Dirty hold — Sharks turn it over then get it back ──────────────

const point5: TrackedPoint = {
  id: 'pt5',
  number: 5,
  scoreStart: { [SHARKS]: 3, [RIVALS]: 1 },
  offenseStartSideId: SHARKS,
  attackingEndzoneBySide: { [SHARKS]: 'far', [RIVALS]: 'near' },
  lineups: [{ sideId: SHARKS, participantIds: ['p_alex', 'p_blair', 'p_casey'] }],
  possessions: [
    {
      id: 'pos5a',
      number: 1,
      sideId: SHARKS,
      startedBy: { startType: 'pull_received', actionId: 'e1' },
      actions: [
        {
          id: 'e1',
          kind: 'pull',
          sideId: RIVALS,
          receivingSideId: SHARKS,
          puller: { refType: 'untracked' },
          receiver: { refType: 'participant', participantId: 'p_casey' },
          result: 'caught',
          hangTimeMs: 2500,
        },
        {
          id: 'e2',
          kind: 'throw',
          sideId: SHARKS,
          thrower: { refType: 'participant', participantId: 'p_casey' },
          targetSideId: SHARKS,
          targetPlayer: { refType: 'participant', participantId: 'p_alex' },
          result: 'drop',
        },
      ],
      endedBy: { endType: 'turnover', actionId: 'e2' },
    },
    {
      id: 'pos5b',
      number: 2,
      sideId: RIVALS,
      startedBy: { startType: 'turnover', causedByActionId: 'e2' },
      actions: [
        {
          id: 'e3',
          kind: 'disc_gain',
          sideId: RIVALS,
          player: { refType: 'untracked' },
          source: 'turnover_pickup',
          causedByActionId: 'e2',
        },
        {
          id: 'e4',
          kind: 'throw',
          sideId: RIVALS,
          thrower: { refType: 'untracked' },
          targetSideId: RIVALS,
          result: 'throwaway',
        },
      ],
      endedBy: { endType: 'turnover', actionId: 'e4' },
    },
    {
      id: 'pos5c',
      number: 3,
      sideId: SHARKS,
      startedBy: { startType: 'turnover', causedByActionId: 'e4' },
      actions: [
        {
          id: 'e5',
          kind: 'disc_gain',
          sideId: SHARKS,
          player: { refType: 'participant', participantId: 'p_blair' },
          source: 'turnover_pickup',
          causedByActionId: 'e4',
        },
        {
          id: 'e6',
          kind: 'throw',
          sideId: SHARKS,
          thrower: { refType: 'participant', participantId: 'p_blair' },
          targetSideId: SHARKS,
          targetPlayer: { refType: 'participant', participantId: 'p_alex' },
          result: 'complete',
        },
        {
          id: 'e7',
          kind: 'throw',
          sideId: SHARKS,
          thrower: { refType: 'participant', participantId: 'p_alex' },
          targetSideId: SHARKS,
          targetPlayer: { refType: 'participant', participantId: 'p_casey' },
          result: 'goal',
        },
      ],
      endedBy: { endType: 'goal', actionId: 'e7' },
    },
  ],
  outcome: {
    outcomeType: 'goal',
    scoringSideId: SHARKS,
    possessionId: 'pos5c',
    actionId: 'e7',
  },
};

// ── Full Game ───────────────────────────────────────────────────────────────

const fullGame: AdvancedTrackedGame = {
  id: 'g1',
  schemaVersion: 1,
  createdAt: 1760000000000,
  updatedAt: 1760000000000,
  trackingScope: 'both-teams',
  gameType: 'game',
  status: 'final',
  focusSideId: SHARKS,
  settings: { locationMode: 'none', scoring: { gameTo: 15, halftimeAt: 8 } },
  sides: [
    {
      id: SHARKS,
      label: 'Sharks',
      trackingMode: 'full-roster',
      sourceTeamId: 'team_sharks',
    },
    {
      id: RIVALS,
      label: 'Rivals',
      trackingMode: 'full-roster',
    },
  ],
  participants: [
    { id: 'p_alex', name: 'Alex' },
    { id: 'p_blair', name: 'Blair' },
    { id: 'p_casey', name: 'Casey' },
    { id: 'p_ryan', name: 'Ryan' },
    { id: 'p_sam', name: 'Sam' },
    { id: 'p_taylor', name: 'Taylor' },
  ],
  points: [point1, point2, point3, point4, point5],
};

// ── Fifty-fifty fixture ─────────────────────────────────────────────────────

const fiftyFiftyGame: AdvancedTrackedGame = {
  id: 'g_5050',
  schemaVersion: 1,
  createdAt: 1760000000000,
  updatedAt: 1760000000000,
  trackingScope: 'single-team',
  gameType: 'game',
  status: 'in_progress',
  focusSideId: SHARKS,
  settings: { locationMode: 'none' },
  sides: [
    { id: SHARKS, label: 'Sharks', trackingMode: 'full-roster' },
    { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
  ],
  participants: [
    { id: 'p_alex', name: 'Alex' },
    { id: 'p_blair', name: 'Blair' },
  ],
  points: [
    {
      id: 'pt_5050',
      number: 1,
      scoreStart: { [SHARKS]: 0, [RIVALS]: 0 },
      offenseStartSideId: SHARKS,
      attackingEndzoneBySide: { [SHARKS]: 'far', [RIVALS]: 'near' },
      lineups: [{ sideId: SHARKS, participantIds: ['p_alex', 'p_blair'] }],
      possessions: [
        {
          id: 'pos_5050',
          number: 1,
          sideId: SHARKS,
          startedBy: { startType: 'pull_received', actionId: 'f1' },
          actions: [
            {
              id: 'f1',
              kind: 'pull',
              sideId: RIVALS,
              receivingSideId: SHARKS,
              puller: { refType: 'untracked' },
              receiver: { refType: 'participant', participantId: 'p_alex' },
              result: 'caught',
            },
            {
              id: 'f2',
              kind: 'throw',
              sideId: SHARKS,
              thrower: { refType: 'participant', participantId: 'p_alex' },
              targetSideId: SHARKS,
              targetPlayer: {
                refType: 'participant',
                participantId: 'p_blair',
              },
              result: 'drop',
              turnoverAttribution: {
                mode: 'split',
                thrower: { refType: 'participant', participantId: 'p_alex' },
                receiver: {
                  refType: 'participant',
                  participantId: 'p_blair',
                },
              },
            },
          ],
          endedBy: { endType: 'turnover', actionId: 'f2' },
        },
      ],
      outcome: { outcomeType: 'unfinished' },
    },
  ],
};

// ── Scrimmage fixture ───────────────────────────────────────────────────────

const scrimmageGame: AdvancedTrackedGame = {
  id: 'scrim1',
  schemaVersion: 1,
  createdAt: 1760000000000,
  updatedAt: 1760000000000,
  trackingScope: 'both-teams',
  gameType: 'scrimmage',
  status: 'in_progress',
  focusSideId: 'white',
  settings: { locationMode: 'zone' },
  sides: [
    {
      id: 'white',
      label: 'White',
      trackingMode: 'full-roster',
      sourceTeamId: 'team_sharks',
    },
    {
      id: 'dark',
      label: 'Dark',
      trackingMode: 'full-roster',
      sourceTeamId: 'team_sharks',
    },
  ],
  participants: [
    { id: 'p_alex', name: 'Alex' },
    { id: 'p_blair', name: 'Blair' },
    { id: 'p_casey', name: 'Casey' },
    { id: 'p_drew', name: 'Drew' },
  ],
  points: [
    {
      id: 'sp1',
      number: 1,
      scoreStart: { white: 0, dark: 0 },
      offenseStartSideId: 'white',
      attackingEndzoneBySide: { white: 'far', dark: 'near' },
      lineups: [
        { sideId: 'white', participantIds: ['p_alex', 'p_blair'] },
        { sideId: 'dark', participantIds: ['p_casey', 'p_drew'] },
      ],
      possessions: [
        {
          id: 'spos1',
          number: 1,
          sideId: 'white',
          startedBy: { startType: 'pull_received', actionId: 'sa1' },
          actions: [
            {
              id: 'sa1',
              kind: 'pull',
              sideId: 'dark',
              receivingSideId: 'white',
              puller: { refType: 'participant', participantId: 'p_casey' },
              receiver: { refType: 'participant', participantId: 'p_alex' },
              result: 'caught',
            },
            {
              id: 'sa2',
              kind: 'throw',
              sideId: 'white',
              thrower: { refType: 'participant', participantId: 'p_alex' },
              targetSideId: 'white',
              targetPlayer: {
                refType: 'participant',
                participantId: 'p_blair',
              },
              result: 'goal',
            },
          ],
          endedBy: { endType: 'goal', actionId: 'sa2' },
        },
      ],
      outcome: {
        outcomeType: 'goal',
        scoringSideId: 'white',
        possessionId: 'spos1',
        actionId: 'sa2',
      },
    },
    // Point 2: Alex switches to dark
    {
      id: 'sp2',
      number: 2,
      scoreStart: { white: 1, dark: 0 },
      offenseStartSideId: 'dark',
      attackingEndzoneBySide: { white: 'near', dark: 'far' },
      lineups: [
        { sideId: 'white', participantIds: ['p_blair', 'p_casey'] },
        { sideId: 'dark', participantIds: ['p_alex', 'p_drew'] },
      ],
      possessions: [
        {
          id: 'spos2',
          number: 1,
          sideId: 'dark',
          startedBy: { startType: 'pull_received', actionId: 'sb1' },
          actions: [
            {
              id: 'sb1',
              kind: 'pull',
              sideId: 'white',
              receivingSideId: 'dark',
              puller: { refType: 'participant', participantId: 'p_blair' },
              receiver: { refType: 'participant', participantId: 'p_alex' },
              result: 'caught',
            },
            {
              id: 'sb2',
              kind: 'throw',
              sideId: 'dark',
              thrower: { refType: 'participant', participantId: 'p_alex' },
              targetSideId: 'dark',
              targetPlayer: {
                refType: 'participant',
                participantId: 'p_drew',
              },
              result: 'goal',
            },
          ],
          endedBy: { endType: 'goal', actionId: 'sb2' },
        },
      ],
      outcome: {
        outcomeType: 'goal',
        scoringSideId: 'dark',
        possessionId: 'spos2',
        actionId: 'sb2',
      },
    },
  ],
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('derivePlayerStats', () => {
  const stats = derivePlayerStats(fullGame);

  describe('goals', () => {
    it('Casey: 3 goals (pt1, pt3, pt5)', () => {
      expect(stats['p_casey'].goals).toBe(3);
    });

    it('Alex: 1 goal (Callahan in pt4)', () => {
      expect(stats['p_alex'].goals).toBe(1);
    });

    it('Blair: 0 goals', () => {
      expect(stats['p_blair'].goals).toBe(0);
    });
  });

  describe('assists', () => {
    it('Blair: 2 assists (pt1 goal throw, pt3 goal throw)', () => {
      expect(stats['p_blair'].assists).toBe(2);
    });

    it('Alex: 1 assist (pt5 goal throw)', () => {
      expect(stats['p_alex'].assists).toBe(1);
    });
  });

  describe('hockey assists', () => {
    it('Blair: 1 hockey assist (pt5: Blair→Alex→Casey goal)', () => {
      expect(stats['p_blair'].hockeyAssists).toBe(1);
    });

    it('Alex: 1 hockey assist (pt1: Alex→Blair→Casey goal)', () => {
      expect(stats['p_alex'].hockeyAssists).toBe(1);
    });

    it('Casey: 0 hockey assists', () => {
      expect(stats['p_casey'].hockeyAssists).toBe(0);
    });
  });

  describe('blocks', () => {
    it('Blair: 1 block (pt3)', () => {
      expect(stats['p_blair'].blocks).toBe(1);
    });

    it('Alex: 0 blocks (Callahan is not a block)', () => {
      expect(stats['p_alex'].blocks).toBe(0);
    });
  });

  describe('callahans', () => {
    it('Alex: 1 callahan (pt4)', () => {
      expect(stats['p_alex'].callahans).toBe(1);
    });

    it('Blair: 0 callahans', () => {
      expect(stats['p_blair'].callahans).toBe(0);
    });
  });

  describe('completions', () => {
    // pt1: Alex 1 (a2), Blair 1 (a3 goal)
    // pt2: none for Sharks (throwaway)
    // pt3: Blair 1 (c4 goal)
    // pt4: Taylor 1 (d2), Sam 0 (d3 callahan = not a completion for Sam)
    // pt5: Blair 1 (e6), Alex 1 (e7 goal)
    it('Alex: 2 completions (pt1 pass + pt5 goal throw)', () => {
      expect(stats['p_alex'].completions).toBe(2);
    });

    it('Blair: 3 completions (pt1 goal, pt3 goal, pt5 pass)', () => {
      expect(stats['p_blair'].completions).toBe(3);
    });

    it('Taylor: 1 completion (pt4 pass to Sam)', () => {
      expect(stats['p_taylor'].completions).toBe(1);
    });
  });

  describe('throwaways', () => {
    it('Alex: 1 throwaway (pt2)', () => {
      expect(stats['p_alex'].throwaways).toBe(1);
    });
  });

  describe('drops', () => {
    it('Alex: 1 drop (pt5 e2)', () => {
      expect(stats['p_alex'].drops).toBe(1);
    });
  });

  describe('touches', () => {
    // Alex: pt1 pull catch (1), pt2 disc_gain (1), pt3 (0 — pulls but that's
    //       not a touch for puller), pt4 callahan (1), pt5 receive (1)
    it('Alex: 4 touches', () => {
      expect(stats['p_alex'].touches).toBe(4);
    });

    it('receivingTouches counts only receptions, not disc_gains via pickup', () => {
      // Alex: pt1 pull catch (1), pt4 callahan (1), pt5 complete receive (1) = 3
      // disc_gain in pt2 is a pickup, not a receiving touch
      expect(stats['p_alex'].receivingTouches).toBe(3);
    });
  });

  describe('points played', () => {
    it('Alex: 5 points played (in every point lineup)', () => {
      expect(stats['p_alex'].pointsPlayed).toBe(5);
    });

    it('Ryan: 2 points played (pt3, pt4)', () => {
      expect(stats['p_ryan'].pointsPlayed).toBe(2);
    });
  });

  describe('plus/minus', () => {
    // Alex on Sharks: pt1 +1, pt2 -1, pt3 +1, pt4 +1, pt5 +1 = +3
    it('Alex: +3', () => {
      expect(stats['p_alex'].plusMinus).toBe(3);
    });

    // Ryan on Rivals: pt3 -1, pt4 -1 = -2
    it('Ryan: -2', () => {
      expect(stats['p_ryan'].plusMinus).toBe(-2);
    });
  });
});

describe('completionPercentage', () => {
  const stats = derivePlayerStats(fullGame);

  it('returns completions / (completions + throwaways + drops + halfThrowaways)', () => {
    // Alex: 2 completions, 1 throwaway, 1 drop, 0 half = 2/4 = 0.5
    expect(completionPercentage(stats['p_alex'])).toBe(0.5);
  });

  it('returns null for player with 0 throw attempts', () => {
    // Casey never throws in this game
    expect(completionPercentage(stats['p_casey'])).toBeNull();
  });

  it('returns 1.0 for a perfect thrower', () => {
    // Blair: 3 completions, 0 turnovers
    expect(completionPercentage(stats['p_blair'])).toBe(1.0);
  });
});

describe('perPointRate', () => {
  const stats = derivePlayerStats(fullGame);

  it('goals per point for Casey: 3/5 = 0.6', () => {
    expect(perPointRate(stats['p_casey'].goals, stats['p_casey'].pointsPlayed)).toBeCloseTo(0.6);
  });

  it('assists per point for Blair: 2/5 = 0.4', () => {
    expect(perPointRate(stats['p_blair'].assists, stats['p_blair'].pointsPlayed)).toBeCloseTo(0.4);
  });

  it('returns null when pointsPlayed is 0', () => {
    expect(perPointRate(0, 0)).toBeNull();
  });
});

describe('deriveConnectionStats', () => {
  const connections = deriveConnectionStats(fullGame);

  it('finds the Alex→Blair connection', () => {
    const conn = connections.find((c) => c.throwerId === 'p_alex' && c.receiverId === 'p_blair');
    expect(conn).toBeDefined();
    // pt1 a2: complete, pt5 e6 is Blair→Alex not Alex→Blair
    expect(conn!.completions).toBe(1);
    expect(conn!.goals).toBe(0);
    expect(conn!.attempts).toBe(1);
  });

  it('finds Blair→Casey with 2 goal completions', () => {
    const conn = connections.find((c) => c.throwerId === 'p_blair' && c.receiverId === 'p_casey');
    expect(conn).toBeDefined();
    // pt1 a3: goal, pt3 c4: goal
    expect(conn!.completions).toBe(2);
    expect(conn!.goals).toBe(2);
    expect(conn!.attempts).toBe(2);
  });

  it('tracks turnovers in connections', () => {
    // pt3 c2: Ryan→Sam block
    const conn = connections.find((c) => c.throwerId === 'p_ryan' && c.receiverId === 'p_sam');
    expect(conn).toBeDefined();
    expect(conn!.turnovers).toBe(1);
    expect(conn!.completions).toBe(0);
  });

  it('excludes connections where targetPlayer is missing', () => {
    // pt2 b3: Alex throwaway with no target
    const alexNoTarget = connections.filter((c) => c.throwerId === 'p_alex' && c.attempts === 0);
    expect(alexNoTarget).toHaveLength(0);
  });
});

describe('deriveTeamPointStats', () => {
  describe('Sharks', () => {
    const teamStats = deriveTeamPointStats(SHARKS, fullGame.points);

    it('O-points: 3 (pt1, pt2, pt5)', () => {
      expect(teamStats.oPoints).toBe(3);
    });

    it('D-points: 2 (pt3, pt4)', () => {
      expect(teamStats.dPoints).toBe(2);
    });

    it('holds: 2 (pt1, pt5)', () => {
      expect(teamStats.holds).toBe(2);
    });

    it('clean holds: 1 (pt1 only — pt5 had turnovers)', () => {
      expect(teamStats.cleanHolds).toBe(1);
    });

    it('dirty holds: 1 (pt5)', () => {
      expect(teamStats.dirtyHolds).toBe(1);
    });

    it('breaks: 2 (pt3, pt4)', () => {
      expect(teamStats.breaks).toBe(2);
    });

    it('times broken: 1 (pt2)', () => {
      expect(teamStats.timesBroken).toBe(1);
    });

    it('O-efficiency: 2/3', () => {
      expect(teamStats.oEfficiency).toBeCloseTo(2 / 3);
    });

    it('D-efficiency (breaks / dPoints): 2/2 = 1.0', () => {
      expect(teamStats.dEfficiency).toBe(1.0);
    });

    it('scores after turnovers: 2 (pt3 break + pt5 dirty hold)', () => {
      expect(teamStats.scoresAfterTurnovers).toBe(2);
    });

    it('possessions per point', () => {
      // 5 points, total possessions: 1 + 2 + 2 + 1 + 3 = 9
      // all 5 are finished, so 9/5 = 1.8
      expect(teamStats.possessionsPerPoint).toBeCloseTo(1.8);
    });
  });

  describe('Rivals', () => {
    const teamStats = deriveTeamPointStats(RIVALS, fullGame.points);

    it('O-points: 2 (pt3, pt4)', () => {
      expect(teamStats.oPoints).toBe(2);
    });

    it('D-points: 3 (pt1, pt2, pt5)', () => {
      expect(teamStats.dPoints).toBe(3);
    });

    it('holds: 0', () => {
      expect(teamStats.holds).toBe(0);
    });

    it('breaks: 1 (pt2)', () => {
      expect(teamStats.breaks).toBe(1);
    });

    it('times broken: 2 (pt3, pt4)', () => {
      expect(teamStats.timesBroken).toBe(2);
    });

    it('scores after turnovers: 1 (pt2 — scored after Sharks throwaway)', () => {
      expect(teamStats.scoresAfterTurnovers).toBe(1);
    });
  });
});

describe('derivePullStats', () => {
  describe('Sharks pulls (pt3, pt4)', () => {
    const pullStats = derivePullStats(SHARKS, fullGame.points);

    it('total: 2', () => {
      expect(pullStats.total).toBe(2);
    });

    it('all caught', () => {
      expect(pullStats.caught).toBe(2);
    });

    it('average hang time', () => {
      // pt3: 4100ms, pt4: 3500ms → avg 3800
      expect(pullStats.averageHangTimeMs).toBe(3800);
    });
  });

  describe('Rivals pulls (pt1, pt2, pt5)', () => {
    const pullStats = derivePullStats(RIVALS, fullGame.points);

    it('total: 3', () => {
      expect(pullStats.total).toBe(3);
    });

    it('caught: 2 (pt1, pt5)', () => {
      expect(pullStats.caught).toBe(2);
    });

    it('landed_in_bounds: 1 (pt2)', () => {
      expect(pullStats.landedInBounds).toBe(1);
    });

    it('average hang time from 3 pulls with data', () => {
      // 3200 + 2800 + 2500 = 8500 / 3 = 2833.33
      expect(pullStats.averageHangTimeMs).toBeCloseTo(8500 / 3);
    });

    it('no bricks', () => {
      expect(pullStats.bricked).toBe(0);
    });
  });
});

describe('deriveScoreAfterPoint', () => {
  it('point 1: 1-0', () => {
    expect(deriveScoreAfterPoint(point1)).toEqual({ sharks: 1, rivals: 0 });
  });

  it('point 2: 1-1', () => {
    expect(deriveScoreAfterPoint(point2)).toEqual({ sharks: 1, rivals: 1 });
  });

  it('point 3: 2-1', () => {
    expect(deriveScoreAfterPoint(point3)).toEqual({ sharks: 2, rivals: 1 });
  });

  it('unfinished point has no score change', () => {
    expect(deriveScoreAfterPoint(fiftyFiftyGame.points[0])).toEqual({
      sharks: 0,
      rivals: 0,
    });
  });
});

describe('deriveGameScore', () => {
  it('full game: Sharks 4, Rivals 1', () => {
    expect(deriveGameScore(fullGame)).toEqual({ sharks: 4, rivals: 1 });
  });

  it('scrimmage game: white 1, dark 1', () => {
    expect(deriveGameScore(scrimmageGame)).toEqual({ white: 1, dark: 1 });
  });
});

describe('fifty-fifty turnovers', () => {
  const stats = derivePlayerStats(fiftyFiftyGame);

  it('Alex gets halfThrowaways but no full throwaway', () => {
    expect(stats['p_alex'].halfThrowaways).toBe(1);
    expect(stats['p_alex'].throwaways).toBe(0);
  });

  it('Blair gets halfDrops but no full drop', () => {
    expect(stats['p_blair'].halfDrops).toBe(1);
    expect(stats['p_blair'].drops).toBe(0);
  });
});

describe('scrimmage: participant side-switching', () => {
  const stats = derivePlayerStats(scrimmageGame);

  it('Alex plays 2 points (one on each side)', () => {
    expect(stats['p_alex'].pointsPlayed).toBe(2);
  });

  it('Alex gets 2 assists (scored on both sides)', () => {
    expect(stats['p_alex'].assists).toBe(2);
  });

  it('Alex plusMinus is +2 after scoring on the successful side in both points', () => {
    // pt1: on white, white scores → +1
    // pt2: on dark, dark scores → +1
    // Net for Alex: +1 +1 = +2
    expect(stats['p_alex'].plusMinus).toBe(2);
  });

  it('Casey plusMinus: pt1 on dark (-1), pt2 on white (-1) = -2', () => {
    expect(stats['p_casey'].plusMinus).toBe(-2);
  });

  it('Blair gets 1 goal (pt1) and 0 assists', () => {
    expect(stats['p_blair'].goals).toBe(1);
    expect(stats['p_blair'].assists).toBe(0);
  });

  it('Drew gets 1 goal (pt2)', () => {
    expect(stats['p_drew'].goals).toBe(1);
  });
});

describe('model invariants', () => {
  it('sides in same point attack opposite endzones', () => {
    for (const point of fullGame.points) {
      const values = Object.values(point.attackingEndzoneBySide);
      if (values.length === 2) {
        expect(new Set(values).size).toBe(2);
      }
    }
  });

  it('goal outcome references valid possession and action', () => {
    for (const point of fullGame.points) {
      if (point.outcome.outcomeType !== 'goal') continue;
      const goalOutcome = point.outcome as Extract<PointOutcome, { outcomeType: 'goal' }>;
      const pos = point.possessions.find((p) => p.id === goalOutcome.possessionId);
      expect(pos).toBeDefined();
      const action = pos!.actions.find((a) => a.id === goalOutcome.actionId);
      expect(action).toBeDefined();
    }
  });

  it('endedBy references an action within its possession', () => {
    for (const point of fullGame.points) {
      for (const pos of point.possessions) {
        if (pos.endedBy.endType === 'goal' || pos.endedBy.endType === 'turnover') {
          const endedBy = pos.endedBy as { actionId: string };
          expect(pos.actions.some((a) => a.id === endedBy.actionId)).toBe(true);
        }
      }
    }
  });

  it('turnover startedBy references an action in a prior possession', () => {
    for (const point of fullGame.points) {
      for (let i = 0; i < point.possessions.length; i++) {
        const pos = point.possessions[i];
        if (pos.startedBy.startType !== 'turnover') continue;
        const causedById = pos.startedBy.causedByActionId;
        const found = point.possessions
          .slice(0, i)
          .some((prev) => prev.actions.some((a) => a.id === causedById));
        expect(found).toBe(true);
      }
    }
  });
});
