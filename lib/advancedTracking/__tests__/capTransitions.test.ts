import { syncCapTransitions } from '../trackingUtils';
import type {
  AdvancedTrackedGame,
  GameFormatSettings,
  GameTransition,
  TrackedPoint,
} from '../types';

const MIN_MS = 60 * 1000;
const HOME = 'home';
const AWAY = 'away';
const DEFAULT_CAP_TIMING = { softCapAtMinutes: 70, hardCapAtMinutes: 90 };

// A point is "ended" when its last possession's last action is a point-ending throw.
function endedPoint(id: string, scoringSide: string = HOME): TrackedPoint {
  return {
    id,
    lines: [],
    possessions: [
      {
        id: `pos_${id}`,
        sideId: scoringSide,
        actions: [
          {
            id: `a_${id}`,
            kind: 'throw',
            sideId: scoringSide,
            thrower: { refType: 'untracked' },
            result: 'goal',
          },
        ],
      },
    ],
  };
}

function revivedPoint(id: string, scoringSide: string = HOME): TrackedPoint {
  // Last action is a `complete` (non-ending) throw → hasPointEnded returns false.
  return {
    id,
    lines: [],
    possessions: [
      {
        id: `pos_${id}`,
        sideId: scoringSide,
        actions: [
          {
            id: `a_${id}`,
            kind: 'throw',
            sideId: scoringSide,
            thrower: { refType: 'untracked' },
            result: 'complete',
          },
        ],
      },
    ],
  };
}

function baseGame(
  points: TrackedPoint[],
  transitions?: GameTransition[],
  format?: Partial<GameFormatSettings>,
): AdvancedTrackedGame {
  return {
    id: 'g1',
    schemaVersion: 1,
    createdAt: 0,
    updatedAt: 0,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: HOME,
    initialReceivingSideId: HOME,
    settings: {
      locationMode: 'none',
      format: {
        formatType: 'standard',
        gameTo: 15,
        softCapEnabled: true,
        hardCapEnabled: true,
        ...format,
      },
    },
    sides: [
      { id: HOME, label: 'Home', trackingMode: 'full-roster' },
      { id: AWAY, label: 'Away', trackingMode: 'anonymous' },
    ],
    participants: [],
    points,
    gameTransitions: transitions,
  };
}

// Defaults: soft cap at 70 min elapsed, hard cap at 90 min elapsed.
function syncDefaultCapTransitions(game: AdvancedTrackedGame, gameElapsedMs: number): boolean {
  return syncCapTransitions(game, {
    gameElapsedMs,
    capTiming: DEFAULT_CAP_TIMING,
  });
}

