import {
  getActiveSideId,
  getDiscHolderId,
  getPassChainEvents,
  getSideTimeoutsUsed,
} from '../../advancedTracking/trackingDisplayHelpers';
import type { AdvancedTrackedGame, PointPossession } from '../../advancedTracking/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const HOME = 'home';
const AWAY = 'away';

const august = { refType: 'participant' as const, participantId: 'p_august' };
const meves = { refType: 'participant' as const, participantId: 'p_meves' };
const untracked = { refType: 'untracked' as const };

const baseGame: AdvancedTrackedGame = {
  id: 'g1',
  schemaVersion: 1,
  createdAt: 0,
  updatedAt: 0,
  gameType: 'game',
  status: 'in_progress',
  focusSideId: HOME,
  initialReceivingSideId: HOME,
  settings: { locationMode: 'none' },
  sides: [
    { id: HOME, label: 'Home', trackingMode: 'full-roster' },
    { id: AWAY, label: 'Away', trackingMode: 'anonymous' },
  ],
  participants: [
    { id: august.participantId, name: 'August' },
    { id: meves.participantId, name: 'Meves' },
  ],
  points: [],
};

function makePossession(sideId: string, actions: PointPossession['actions'] = []): PointPossession {
  return { id: 'pos1', sideId, actions };
}

// --- Helpers ---

describe('getActiveSideId', () => {
  it('returns focusSideId for null possession', () => {
    expect(getActiveSideId(null, baseGame)).toBe(HOME);
  });

  it('returns current side if possession is active', () => {
    const pos = makePossession(AWAY, [
      { id: 'a1', kind: 'disc_pickup', sideId: AWAY, player: untracked },
    ]);
    expect(getActiveSideId(pos, baseGame)).toBe(AWAY);
  });

  it('returns other side if possession is over', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'throwaway' },
    ]);
    expect(getActiveSideId(pos, baseGame)).toBe(AWAY);
  });
});

describe('getDiscHolderId', () => {
  it('returns null if not focus side possession', () => {
    const pos = makePossession(AWAY);
    expect(getDiscHolderId(pos, HOME)).toBeNull();
  });

  it('returns null if possession is over', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
    ]);
    expect(getDiscHolderId(pos, HOME)).toBeNull();
  });

  it('identifies disc holder from pickup', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
    ]);
    expect(getDiscHolderId(pos, HOME)).toBe(august.participantId);
  });

  it('identifies disc holder after a completion', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 'a2',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'complete',
      },
    ]);
    expect(getDiscHolderId(pos, HOME)).toBe(meves.participantId);
  });
});

describe('getPassChainEvents', () => {
  it('returns empty events for null possession', () => {
    expect(getPassChainEvents(null, baseGame.participants)).toEqual({
      events: [],
      truncated: false,
    });
  });

  it('builds a chain from pickup + completion', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 'a2',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'complete',
      },
    ]);
    const { events, truncated } = getPassChainEvents(pos, baseGame.participants);
    expect(truncated).toBe(false);
    expect(events.map((e) => e.name)).toEqual(['August', 'Meves']);
    expect(events[0].id).toBe('a1');
    expect(events[1].id).toBe('a2');
  });

  it('limits to last maxDisplay entries and sets truncated', () => {
    const p1 = { refType: 'participant' as const, participantId: 'p1' };
    const p2 = { refType: 'participant' as const, participantId: 'p2' };
    const p3 = { refType: 'participant' as const, participantId: 'p3' };
    const p4 = { refType: 'participant' as const, participantId: 'p4' };
    const participants = [
      { id: 'p1', name: 'P1' },
      { id: 'p2', name: 'P2' },
      { id: 'p3', name: 'P3' },
      { id: 'p4', name: 'P4' },
    ];
    const pos = makePossession(HOME, [
      {
        id: 'a1',
        kind: 'throw',
        sideId: HOME,
        thrower: untracked,
        toPlayer: p1,
        result: 'complete',
      },
      { id: 'a2', kind: 'throw', sideId: HOME, thrower: p1, toPlayer: p2, result: 'complete' },
      { id: 'a3', kind: 'throw', sideId: HOME, thrower: p2, toPlayer: p3, result: 'complete' },
      { id: 'a4', kind: 'throw', sideId: HOME, thrower: p3, toPlayer: p4, result: 'complete' },
    ]);
    const { events, truncated } = getPassChainEvents(pos, participants);
    expect(truncated).toBe(true);
    expect(events.map((e) => e.name)).toEqual(['P2', 'P3', 'P4']);
  });
});

describe('getSideTimeoutsUsed', () => {
  it('counts timeouts correctly', () => {
    const gameWithTimeouts: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'p1',
          lines: [],
          possessions: [],
          transitionsAfter: [
            { id: 't1', transitionType: 'timeout', sideId: HOME },
            { id: 't2', transitionType: 'timeout', sideId: AWAY },
          ],
        },
        {
          id: 'p2',
          lines: [],
          possessions: [],
          transitionsAfter: [{ id: 't3', transitionType: 'timeout', sideId: HOME }],
        },
      ],
    };
    expect(getSideTimeoutsUsed(gameWithTimeouts, HOME)).toBe(2);
    expect(getSideTimeoutsUsed(gameWithTimeouts, AWAY)).toBe(1);
  });
});
