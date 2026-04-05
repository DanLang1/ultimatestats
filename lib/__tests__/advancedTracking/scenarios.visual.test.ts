import type { AdvancedTrackedGame } from '../../advancedTracking/types';
import { formatGame } from './formatGame';

// mostly visual tests to verify output
// npx jest advancedTracking/scenarios --verbose --no-coverage

// ── Shared participants ──────────────────────────────────────────────────────

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
const max = { refType: 'participant' as const, participantId: 'p_max' };
const sam = { refType: 'participant' as const, participantId: 'p_sam' };
const untracked = { refType: 'untracked' as const };

// ── Scenario 1: Clean hold ───────────────────────────────────────────────────

it('scenario: clean hold — Zoo receive, 3 passes, goal', () => {
  const game: AdvancedTrackedGame = {
    id: 'g1',
    schemaVersion: 1,
    createdAt: 1760000000000,
    updatedAt: 1760000000000,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: ZOO,
    initialReceivingSideId: ZOO,
    settings: {
      locationMode: 'none',
      format: { formatType: 'standard', gameTo: 15, halftimeAt: 8 },
    },
    sides: [
      { id: ZOO, label: 'Zoo', trackingMode: 'full-roster', sourceTeamId: 'team_zoo' },
      { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants,
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
                result: 'caught',
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
                toPlayer: max,
                result: 'goal',
              },
            ],
          },
        ],
      },
    ],
  };

  console.log('\n\n=== FORMATTED ===\n');
  console.log(formatGame(game));
  console.log('\n=== RAW JSON: Scenario 1 — Clean hold ===\n');
  console.log(JSON.stringify(game));
});

// ── Scenario 2: Dirty hold ───────────────────────────────────────────────────
//
// Zoo on O, receives pull, has a turnover mid-point, gets it back via a block,
// then scores. A hold — but dirty.