describe('syncCapTransitions', () => {
  it('records soft_cap at the first point-end after crossing softCapMs', () => {
    const game = baseGame([endedPoint('pt1')]);
    const changed = syncDefaultCapTransitions(game, 70 * MIN_MS);

    expect(changed).toBe(true);
    expect(game.gameTransitions).toHaveLength(1);
    expect(game.gameTransitions?.[0]).toMatchObject({
      transitionType: 'soft_cap',
      afterPointId: 'pt1',
    });
  });

  it('does not record soft_cap before the threshold', () => {
    const game = baseGame([endedPoint('pt1')]);
    const changed = syncDefaultCapTransitions(game, 60 * MIN_MS);

    expect(changed).toBe(false);
    expect(game.gameTransitions).toBeUndefined();
  });

  it('does not record soft_cap when current point is still in progress', () => {
    const game = baseGame([revivedPoint('pt1')]);
    const changed = syncDefaultCapTransitions(game, 75 * MIN_MS);

    expect(changed).toBe(false);
  });

  it('is idempotent — re-running does not re-add soft_cap', () => {
    const game = baseGame([endedPoint('pt1')]);
    syncDefaultCapTransitions(game, 70 * MIN_MS);
    const changed = syncDefaultCapTransitions(game, 75 * MIN_MS);

    expect(changed).toBe(false);
    expect(game.gameTransitions?.filter((t) => t.transitionType === 'soft_cap')).toHaveLength(1);
  });

  it('records hard_cap when elapsed crosses hardCapMs at point end', () => {
    const game = baseGame([endedPoint('pt1')]);
    const changed = syncDefaultCapTransitions(game, 91 * MIN_MS);

    expect(changed).toBe(true);
    const hardCap = game.gameTransitions?.find((t) => t.transitionType === 'hard_cap');
    expect(hardCap).toMatchObject({ transitionType: 'hard_cap', afterPointId: 'pt1' });
  });

  it('records hard_cap at hardCapMs even if soft cap timing is above hard cap', () => {
    const game = baseGame([endedPoint('pt1')]);
    const changed = syncCapTransitions(game, {
      gameElapsedMs: 91 * MIN_MS,
      capTiming: { softCapAtMinutes: 120, hardCapAtMinutes: 90 },
    });

    expect(changed).toBe(true);
    expect(game.gameTransitions).toEqual([
      expect.objectContaining({
        transitionType: 'hard_cap',
        afterPointId: 'pt1',
      }),
    ]);
  });

  it('records hard_cap with afterPointId undefined when point is mid-play', () => {
    const game = baseGame([revivedPoint('pt1')]);
    syncDefaultCapTransitions(game, 95 * MIN_MS);

    const hardCap = game.gameTransitions?.find((t) => t.transitionType === 'hard_cap');
    expect(hardCap).toMatchObject({ transitionType: 'hard_cap' });
    expect((hardCap as { afterPointId?: string }).afterPointId).toBeUndefined();
  });

  it('records both caps in one pass if both thresholds are crossed at point end', () => {
    const game = baseGame([endedPoint('pt1')]);
    syncDefaultCapTransitions(game, 95 * MIN_MS);

    const types = game.gameTransitions?.map((t) => t.transitionType).sort();
    expect(types).toEqual(['hard_cap', 'soft_cap']);
  });

  it('preserves existing non-cap transitions (halftime)', () => {
    const game = baseGame(
      [endedPoint('pt1')],
      [{ id: 'ht', transitionType: 'halftime', afterPointId: 'pt0' }],
    );
    syncDefaultCapTransitions(game, 70 * MIN_MS);

    expect(game.gameTransitions).toHaveLength(2);
    expect(game.gameTransitions?.map((t) => t.transitionType)).toContain('halftime');
  });

  it('records only soft_cap when hard cap tracking is disabled', () => {
    const game = baseGame([endedPoint('pt1')], undefined, { hardCapEnabled: false });
    syncDefaultCapTransitions(game, 95 * MIN_MS);

    expect(game.gameTransitions?.map((t) => t.transitionType)).toEqual(['soft_cap']);
  });

  it('records only hard_cap when soft cap tracking is disabled', () => {
    const game = baseGame([endedPoint('pt1')], undefined, { softCapEnabled: false });
    syncDefaultCapTransitions(game, 95 * MIN_MS);

    expect(game.gameTransitions?.map((t) => t.transitionType)).toEqual(['hard_cap']);
  });

  it('records no cap transitions when both caps are disabled', () => {
    const game = baseGame([endedPoint('pt1')], undefined, {
      softCapEnabled: false,
      hardCapEnabled: false,
    });
    const changed = syncDefaultCapTransitions(game, 95 * MIN_MS);

    expect(changed).toBe(false);
    expect(game.gameTransitions).toBeUndefined();
  });

  it('records cap transitions when enabled fields are missing from an older game', () => {
    const game = baseGame([endedPoint('pt1')]);
    game.settings.format = { formatType: 'standard', gameTo: 15 };
    const changed = syncDefaultCapTransitions(game, 95 * MIN_MS);

    expect(changed).toBe(true);
    const types = game.gameTransitions?.map((t) => t.transitionType).sort();
    expect(types).toEqual(['hard_cap', 'soft_cap']);
  });
});

describe('syncCapTransitions — auto-re-evaluation after undo', () => {
  it('re-records soft_cap on a new goal after the original was undone (idempotent — stays on original afterPointId)', () => {
    const game = baseGame([endedPoint('pt1')]);
    syncDefaultCapTransitions(game, 75 * MIN_MS);
    expect(game.gameTransitions).toHaveLength(1);

    // Simulate undo: point reverts to in-progress
    game.points = [revivedPoint('pt1')];

    // Replay: point ends again with a goal — syncCapTransitions is called again
    game.points = [endedPoint('pt1')];
    syncDefaultCapTransitions(game, 76 * MIN_MS);

    expect(game.gameTransitions).toHaveLength(1);
    expect(game.gameTransitions?.[0]).toMatchObject({ transitionType: 'soft_cap' });
  });
});
