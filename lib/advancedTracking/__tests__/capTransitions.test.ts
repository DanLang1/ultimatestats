import { syncCapTransitions } from '../trackingUtils';
import type { AdvancedTrackedGame, GameTransition, TrackedPoint } from '../types';

const MIN_MS = 60 * 1000;
const HOME = 'home';
const AWAY = 'away';

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

function baseGame(points: TrackedPoint[], transitions?: GameTransition[]): AdvancedTrackedGame {
  return {
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
    participants: [],
    points,
    gameTransitions: transitions,
  };
}

const DEFAULT_CAPS = { gameLengthMinutes: 90, softCapMins: 20 };
// Defaults: soft cap at 70 min elapsed, hard cap at 90 min elapsed.

describe('syncCapTransitions', () => {
  it('records soft_cap at the first point-end after crossing softCapMs', () => {
    const game = baseGame([endedPoint('pt1')]);
    const changed = syncCapTransitions(game, {
      gameElapsedMs: 70 * MIN_MS,
      ...DEFAULT_CAPS,
    });

    expect(changed).toBe(true);
    expect(game.gameTransitions).toHaveLength(1);
    expect(game.gameTransitions?.[0]).toMatchObject({
      transitionType: 'soft_cap',
      afterPointId: 'pt1',
    });
  });

  it('does not record soft_cap before the threshold', () => {
    const game = baseGame([endedPoint('pt1')]);
    const changed = syncCapTransitions(game, {
      gameElapsedMs: 60 * MIN_MS,
      ...DEFAULT_CAPS,
    });

    expect(changed).toBe(false);
    expect(game.gameTransitions).toBeUndefined();
  });

  it('does not record soft_cap when current point is still in progress', () => {
    const game = baseGame([revivedPoint('pt1')]);
    const changed = syncCapTransitions(game, {
      gameElapsedMs: 75 * MIN_MS,
      ...DEFAULT_CAPS,
    });

    expect(changed).toBe(false);
  });

  it('is idempotent — re-running does not re-add soft_cap', () => {
    const game = baseGame([endedPoint('pt1')]);
    syncCapTransitions(game, { gameElapsedMs: 70 * MIN_MS, ...DEFAULT_CAPS });
    const changed = syncCapTransitions(game, { gameElapsedMs: 75 * MIN_MS, ...DEFAULT_CAPS });

    expect(changed).toBe(false);
    expect(game.gameTransitions?.filter((t) => t.transitionType === 'soft_cap')).toHaveLength(1);
  });

  it('records hard_cap when elapsed crosses hardCapMs at point end', () => {
    const game = baseGame([endedPoint('pt1')]);
    const changed = syncCapTransitions(game, {
      gameElapsedMs: 91 * MIN_MS,
      ...DEFAULT_CAPS,
    });

    expect(changed).toBe(true);
    const hardCap = game.gameTransitions?.find((t) => t.transitionType === 'hard_cap');
    expect(hardCap).toMatchObject({ transitionType: 'hard_cap', afterPointId: 'pt1' });
  });

  it('records hard_cap with afterPointId undefined when point is mid-play', () => {
    const game = baseGame([revivedPoint('pt1')]);
    syncCapTransitions(game, { gameElapsedMs: 95 * MIN_MS, ...DEFAULT_CAPS });

    const hardCap = game.gameTransitions?.find((t) => t.transitionType === 'hard_cap');
    expect(hardCap).toMatchObject({ transitionType: 'hard_cap' });
    expect((hardCap as { afterPointId?: string }).afterPointId).toBeUndefined();
  });

  it('records both caps in one pass if both thresholds are crossed at point end', () => {
    const game = baseGame([endedPoint('pt1')]);
    syncCapTransitions(game, { gameElapsedMs: 95 * MIN_MS, ...DEFAULT_CAPS });

    const types = game.gameTransitions?.map((t) => t.transitionType).sort();
    expect(types).toEqual(['hard_cap', 'soft_cap']);
  });

  it('preserves existing non-cap transitions (halftime)', () => {
    const game = baseGame(
      [endedPoint('pt1')],
      [{ id: 'ht', transitionType: 'halftime', afterPointId: 'pt0' }],
    );
    syncCapTransitions(game, { gameElapsedMs: 70 * MIN_MS, ...DEFAULT_CAPS });

    expect(game.gameTransitions).toHaveLength(2);
    expect(game.gameTransitions?.map((t) => t.transitionType)).toContain('halftime');
  });
});

describe('syncCapTransitions — auto-re-evaluation after undo', () => {
  it('re-records soft_cap on a new goal after the original was undone (idempotent — stays on original afterPointId)', () => {
    const game = baseGame([endedPoint('pt1')]);
    syncCapTransitions(game, { gameElapsedMs: 75 * MIN_MS, ...DEFAULT_CAPS });
    expect(game.gameTransitions).toHaveLength(1);

    // Simulate undo: point reverts to in-progress
    game.points = [revivedPoint('pt1')];

    // Replay: point ends again with a goal — syncCapTransitions is called again
    game.points = [endedPoint('pt1')];
    syncCapTransitions(game, { gameElapsedMs: 76 * MIN_MS, ...DEFAULT_CAPS });

    expect(game.gameTransitions).toHaveLength(1);
    expect(game.gameTransitions?.[0]).toMatchObject({ transitionType: 'soft_cap' });
  });
});