it('scenario: dirty hold — Zoo receive, throwaway, block, Zoo scores', () => {
  const game: AdvancedTrackedGame = {
    id: 'g2',
    schemaVersion: 1,
    createdAt: 1760000000000,
    updatedAt: 1760000000000,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: ZOO,
    initialReceivingSideId: ZOO,
    settings: {
      locationMode: 'none',
      format: { formatType: 'standard', gameTo: 15, halftimeAt: 8 },
    },
    sides: [
      { id: ZOO, label: 'Zoo', trackingMode: 'full-roster', sourceTeamId: 'team_zoo' },
      { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants,
    points: [
      {
        id: 'pt2',
        lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
        possessions: [
          // Zoo first possession — ends with Meves throwaway
          {
            id: 'pos2a',
            sideId: ZOO,
            actions: [
              {
                id: 'b1',
                kind: 'pull',
                sideId: RIVALS,
                receivingSideId: ZOO,
                puller: untracked,
                receiver: august,
                result: 'caught',
              },
              {
                id: 'b2',
                kind: 'throw',
                sideId: ZOO,
                thrower: august,
                toPlayer: meves,
                result: 'complete',
              },
              {
                id: 'b3',
                kind: 'throw',
                sideId: ZOO,
                thrower: meves,
                result: 'throwaway',
              },
            ],
          },
          // Rivals possession — ends with Joah getting a block
          {
            id: 'pos2b',
            sideId: RIVALS,
            actions: [
              {
                id: 'b4',
                kind: 'disc_pickup',
                sideId: RIVALS,
                player: untracked,
              },
              {
                id: 'b5',
                kind: 'throw',
                sideId: RIVALS,
                thrower: untracked,
                result: 'block',
                defender: joah,
              },
            ],
          },
          // Zoo second possession — scores
          {
            id: 'pos2c',
            sideId: ZOO,
            actions: [
              {
                id: 'b6',
                kind: 'disc_pickup',
                sideId: ZOO,
                player: joah,
              },
              {
                id: 'b7',
                kind: 'throw',
                sideId: ZOO,
                thrower: joah,
                toPlayer: august,
                result: 'complete',
              },
              {
                id: 'b8',
                kind: 'throw',
                sideId: ZOO,
                thrower: august,
                toPlayer: max,
                result: 'goal',
              },
            ],
          },
        ],
      },
    ],
  };

  console.log('\n\n=== FORMATTED ===\n');
  console.log(formatGame(game));
  console.log('\n=== RAW JSON: Scenario 2 — Dirty hold ===\n');
  console.log(JSON.stringify(game));
});

// ── Scenario 3: Break ────────────────────────────────────────────────────────
//
// Zoo on D, pulls to Rivals. Rivals possess and work it up the field.
// Meves gets a block. Zoo converts the short field for a break.

it('scenario: break — Zoo pull, Rivals possess, Meves block, Zoo scores', () => {
  const game: AdvancedTrackedGame = {
    id: 'g3',
    schemaVersion: 1,
    createdAt: 1760000000000,
    updatedAt: 1760000000000,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: ZOO,
    initialReceivingSideId: ZOO,
    settings: {
      locationMode: 'none',
      format: { formatType: 'standard', gameTo: 15, halftimeAt: 8 },
    },
    sides: [
      { id: ZOO, label: 'Zoo', trackingMode: 'full-roster', sourceTeamId: 'team_zoo' },
      { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants,
    points: [
      {
        id: 'pt3',
        lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
        possessions: [
          // Rivals first possession — ends with Meves block
          {
            id: 'pos3a',
            sideId: RIVALS,
            actions: [
              {
                id: 'c1',
                kind: 'pull',
                sideId: ZOO,
                receivingSideId: RIVALS,
                puller: august,
                receiver: untracked,
                result: 'caught',
              },
              {
                id: 'c2',
                kind: 'throw',
                sideId: RIVALS,
                thrower: untracked,
                toPlayer: untracked,
                result: 'complete',
              },
              {
                id: 'c3',
                kind: 'throw',
                sideId: RIVALS,
                thrower: untracked,
                result: 'block',
                defender: meves,
              },
            ],
          },
          // Zoo possession after the block — converts for the break
          {
            id: 'pos3b',
            sideId: ZOO,
            actions: [
              {
                id: 'c4',
                kind: 'disc_pickup',
                sideId: ZOO,
                player: meves,
              },
              {
                id: 'c5',
                kind: 'throw',
                sideId: ZOO,
                thrower: meves,
                toPlayer: joah,
                result: 'complete',
              },
              {
                id: 'c6',
                kind: 'throw',
                sideId: ZOO,
                thrower: joah,
                toPlayer: max,
                result: 'goal',
              },
            ],
          },
        ],
      },
    ],
  };

  console.log('\n\n=== FORMATTED ===\n');
  console.log(formatGame(game));
  console.log('\n=== RAW JSON: Scenario 3 — Break ===\n');
  console.log(JSON.stringify(game));
});

// ── Scenario 4: Callahan ─────────────────────────────────────────────────────
//
// Zoo on D, pulls to Rivals. Rivals work toward the endzone.
// Max catches a Rivals throw in the endzone — Callahan, Zoo scores.
// Notable: Zoo never holds a possession during this point.

it('scenario: callahan — Zoo D, Rivals in endzone, Max catches Callahan', () => {
  const game: AdvancedTrackedGame = {
    id: 'g4',
    schemaVersion: 1,
    createdAt: 1760000000000,
    updatedAt: 1760000000000,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: ZOO,
    initialReceivingSideId: ZOO,
    settings: {
      locationMode: 'none',
      format: { formatType: 'standard', gameTo: 15, halftimeAt: 8 },
    },
    sides: [
      { id: ZOO, label: 'Zoo', trackingMode: 'full-roster', sourceTeamId: 'team_zoo' },
      { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants,
    points: [
      {
        id: 'pt4',
        lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
        possessions: [
          // Rivals' entire possession — ends when Max catches the Callahan
          {
            id: 'pos4a',
            sideId: RIVALS,
            actions: [
              {
                id: 'd1',
                kind: 'pull',
                sideId: ZOO,
                receivingSideId: RIVALS,
                puller: joah,
                receiver: untracked,
                result: 'caught',
              },
              {
                id: 'd2',
                kind: 'throw',
                sideId: RIVALS,
                thrower: untracked,
                toPlayer: untracked,
                result: 'complete',
              },
              {
                // Rivals throw into the endzone — Max catches it for the Callahan.
                // but result is 'callahan' and defender is the Zoo player who caught it.
                id: 'd3',
                kind: 'throw',
                sideId: RIVALS,
                thrower: untracked,
                defender: max,
                result: 'callahan',
              },
            ],
          },
        ],
      },
    ],
  };

  console.log('\n\n=== FORMATTED ===\n');
  console.log(formatGame(game));
  console.log('\n=== RAW JSON: Scenario 4 — Callahan ===\n');
  console.log(JSON.stringify(game));
});
// ── Scenario 5: Full game — every field ─────────────────────────────────────
//
// Both teams tracked. Covers every action kind, turnover attribution modes,
// stoppage + dead disc check, hang time, halftime, soft cap, timeout,
// spirit timeout, callahan, metadata, colorToken, endReason.
//
// Game to 7, halftime at 4, soft cap at 6.
// Zoo receives to start (coin flip).
//
// Point 1: Zoo O  — clean hold
// Point 2: Rivals O — stoppage+dead disc, split drop, Zoo throwaway, Rivals score; Zoo timeout after
// ── HALFTIME (1-1) ──
// Point 3: Zoo D  — Meves block, Zoo converts break; spirit timeout after
// ── SOFT CAP (2-1) ──
// Point 4: Rivals O — Zoo callahan, game over

it('scenario: full game — both teams tracked, every field', () => {
  const allParticipants = [
    ...participants,
    { id: 'p_ryan', name: 'Ryan' },
    { id: 'p_sam', name: 'Sam' },
    { id: 'p_taylor', name: 'Taylor' },
  ];

  const ryan = { refType: 'participant' as const, participantId: 'p_ryan' };
  const sam = { refType: 'participant' as const, participantId: 'p_sam' };
  const taylor = { refType: 'participant' as const, participantId: 'p_taylor' };

  const game: AdvancedTrackedGame = {
    id: 'g_complex',
    schemaVersion: 1,
    createdAt: 1760000000000,
    updatedAt: 1760000000000,
    gameType: 'game',
    status: 'final',
    focusSideId: ZOO,
    initialReceivingSideId: ZOO,
    metadata: {
      title: 'Zoo vs Rivals — Finals',
      location: 'Main Field',
      date: '2026-04-01',
      notes: 'Windy conditions',
    },
    settings: {
      locationMode: 'none',
      format: { formatType: 'standard', gameTo: 7, halftimeAt: 4, softCapAt: 6 },
    },
    sides: [
      {
        id: ZOO,
        label: 'Zoo',
        trackingMode: 'full-roster',
        sourceTeamId: 'team_zoo',
        colorToken: 'blue',
      },
      { id: RIVALS, label: 'Rivals', trackingMode: 'full-roster', colorToken: 'red' },
    ],
    participants: allParticipants,
    gameTransitions: [
      { id: 'gt1', transitionType: 'halftime', afterPointId: 'pt2' },
      { id: 'gt2', transitionType: 'soft_cap', afterPointId: 'pt3' },
    ],
    points: [
      // ── Point 1 ── Zoo O, clean hold ────────────────────────────────────────
      {
        id: 'pt1',
        lines: [
          { sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] },
          { sideId: RIVALS, participantIds: ['p_ryan', 'p_sam', 'p_taylor'] },
        ],
        possessions: [
          {
            id: 'pos1a',
            sideId: ZOO,
            actions: [
              {
                id: 'a1',
                kind: 'pull',
                sideId: RIVALS,
                receivingSideId: ZOO,
                puller: ryan,
                receiver: meves,
                result: 'caught',
                hangTimeMs: 2100,
              },
              {
                id: 'a2',
                kind: 'throw',
                sideId: ZOO,
                thrower: meves,
                toPlayer: joah,
                result: 'complete',
              },
              {
                id: 'a3',
                kind: 'throw',
                sideId: ZOO,
                thrower: joah,
                toPlayer: max,
                result: 'complete',
              },
              {
                id: 'a4',
                kind: 'throw',
                sideId: ZOO,
                thrower: max,
                toPlayer: august,
                result: 'goal',
              },
            ],
          },
        ],
      },

      // ── Point 2 ── Rivals O, break ──────────────────────────────────────────
      // Pull caught, injury stoppage, dead disc check resumes, split drop,
      // Zoo throwaway, Rivals score. Zoo calls timeout after.
      {
        id: 'pt2',
        lines: [
          { sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] },
          { sideId: RIVALS, participantIds: ['p_ryan', 'p_sam', 'p_taylor'] },
        ],
        possessions: [
          // Rivals possess, pull caught, then injury stoppage ends the possession
          {
            id: 'pos2a',
            sideId: RIVALS,
            actions: [
              {
                id: 'b1',
                kind: 'pull',
                sideId: ZOO,
                receivingSideId: RIVALS,
                puller: august,
                receiver: ryan,
                result: 'caught',
                hangTimeMs: 1950,
              },
              {
                id: 'b2',
                kind: 'throw',
                sideId: RIVALS,
                thrower: ryan,
                toPlayer: sam,
                result: 'complete',
              },
              { id: 'b3', kind: 'stoppage', reason: 'injury', sideId: RIVALS },
            ],
          },
          // Play resumes from dead disc check — Sam drops with split attribution
          {
            id: 'pos2b',
            sideId: RIVALS,
            actions: [
              {
                id: 'b4',
                kind: 'disc_pickup',
                sideId: RIVALS,
                player: sam,
              },
              {
                id: 'b5',
                kind: 'throw',
                sideId: RIVALS,
                thrower: sam,
                toPlayer: taylor,
                result: 'drop',
                splitAttribution: true,
              },
            ],
          },
          // Zoo pick up — Joah throwaway
          {
            id: 'pos2c',
            sideId: ZOO,
            actions: [
              {
                id: 'b6',
                kind: 'disc_pickup',
                sideId: ZOO,
                player: joah,
              },
              {
                id: 'b7',
                kind: 'throw',
                sideId: ZOO,
                thrower: joah,
                result: 'throwaway',
              },
            ],
          },
          // Rivals pick up and score
          {
            id: 'pos2d',
            sideId: RIVALS,
            actions: [
              {
                id: 'b8',
                kind: 'disc_pickup',
                sideId: RIVALS,
                player: ryan,
              },
              {
                id: 'b9',
                kind: 'throw',
                sideId: RIVALS,
                thrower: ryan,
                toPlayer: taylor,
                result: 'complete',
              },
              {
                id: 'b10',
                kind: 'throw',
                sideId: RIVALS,
                thrower: taylor,
                toPlayer: sam,
                result: 'goal',
              },
            ],
          },
        ],
        transitionsAfter: [{ id: 'tr1', transitionType: 'timeout', sideId: ZOO }],
      },

      // ── HALFTIME fires here (gt1) ────────────────────────────────────────────

      // ── Point 3 ── Zoo D, break ─────────────────────────────────────────────
      // Rivals receive after halftime. Meves gets a block, Zoo converts.
      // Spirit timeout after.
      {
        id: 'pt3',
        lines: [
          { sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] },
          { sideId: RIVALS, participantIds: ['p_ryan', 'p_sam', 'p_taylor'] },
        ],
        possessions: [
          {
            id: 'pos3a',
            sideId: RIVALS,
            actions: [
              {
                id: 'c1',
                kind: 'pull',
                sideId: ZOO,
                receivingSideId: RIVALS,
                puller: joah,
                receiver: sam,
                result: 'caught',
                hangTimeMs: 2300,
              },
              {
                id: 'c2',
                kind: 'throw',
                sideId: RIVALS,
                thrower: sam,
                toPlayer: ryan,
                result: 'complete',
              },
              {
                id: 'c3',
                kind: 'throw',
                sideId: RIVALS,
                thrower: ryan,
                result: 'block',
                defender: meves,
              },
            ],
          },
          {
            id: 'pos3b',
            sideId: ZOO,
            actions: [
              {
                id: 'c4',
                kind: 'disc_pickup',
                sideId: ZOO,
                player: meves,
              },
              {
                id: 'c5',
                kind: 'throw',
                sideId: ZOO,
                thrower: meves,
                toPlayer: august,
                result: 'complete',
              },
              {
                id: 'c6',
                kind: 'throw',
                sideId: ZOO,
                thrower: august,
                toPlayer: max,
                result: 'goal',
              },
            ],
          },
        ],
        transitionsAfter: [{ id: 'tr2', transitionType: 'spirit_timeout' }],
      },

      // ── SOFT CAP fires here (gt2) ────────────────────────────────────────────

      // ── Point 4 ── Rivals O, Zoo callahan, game over ─────────────────────────
      // Rivals receive (Zoo scored last). Ryan throws into endzone — Max catches it.
      // Zoo scored despite the disc being in Rivals' possession.
      {
        id: 'pt4',
        lines: [
          { sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] },
          { sideId: RIVALS, participantIds: ['p_ryan', 'p_sam', 'p_taylor'] },
        ],
        possessions: [
          {
            id: 'pos4a',
            sideId: RIVALS,
            actions: [
              {
                id: 'd1',
                kind: 'pull',
                sideId: ZOO,
                receivingSideId: RIVALS,
                puller: august,
                receiver: taylor,
                result: 'caught',
                hangTimeMs: 2050,
              },
              {
                id: 'd2',
                kind: 'throw',
                sideId: RIVALS,
                thrower: taylor,
                toPlayer: ryan,
                result: 'complete',
              },
              {
                id: 'd3',
                kind: 'throw',
                sideId: RIVALS,
                thrower: ryan,
                defender: max,
                result: 'callahan',
              },
            ],
          },
        ],
      },
    ],
  };

  console.log('\n\n=== FORMATTED ===\n');
  console.log(formatGame(game));
  console.log('\n=== RAW JSON: Scenario 5 — Full game, both teams tracked ===\n');
  console.log(JSON.stringify(game));
});

// ── Scenario 6: Block — disc hits ground, different player picks up ───────────
// Zoo pulls. Rivals possess. August gets a block (disc hits ground).
// Joah (not August) picks it up and Zoo scores.

test('scenario: block — disc hits ground, different player picks up', () => {
  const game: AdvancedTrackedGame = {
    id: 'game-block',
    schemaVersion: 1,
    createdAt: 0,
    updatedAt: 0,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: ZOO,
    settings: { locationMode: 'none' },
    initialReceivingSideId: RIVALS,
    sides: [
      { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
      { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants,
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
                id: 'e1',
                kind: 'pull',
                sideId: ZOO,
                receivingSideId: RIVALS,
                puller: august,
                receiver: untracked,
                result: 'caught',
              },
              {
                id: 'e2',
                kind: 'throw',
                sideId: RIVALS,
                thrower: untracked,
                result: 'block',
                defender: august,
              },
            ],
          },
          // Joah (not August) picks up the disc — block and pickup are separate players
          {
            id: 'pos1b',
            sideId: ZOO,
            actions: [
              {
                id: 'e3',
                kind: 'disc_pickup',
                sideId: ZOO,
                player: joah,
              },
              {
                id: 'e4',
                kind: 'throw',
                sideId: ZOO,
                thrower: joah,
                toPlayer: meves,
                result: 'complete',
              },
              {
                id: 'e5',
                kind: 'throw',
                sideId: ZOO,
                thrower: meves,
                toPlayer: max,
                result: 'goal',
              },
            ],
          },
        ],
      },
    ],
  };

  console.log('\n\n=== FORMATTED ===\n');
  console.log(formatGame(game));
  console.log('\n=== RAW JSON: Scenario 6 — Block, different player picks up ===\n');
  console.log(JSON.stringify(game));
});

