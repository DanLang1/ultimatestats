import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import { getCurrentPoint } from '@/lib/advancedTracking/trackingUtils';
import { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '../advancedTrackingStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: <T>(options: { ios?: T; android?: T; default?: T }) => options.ios ?? options.default,
  },
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const homeSideId = 'home';
const awaySideId = 'away';

const august = { refType: 'participant' as const, participantId: 'p-august' };
const meves = { refType: 'participant' as const, participantId: 'p-meves' };
const untracked = { refType: 'untracked' as const };

const homeLines = [
  { sideId: homeSideId, participantIds: [august.participantId, meves.participantId] },
];
const homeLinesAugust = [{ sideId: homeSideId, participantIds: [august.participantId] }];

function resetStore() {
  useAdvancedTrackingStore.setState({
    currentGameId: null,
    savedGames: [],
    undoStack: [],
  });
}

function createGame(gameTo = 15): string {
  return useAdvancedTrackingStore.getState().createGame({
    focusSideId: homeSideId,
    initialReceivingSideId: homeSideId,
    sides: [
      { id: homeSideId, label: 'Home', trackingMode: 'full-roster' },
      { id: awaySideId, label: 'Away', trackingMode: 'anonymous' },
    ],
    participants: [
      { id: august.participantId, name: 'August' },
      { id: meves.participantId, name: 'Meves' },
    ],
    format: { gameTo },
    metadata: { title: 'Showcase Game' },
  });
}

function getCurrentGame(): AdvancedTrackedGame | null {
  const { currentGameId, savedGames } = useAdvancedTrackingStore.getState();
  return savedGames.find((g) => g.id === currentGameId) ?? null;
}

