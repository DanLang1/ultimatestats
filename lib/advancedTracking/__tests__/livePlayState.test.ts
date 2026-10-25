import {
  getActiveSideId,
  getDiscHolderId,
  getDiscHolderRef,
  getSafeDiscHolderRef,
  getTrackerDisplaySideId,
} from '../livePlayState';
import type { AdvancedTrackedGame, PointPossession, TrackedPoint } from '../types';

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

  it('returns other side after a turnover followed by an injury stoppage', () => {
    const pos = makePossession(HOME, [
      {
        id: 'a1',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'drop',
      },
      {
        id: 'a2',
        kind: 'stoppage',
        reason: 'injury',
        sideId: HOME,
        recordedAt: 100,
        pausedAt: 100,
        resumedAt: 200,
      },
    ]);
    expect(getActiveSideId(pos, baseGame)).toBe(AWAY);
  });
});

describe('getTrackerDisplaySideId', () => {
  const dualTrackedGame: AdvancedTrackedGame = {
    ...baseGame,
    gameType: 'scrimmage',
    sides: baseGame.sides.map((side) => ({ ...side, trackingMode: 'full-roster' })),
  };

  it('switches to the receiving side after a dual-tracked turnover', () => {
    const possession = makePossession(HOME, [
      {
        id: 'drop1',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'drop',
      },
    ]);
    const point: TrackedPoint = {
      id: 'point1',
      lines: [],
      possessions: [possession],
    };

    expect(getTrackerDisplaySideId(dualTrackedGame, possession, point)).toBe(AWAY);
  });

  it('retains the scoring side after a dual-tracked goal', () => {
    const possession = makePossession(HOME, [
      {
        id: 'goal1',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'goal',
      },
    ]);
    const point: TrackedPoint = {
      id: 'point1',
      lines: [],
      possessions: [possession],
    };

    expect(getTrackerDisplaySideId(dualTrackedGame, possession, point)).toBe(HOME);
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

describe('getDiscHolderRef', () => {
  const unknown = { refType: 'unknown' as const };

  it('returns null if not focus side possession', () => {
    const pos = makePossession(AWAY);
    expect(getDiscHolderRef(pos, HOME)).toBeNull();
  });

  it('returns participant ref from pickup', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
    ]);
    expect(getDiscHolderRef(pos, HOME)).toEqual(august);
  });

  it('returns unknown ref from pickup', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: unknown },
    ]);
    expect(getDiscHolderRef(pos, HOME)).toEqual(unknown);
  });

  it('returns unknown ref after throw to unknown', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 'a2',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: unknown,
        result: 'complete',
      },
    ]);
    expect(getDiscHolderRef(pos, HOME)).toEqual(unknown);
    expect(getDiscHolderId(pos, HOME)).toBeNull();
  });
});

describe('getSafeDiscHolderRef', () => {
  const unknown = { refType: 'unknown' as const };

  it('returns the holder after an off-disc injury stoppage resumes', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 's1',
        kind: 'stoppage',
        reason: 'injury',
        recordedAt: 100,
        pausedAt: 100,
        resumedAt: 200,
      },
    ]);
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      possessions: [pos],
      subs: [
        {
          id: 'sub1',
          sideId: HOME,
          type: 'injury',
          inIds: ['p_extra'],
          outIds: [meves.participantId],
          stoppageActionId: 's1',
        },
      ],
    };
    expect(getSafeDiscHolderRef(pos, HOME, point)).toEqual(august);
  });

  it('returns null after an injury sub removes the holder', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 's1',
        kind: 'stoppage',
        reason: 'injury',
        recordedAt: 100,
        pausedAt: 100,
        resumedAt: 200,
      },
    ]);
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      possessions: [pos],
      subs: [
        {
          id: 'sub1',
          sideId: HOME,
          type: 'injury',
          inIds: ['p_extra'],
          outIds: [august.participantId],
          stoppageActionId: 's1',
        },
      ],
    };
    expect(getSafeDiscHolderRef(pos, HOME, point)).toBeNull();
  });

  it('returns null after an injury stoppage when the holder is unknown', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: unknown },
      {
        id: 's1',
        kind: 'stoppage',
        reason: 'injury',
        recordedAt: 100,
        pausedAt: 100,
        resumedAt: 200,
      },
    ]);
    expect(getSafeDiscHolderRef(pos, HOME)).toBeNull();
  });

  it('returns the holder when no injury-resume is active', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
    ]);
    expect(getSafeDiscHolderRef(pos, HOME)).toEqual(august);
  });

  it('returns null for null possession', () => {
    expect(getSafeDiscHolderRef(null, HOME)).toBeNull();
  });

  it('returns unknown ref when holder is unknown', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: unknown },
    ]);
    expect(getSafeDiscHolderRef(pos, HOME)).toEqual(unknown);
  });
});