// ── Scenario 7: Interception — defender catches in air, throws immediately ────
// Zoo pulls. Rivals possess. Meves intercepts (catches in air).
// Meves immediately becomes the thrower — no disc_gain needed.

test('scenario: interception — defender catches in air, becomes thrower', () => {
  const game: AdvancedTrackedGame = {
    id: 'game-interception',
    schemaVersion: 1,
    createdAt: 0,
    updatedAt: 0,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: ZOO,
    settings: { locationMode: 'none' },
    initialReceivingSideId: RIVALS,
    sides: [
      { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
      { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants,
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
                id: 'f1',
                kind: 'pull',
                sideId: ZOO,
                receivingSideId: RIVALS,
                puller: august,
                receiver: untracked,
                result: 'caught',
              },
              {
                id: 'f2',
                kind: 'throw',
                sideId: RIVALS,
                thrower: untracked,
                result: 'interception',
                defender: meves,
              },
            ],
          },
          // Meves caught it in the air — she IS the first thrower, no disc_gain needed
          {
            id: 'pos1b',
            sideId: ZOO,
            actions: [
              {
                id: 'f3',
                kind: 'throw',
                sideId: ZOO,
                thrower: meves,
                toPlayer: joah,
                result: 'complete',
              },
              {
                id: 'f4',
                kind: 'throw',
                sideId: ZOO,
                thrower: joah,
                toPlayer: max,
                result: 'goal',
              },
            ],
          },
        ],
      },
    ],
  };

  console.log('\n\n=== FORMATTED ===\n');
  console.log(formatGame(game));
  console.log('\n=== RAW JSON: Scenario 7 — Interception, defender becomes thrower ===\n');
  console.log(JSON.stringify(game));
});