describe('advancedTrackingStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    resetStore();
  });

  it('creates a fresh advanced game directly in savedGames', () => {
    const gameId = createGame();
    const { currentGameId, savedGames } = useAdvancedTrackingStore.getState();

    expect(currentGameId).toBe(gameId);
    expect(savedGames).toHaveLength(1);
    expect(savedGames[0].id).toBe(gameId);
    expect(savedGames[0].status).toBe('in_progress');
    expect(savedGames[0].gameType).toBe('game');
    expect(savedGames[0].points).toEqual([]);
    expect(savedGames[0].settings.locationMode).toBe('none');
    expect(savedGames[0].settings.format?.gameTo).toBe(15);
    expect(savedGames[0].settings.format?.halftimeAt).toBe(8);
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      'ultimatestats_advanced_tracking',
      expect.any(String),
    );
  });

  it('derives halftimeAt as ceil(gameTo / 2)', () => {
    useAdvancedTrackingStore.getState().createGame({
      focusSideId: homeSideId,
      initialReceivingSideId: homeSideId,
      sides: [
        { id: homeSideId, label: 'Home', trackingMode: 'full-roster' },
        { id: awaySideId, label: 'Away', trackingMode: 'anonymous' },
      ],
      participants: [],
      format: { gameTo: 11 },
    });
    const { savedGames } = useAdvancedTrackingStore.getState();
    expect(savedGames[0].settings.format?.halftimeAt).toBe(6);
  });

  it('recordPull creates the point and records the pull atomically', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLines,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });

    const game = getCurrentGame() as AdvancedTrackedGame;
    expect(game.points).toHaveLength(1);
    expect(game.points[0].lines).toEqual(homeLines);
    expect(game.points[0].startedAt).toBeDefined();
    expect(game.points[0].possessions).toHaveLength(1);
    expect(game.points[0].possessions[0].actions[0].kind).toBe('pull');
  });

  it('records a simple hold and builds analytics from the game', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLines,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore.getState().recordThrow({
      thrower: august,
      result: 'goal',
      toPlayer: meves,
    });

    const game = getCurrentGame() as AdvancedTrackedGame;
    const analytics = buildAnalyticsGame(game);

    expect(game.points).toHaveLength(1);
    expect(game.points[0].possessions).toHaveLength(1);
    expect(analytics.points).toHaveLength(1);
    expect(analytics.points[0].state).toBe('hold');
    expect(analytics.points[0].scoringSideId).toBe(homeSideId);
    expect(analytics.attributions.some((attr) => attr.type === 'assist')).toBe(true);
    expect(analytics.attributions.some((attr) => attr.type === 'goal')).toBe(true);
  });

  it('creates a new possession when a turnover is followed by a pickup', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore.getState().recordThrow({ thrower: august, result: 'throwaway' });
    useAdvancedTrackingStore.getState().recordPickup({ sideId: awaySideId, player: untracked });

    const point = getCurrentPoint(getCurrentGame());

    expect(point?.possessions).toHaveLength(2);
    expect(point?.possessions[0].sideId).toBe(homeSideId);
    expect(point?.possessions[1].sideId).toBe(awaySideId);
    expect(point?.possessions[1].actions[0].kind).toBe('disc_pickup');
  });

  it('undoes the last action and removes an empty turnover possession', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore.getState().recordThrow({ thrower: august, result: 'throwaway' });
    useAdvancedTrackingStore.getState().recordPickup({ sideId: awaySideId, player: untracked });

    const didUndo = useAdvancedTrackingStore.getState().undoLastOperation();
    const point = getCurrentPoint(getCurrentGame());

    expect(didUndo).toBe(true);
    expect(point?.possessions).toHaveLength(1);
    expect(point?.possessions[0].actions.at(-1)?.kind).toBe('throw');
  });

  it('undoing the pull removes the entire point', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });

    expect(getCurrentGame()?.points).toHaveLength(1);

    const didUndo = useAdvancedTrackingStore.getState().undoLastOperation();

    expect(didUndo).toBe(true);
    expect(getCurrentGame()?.points).toHaveLength(0);
  });

  it('undoing across a point boundary reaches the previous point with its original lines', () => {
    createGame();

    const point1Lines = [{ sideId: homeSideId, participantIds: [august.participantId] }];
    const point2Lines = [{ sideId: homeSideId, participantIds: [meves.participantId] }];

    // Point 1: goal
    useAdvancedTrackingStore.getState().recordPull({
      lines: point1Lines,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    // Point 2: pull recorded with different lines
    useAdvancedTrackingStore.getState().recordPull({
      lines: point2Lines,
      puller: untracked,
      result: 'caught',
    });

    expect(getCurrentGame()?.points).toHaveLength(2);

    // Undo point 2's pull → removes point 2
    useAdvancedTrackingStore.getState().undoLastOperation();

    const game = getCurrentGame();
    expect(game?.points).toHaveLength(1);
    expect(game?.points[0].lines).toEqual(point1Lines);

    // Undo point 1's goal → point 1 back in progress
    useAdvancedTrackingStore.getState().undoLastOperation();
    const point = getCurrentPoint(getCurrentGame());
    expect(point?.possessions[0].actions.at(-1)?.kind).toBe('pull');
  });

  it('resetCurrentGame removes the in-progress game from savedGames', () => {
    createGame();
    expect(useAdvancedTrackingStore.getState().savedGames).toHaveLength(1);

    useAdvancedTrackingStore.getState().resetCurrentGame();
    const { currentGameId, savedGames } = useAdvancedTrackingStore.getState();

    expect(currentGameId).toBeNull();
    expect(savedGames).toHaveLength(0);
  });

  it('deleteSavedGame clears currentGameId when deleting the active game', () => {
    const gameId = createGame();
    useAdvancedTrackingStore.getState().deleteSavedGame(gameId);
    const { currentGameId, savedGames } = useAdvancedTrackingStore.getState();

    expect(currentGameId).toBeNull();
    expect(savedGames).toHaveLength(0);
  });

  it('finalizeGame throws if the game has not reached a valid game-over state', () => {
    createGame();

    expect(() => useAdvancedTrackingStore.getState().finalizeGame()).toThrow(
      'Cannot finalize game before it is over.',
    );
  });

  it('terminateGame sets status to terminated with endReason', () => {
    const gameId = createGame();
    useAdvancedTrackingStore.getState().terminateGame('weather');
    const { currentGameId, savedGames } = useAdvancedTrackingStore.getState();

    expect(currentGameId).toBeNull();
    expect(savedGames[0].id).toBe(gameId);
    expect(savedGames[0].status).toBe('terminated');
    expect(savedGames[0].endReason).toBe('weather');
  });

  it('updateGameMetadata replaces the metadata on the active game', () => {
    createGame();
    useAdvancedTrackingStore
      .getState()
      .updateGameMetadata({ title: 'Updated Title', location: 'Field A' });

    const game = getCurrentGame() as AdvancedTrackedGame;
    expect(game.metadata?.title).toBe('Updated Title');
    expect(game.metadata?.location).toBe('Field A');
  });

  it('derives halftime automatically when a side reaches halftimeAt', () => {
    createGame(1);

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    const game = getCurrentGame() as AdvancedTrackedGame;
    expect(game.gameTransitions).toHaveLength(1);
    expect(game.gameTransitions![0].transitionType).toBe('halftime');
    expect((game.gameTransitions![0] as { afterPointId: string }).afterPointId).toBe(
      game.points[0].id,
    );
  });

  it('undoing the halftime-triggering score removes the derived halftime transition', () => {
    createGame(1);

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    expect(getCurrentGame()?.gameTransitions?.some((t) => t.transitionType === 'halftime')).toBe(
      true,
    );

    useAdvancedTrackingStore.getState().undoLastOperation();

    expect(getCurrentGame()?.gameTransitions).toBeUndefined();
  });

  it('re-derives halftime after undo and flips next-point receiving side correctly', () => {
    createGame();

    const scoreHomePoint = () => {
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: untracked,
        receiver: august,
        result: 'caught',
      });
      useAdvancedTrackingStore
        .getState()
        .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });
    };

    const scoreAwayPoint = () => {
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: august,
        receiver: untracked,
        result: 'caught',
      });
      useAdvancedTrackingStore
        .getState()
        .recordThrow({ thrower: untracked, result: 'goal', toPlayer: untracked });
    };

    for (let pointIndex = 0; pointIndex < 7; pointIndex++) {
      scoreHomePoint();
      scoreAwayPoint();
    }

    scoreHomePoint(); // 8-7, halftime should be after this point

    let game = getCurrentGame() as AdvancedTrackedGame;
    expect(
      game.gameTransitions?.some((transition) => transition.transitionType === 'halftime'),
    ).toBe(true);
    expect(game.points).toHaveLength(15);

    useAdvancedTrackingStore.getState().undoLastOperation(); // undo 8-7 goal -> back to 7-7

    game = getCurrentGame() as AdvancedTrackedGame;
    expect(game.gameTransitions).toBeUndefined();
    expect(game.points).toHaveLength(15);
    expect(game.points[14].possessions[0].actions.at(-1)?.kind).toBe('pull');

    useAdvancedTrackingStore.getState().recordThrow({
      thrower: august,
      result: 'throwaway',
    });
    useAdvancedTrackingStore.getState().recordPickup({ sideId: awaySideId, player: untracked });
    useAdvancedTrackingStore.getState().recordThrow({
      thrower: untracked,
      result: 'goal',
      toPlayer: untracked,
    }); // 7-8, halftime should now be after this point

    game = getCurrentGame() as AdvancedTrackedGame;
    expect(game.gameTransitions).toHaveLength(1);
    expect(game.gameTransitions![0].transitionType).toBe('halftime');
    expect((game.gameTransitions![0] as { afterPointId: string }).afterPointId).toBe(
      game.points[14].id,
    );

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: august,
      receiver: untracked,
      result: 'caught',
    });

    game = getCurrentGame() as AdvancedTrackedGame;
    expect(game.points).toHaveLength(16);
    expect(game.points[15].possessions[0].sideId).toBe(awaySideId);
    expect(game.points[15].possessions[0].actions[0]).toMatchObject({
      kind: 'pull',
      sideId: homeSideId,
      receivingSideId: awaySideId,
    });
  });

  it('recordGameTransition adds a soft_cap transition after the last completed point', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    const pointId = getCurrentGame()!.points[0].id;
    useAdvancedTrackingStore.getState().recordGameTransition('soft_cap');

    const game = getCurrentGame() as AdvancedTrackedGame;
    expect(game.gameTransitions).toHaveLength(1);
    expect(game.gameTransitions![0].transitionType).toBe('soft_cap');
    expect((game.gameTransitions![0] as { afterPointId: string }).afterPointId).toBe(pointId);
  });

  it('recordGameTransition throws if soft_cap is recorded during an active point', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });

    expect(() => useAdvancedTrackingStore.getState().recordGameTransition('soft_cap')).toThrow(
      'Cannot record soft_cap while a point is in progress.',
    );
  });

  it('recordGameTransition throws if soft_cap is recorded before any completed point', () => {
    createGame();

    expect(() => useAdvancedTrackingStore.getState().recordGameTransition('soft_cap')).toThrow(
      'Cannot record soft_cap before the first point is completed.',
    );
  });

  it('recordGameTransition adds a hard_cap transition between points', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    const pointId = getCurrentGame()!.points[0].id;
    useAdvancedTrackingStore.getState().recordGameTransition('hard_cap');

    const game = getCurrentGame() as AdvancedTrackedGame;
    expect(game.gameTransitions).toHaveLength(1);
    expect(game.gameTransitions![0].transitionType).toBe('hard_cap');
    expect((game.gameTransitions![0] as { afterPointId?: string }).afterPointId).toBe(pointId);
  });

  it('recordGameTransition allows hard_cap mid-point and records the in-progress point id', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    // Point is in progress — hard_cap is still allowed mid-point
    const inProgressPointId = getCurrentGame()!.points[0].id;
    useAdvancedTrackingStore.getState().recordGameTransition('hard_cap');

    const game = getCurrentGame() as AdvancedTrackedGame;
    expect(game.gameTransitions).toHaveLength(1);
    expect(game.gameTransitions![0].transitionType).toBe('hard_cap');
    expect((game.gameTransitions![0] as { afterPointId?: string }).afterPointId).toBe(
      inProgressPointId,
    );
  });

  it('recordBetweenPointTimeout writes to transitionsAfter on the completed point', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    const transitionId = useAdvancedTrackingStore.getState().recordBetweenPointTimeout({
      sideId: homeSideId,
    });

    const point = getCurrentGame()!.points[0];
    expect(point.transitionsAfter).toEqual([
      {
        id: transitionId,
        transitionType: 'timeout',
        sideId: homeSideId,
      },
    ]);
  });

  it('undoLastOperation removes the last between-point timeout', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    useAdvancedTrackingStore.getState().recordBetweenPointTimeout({
      sideId: homeSideId,
    });

    expect(useAdvancedTrackingStore.getState().undoLastOperation()).toBe(true);
    expect(getCurrentGame()!.points[0].transitionsAfter).toBeUndefined();
  });

  it('undoLastOperation skips cap transitions and undoes the latest undoable operation', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });
    useAdvancedTrackingStore.getState().recordGameTransition('soft_cap');

    expect(useAdvancedTrackingStore.getState().undoLastOperation()).toBe(true);
    expect(getCurrentGame()?.gameTransitions?.some((t) => t.transitionType === 'soft_cap')).toBe(
      true,
    );
    expect(getCurrentGame()?.points[0].possessions[0].actions.at(-1)?.kind).toBe('pull');
  });

  it('recordPull throws if a point is already in progress', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });

    expect(() =>
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: untracked,
        result: 'caught',
      }),
    ).toThrow('Cannot record a pull while the current point is still in progress.');
  });

  it('recordPickup throws if the sideId does not match the expected next possession side', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore.getState().recordThrow({ thrower: august, result: 'throwaway' });

    // Home threw it away, so away should pick up — passing home here should throw
    expect(() =>
      useAdvancedTrackingStore.getState().recordPickup({ sideId: homeSideId, player: august }),
    ).toThrow(`Expected pickup for side "${awaySideId}".`);
  });

  it('recordThrow throws if the point has already ended', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    expect(() =>
      useAdvancedTrackingStore.getState().recordThrow({ thrower: meves, result: 'complete' }),
    ).toThrow('Cannot record a throw after the point has ended.');
  });

  it('recordThrow throws if the possession has already ended via turnover', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore.getState().recordThrow({ thrower: august, result: 'throwaway' });

    expect(() =>
      useAdvancedTrackingStore.getState().recordThrow({ thrower: august, result: 'complete' }),
    ).toThrow('Cannot record a throw after the possession has already ended.');
  });

  it('recordStoppage adds a stoppage action to the current possession', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });

    const stoppageId = useAdvancedTrackingStore.getState().recordStoppage({
      reason: 'timeout',
      sideId: homeSideId,
    });

    const point = getCurrentPoint(getCurrentGame());
    const lastAction = point?.possessions[0].actions.at(-1);

    expect(lastAction?.kind).toBe('stoppage');
    expect(lastAction?.id).toBe(stoppageId);
    if (lastAction?.kind === 'stoppage') {
      expect(lastAction.reason).toBe('timeout');
      expect(lastAction.sideId).toBe(homeSideId);
      expect(lastAction.pausedAt).toBeDefined();
    }
  });

  it('resumeStoppage sets resumedAt on the stoppage action', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });

    const stoppageId = useAdvancedTrackingStore.getState().recordStoppage({ reason: 'injury' });
    useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);

    const point = getCurrentPoint(getCurrentGame());
    const lastAction = point?.possessions[0].actions.at(-1);

    if (lastAction?.kind === 'stoppage') {
      expect(lastAction.resumedAt).toBeDefined();
    } else {
      fail('Expected last action to be a stoppage');
    }
  });

  it('undoLastOperation reverts a stoppage resume', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });

    const stoppageId = useAdvancedTrackingStore.getState().recordStoppage({ reason: 'injury' });
    useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);

    expect(useAdvancedTrackingStore.getState().undoLastOperation()).toBe(true);

    const point = getCurrentPoint(getCurrentGame());
    const lastAction = point?.possessions[0].actions.at(-1);

    if (lastAction?.kind === 'stoppage') {
      expect(lastAction.resumedAt).toBeUndefined();
    } else {
      fail('Expected last action to be a stoppage');
    }
  });

  it('recordSub attaches a PointSub to the current point', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });

    const stoppageId = useAdvancedTrackingStore.getState().recordStoppage({ reason: 'injury' });
    useAdvancedTrackingStore.getState().recordSub({
      stoppageActionId: stoppageId,
      sideId: homeSideId,
      inIds: [meves.participantId],
      outIds: [august.participantId],
    });

    const point = getCurrentPoint(getCurrentGame());
    expect(point?.subs).toHaveLength(1);
    expect(point?.subs![0].stoppageActionId).toBe(stoppageId);
    expect(point?.subs![0].inIds).toEqual([meves.participantId]);
    expect(point?.subs![0].outIds).toEqual([august.participantId]);
    expect(point?.subs![0].type).toBe('injury');
  });

  it('undoLastOperation first removes the latest sub, then the linked stoppage', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });

    const stoppageId = useAdvancedTrackingStore.getState().recordStoppage({ reason: 'injury' });
    useAdvancedTrackingStore.getState().recordSub({
      stoppageActionId: stoppageId,
      sideId: homeSideId,
      inIds: [meves.participantId],
      outIds: [august.participantId],
    });

    expect(getCurrentPoint(getCurrentGame())?.subs).toHaveLength(1);

    useAdvancedTrackingStore.getState().undoLastOperation(); // undo sub

    let point = getCurrentPoint(getCurrentGame());
    expect(point?.subs).toBeUndefined();
    expect(point?.possessions[0].actions.at(-1)?.kind).toBe('stoppage');

    useAdvancedTrackingStore.getState().undoLastOperation(); // undo stoppage

    point = getCurrentPoint(getCurrentGame());
    expect(point?.possessions[0].actions.at(-1)?.kind).toBe('pull');
  });

  it('finalizeGame succeeds when the score reaches the effective gameTo target', () => {
    createGame(1);

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'caught',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    useAdvancedTrackingStore.getState().finalizeGame();

    expect(useAdvancedTrackingStore.getState().currentGameId).toBeNull();
    expect(useAdvancedTrackingStore.getState().savedGames[0].status).toBe('final');
  });
});