// ── Scenario 8: Injury sub — injured player OFF the disc, play resumes same possession ──
// Zoo O. August gets injured mid-possession (not disc-related).
// Sam subs in from the bench. Play resumes — Meves still has the disc and continues throwing.

test('scenario: injury sub — player off disc, play resumes in same possession', () => {
  const game: AdvancedTrackedGame = {
    id: 'game-injury-off-disc',
    schemaVersion: 1,
    createdAt: 0,
    updatedAt: 0,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: ZOO,
    settings: { locationMode: 'none' },
    initialReceivingSideId: ZOO,
    sides: [
      { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
      { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants,
    points: [
      {
        id: 'pt1',
        lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
        // August (p_august) injured off the disc — Sam (p_sam) subs in from the bench
        subs: [
          {
            id: 'sub1',
            sideId: ZOO,
            type: 'injury',
            inIds: ['p_sam'],
            outIds: ['p_august'],
            stoppageActionId: 'g3',
          },
        ],
        possessions: [
          {
            id: 'pos1a',
            sideId: ZOO,
            actions: [
              {
                id: 'g1',
                kind: 'pull',
                sideId: RIVALS,
                receivingSideId: ZOO,
                puller: untracked,
                receiver: august,
                result: 'caught',
              },
              {
                id: 'g2',
                kind: 'throw',
                sideId: ZOO,
                thrower: august,
                toPlayer: meves,
                result: 'complete',
              },
              // August goes down injured off the disc — Meves still has it
              {
                id: 'g3',
                kind: 'stoppage',
                reason: 'injury',
                sideId: ZOO,
              },
              // Joah subs in for August, play resumes — Meves still has the disc,
              // no disc_gain needed, same possession continues
              {
                id: 'g4',
                kind: 'throw',
                sideId: ZOO,
                thrower: meves,
                toPlayer: max,
                result: 'goal',
              },
            ],
          },
        ],
      },
    ],
  };

  console.log('\n\n=== FORMATTED ===\n');
  console.log(formatGame(game));
  console.log('\n=== RAW JSON: Scenario 8 — Injury sub, player off disc ===\n');
  console.log(JSON.stringify(game));
});

// ── Scenario 9: Injury sub — injured player HAS the disc, new player takes possession ──
// Zoo O. Meves has the disc and gets injured.
// Sam subs in from the bench, picks up the disc as a dead_disc_check and continues.

test('scenario: injury sub — player with disc injured, new player takes possession', () => {
  const game: AdvancedTrackedGame = {
    id: 'game-injury-on-disc',
    schemaVersion: 1,
    createdAt: 0,
    updatedAt: 0,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: ZOO,
    settings: { locationMode: 'none' },
    initialReceivingSideId: ZOO,
    sides: [
      { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
      { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants,
    points: [
      {
        id: 'pt1',
        lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
        // Meves (p_meves) injured while holding the disc — Sam (p_sam) subs in from the bench
        subs: [
          {
            id: 'sub1',
            sideId: ZOO,
            type: 'injury',
            inIds: ['p_sam'],
            outIds: ['p_meves'],
            stoppageActionId: 'h3',
          },
        ],
        possessions: [
          // Possession ends at the stoppage — Meves had the disc
          {
            id: 'pos1a',
            sideId: ZOO,
            actions: [
              {
                id: 'h1',
                kind: 'pull',
                sideId: RIVALS,
                receivingSideId: ZOO,
                puller: untracked,
                receiver: august,
                result: 'caught',
              },
              {
                id: 'h2',
                kind: 'throw',
                sideId: ZOO,
                thrower: august,
                toPlayer: meves,
                result: 'complete',
              },
              // Meves catches it then goes down injured — she had the disc
              {
                id: 'h3',
                kind: 'stoppage',
                reason: 'injury',
                sideId: ZOO,
              },
            ],
          },
          // New possession — Sam (who subbed in) picks up the disc
          {
            id: 'pos1b',
            sideId: ZOO,
            actions: [
              {
                id: 'h4',
                kind: 'disc_pickup',
                sideId: ZOO,
                player: sam,
              },
              {
                id: 'h5',
                kind: 'throw',
                sideId: ZOO,
                thrower: sam,
                toPlayer: max,
                result: 'goal',
              },
            ],
          },
        ],
      },
    ],
  };

  console.log('\n\n=== FORMATTED ===\n');
  console.log(formatGame(game));
  console.log('\n=== RAW JSON: Scenario 9 — Injury sub, player with disc ===\n');
  console.log(JSON.stringify(game));
});

// ── Scenario 10: Stall ───────────────────────────────────────────────────────
// Zoo O. August has the disc, count hits 10 — stall turnover.
// No throw happens. Rivals pick up at the spot and score.

test('scenario: stall — count hits 10, disc turns over at the spot', () => {
  const game: AdvancedTrackedGame = {
    id: 'game-stall',
    schemaVersion: 1,
    createdAt: 0,
    updatedAt: 0,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: ZOO,
    initialReceivingSideId: ZOO,
    settings: { locationMode: 'none' },
    sides: [
      { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
      { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants,
    points: [
      {
        id: 'pt1',
        lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
        possessions: [
          {
            id: 'pos1a',
            sideId: ZOO,
            actions: [
              {
                id: 's1',
                kind: 'pull',
                sideId: RIVALS,
                receivingSideId: ZOO,
                puller: untracked,
                receiver: august,
                result: 'caught',
              },
              {
                id: 's2',
                kind: 'throw',
                sideId: ZOO,
                thrower: august,
                toPlayer: meves,
                result: 'complete',
              },
              // Meves holds the disc, count reaches 10 — stall, no throw
              {
                id: 's3',
                kind: 'throw',
                sideId: ZOO,
                thrower: meves,
                result: 'stall',
              },
            ],
          },
          // Rivals pick up at the spot and score
          {
            id: 'pos1b',
            sideId: RIVALS,
            actions: [
              {
                id: 's4',
                kind: 'disc_pickup',
                sideId: RIVALS,
                player: untracked,
              },
              {
                id: 's5',
                kind: 'throw',
                sideId: RIVALS,
                thrower: untracked,
                result: 'goal',
              },
            ],
          },
        ],
      },
    ],
  };

  console.log('\n\n=== FORMATTED ===\n');
  console.log(formatGame(game));
  console.log('\n=== RAW JSON: Scenario 10 — Stall ===\n');
  console.log(JSON.stringify(game));
});

// ── Scenario 11: OB pull ─────────────────────────────────────────────────────
// Zoo pulls. Pull flies directly OB (ob_pull). Rivals spot the disc and pick up.
// Also covers the bricked case — both result in pull_pickup.

test('scenario: ob_pull — pull flies OB, receiving team spots and picks up', () => {
  const game: AdvancedTrackedGame = {
    id: 'game-ob-pull',
    schemaVersion: 1,
    createdAt: 0,
    updatedAt: 0,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: ZOO,
    initialReceivingSideId: RIVALS,
    settings: { locationMode: 'none' },
    sides: [
      { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
      { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants,
    points: [
      {
        id: 'pt1',
        lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
        possessions: [
          {
            id: 'pos1',
            sideId: RIVALS,
            actions: [
              // Pull flies directly OB — Rivals spot the disc
              {
                id: 'o1',
                kind: 'pull',
                sideId: ZOO,
                receivingSideId: RIVALS,
                puller: august,
                result: 'ob_pull',
              },
              {
                id: 'o2',
                kind: 'disc_pickup',
                sideId: RIVALS,
                player: untracked,
              },
              {
                id: 'o3',
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
                id: 'o4',
                kind: 'disc_pickup',
                sideId: ZOO,
                player: meves,
              },
              {
                id: 'o5',
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

  console.log('\n\n=== FORMATTED ===\n');
  console.log(formatGame(game));
  console.log('\n=== RAW JSON: Scenario 11 — OB pull ===\n');
  console.log(JSON.stringify(game));
});

// ── Scenario 12: Gender ratio — mixed game ───────────────────────────────────
// Mixed game, both ratios shown across two points.
// Point 1: FMP (more-women). Point 2: MMP (more-men).
// Participants have matchingType set.

test('scenario: gender ratio — mixed game, fmp then mmp point', () => {
  const game: AdvancedTrackedGame = {
    id: 'game-mixed',
    schemaVersion: 1,
    createdAt: 0,
    updatedAt: 0,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: ZOO,
    initialReceivingSideId: ZOO,
    settings: { locationMode: 'none' },
    sides: [
      { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
      { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants: [
      { id: 'p_august', name: 'August', matchingType: 'fmp' },
      { id: 'p_meves', name: 'Meves', matchingType: 'fmp' },
      { id: 'p_joah', name: 'Joah', matchingType: 'mmp' },
      { id: 'p_max', name: 'Max', matchingType: 'mmp' },
      { id: 'p_sam', name: 'Sam', matchingType: 'mmp' },
    ],
    points: [
      {
        id: 'pt1',
        // FMP point — 4 fmp, 3 mmp (more women)
        genderRatio: 'more-women',
        lines: [
          {
            sideId: ZOO,
            participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max', 'p_sam'],
          },
        ],
        possessions: [
          {
            id: 'pos1',
            sideId: ZOO,
            actions: [
              {
                id: 'r1',
                kind: 'pull',
                sideId: RIVALS,
                receivingSideId: ZOO,
                puller: untracked,
                receiver: august,
                result: 'caught',
              },
              {
                id: 'r2',
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
        // MMP point — 3 fmp, 4 mmp (more men)
        genderRatio: 'more-men',
        lines: [
          {
            sideId: ZOO,
            participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max', 'p_sam'],
          },
        ],
        possessions: [
          {
            id: 'pos2',
            sideId: ZOO,
            actions: [
              {
                id: 'r3',
                kind: 'pull',
                sideId: RIVALS,
                receivingSideId: ZOO,
                puller: untracked,
                receiver: joah,
                result: 'caught',
              },
              {
                id: 'r4',
                kind: 'throw',
                sideId: ZOO,
                thrower: joah,
                toPlayer: max,
                result: 'goal',
              },
            ],
          },
        ],
      },
    ],
  };

  console.log('\n\n=== FORMATTED ===\n');
  console.log(formatGame(game));
  console.log('\n=== RAW JSON: Scenario 12 — Gender ratio, mixed game ===\n');
  console.log(JSON.stringify(game));
});
