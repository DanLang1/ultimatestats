import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentPoint, getGameScore } from '../../lib/advancedTracking/trackingUtils';
import type { AdvancedTrackedGame } from '../../lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '../../store/advancedTracking/trackingStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@/lib/advancedTracking/storage', () => ({
  deleteAdvancedGameRecord: jest.fn().mockResolvedValue(undefined),
  loadAdvancedGame: jest.fn().mockResolvedValue(null),
  loadAdvancedGameSummaries: jest.fn().mockResolvedValue([]),
  upsertAdvancedGame: jest.fn(async (game) => ({
    id: game.id,
    schemaVersion: game.schemaVersion,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    importedAt: game.importedAt,
    playedAt: null,
    sortTimestamp: game.createdAt,
    status: game.status,
    gameType: game.gameType,
    focusSideId: game.focusSideId,
    focusSourceTeamId: null,
    myTeamName: 'Home',
    opponentName: 'Away',
    myScore: 0,
    opponentScore: 0,
    pointsTracked: game.points?.length ?? 0,
  })),
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

function resetStore() {
  useAdvancedTrackingStore.setState({
    currentGameId: null,
    currentGame: null,
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
  });
}

function getCurrentGame(): AdvancedTrackedGame | null {
  const { currentGameId, currentGame } = useAdvancedTrackingStore.getState();
  return currentGame?.id === currentGameId ? currentGame : null;
}

describe('advancedTrackingStore — edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    resetStore();
  });

  describe('recordThrow result types', () => {
    it('records a stall and prevents further throws in the same possession', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        result: 'stall',
      });

      const point = getCurrentPoint(getCurrentGame());
      expect(point?.possessions).toHaveLength(1);
      expect(point?.possessions[0].actions.at(-1)?.kind).toBe('throw');

      // Cannot record another throw in the stalled possession
      expect(() =>
        useAdvancedTrackingStore.getState().recordThrow({
          thrower: august,
          result: 'complete',
        }),
      ).toThrow('Cannot record a throw after the possession has already ended.');
    });

    it('records a block and allows the other side to pick up', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        result: 'block',
        defender: meves,
      });

      const point = getCurrentPoint(getCurrentGame());
      expect(point?.possessions).toHaveLength(1);
      expect(point?.possessions[0].actions.at(-1)?.kind).toBe('throw');

      // After a block, the other side can pick up (creating a new possession)
      useAdvancedTrackingStore.getState().recordPickup({
        sideId: awaySideId,
        player: untracked,
      });
      const pointAfterPickup = getCurrentPoint(getCurrentGame());
      expect(pointAfterPickup?.possessions).toHaveLength(2);
      expect(pointAfterPickup?.possessions[1].sideId).toBe(awaySideId);
    });

    it('records pressure as a turnover and allows the other side to pick up', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        result: 'pressure',
        defender: meves,
      });

      const point = getCurrentPoint(getCurrentGame());
      const pressureAction = point?.possessions[0].actions.at(-1);
      expect(pressureAction?.kind).toBe('throw');
      if (pressureAction?.kind === 'throw') {
        expect(pressureAction.result).toBe('pressure');
        expect(pressureAction.defender).toEqual(meves);
      }
      expect(getCurrentGame()?.schemaVersion).toBe(2);

      useAdvancedTrackingStore.getState().recordPickup({
        sideId: awaySideId,
        player: untracked,
      });
      expect(getCurrentPoint(getCurrentGame())?.possessions).toHaveLength(2);
    });

    it('rejects pressure without a tracked defender', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });

      expect(() =>
        useAdvancedTrackingStore.getState().recordThrow({
          thrower: august,
          result: 'pressure',
        }),
      ).toThrow('Pressure requires a tracked defender.');
    });

    it('records a drop with split attribution', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [
          { sideId: homeSideId, participantIds: [august.participantId, meves.participantId] },
        ],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        toPlayer: meves,
        result: 'drop',
        splitAttribution: true,
      });

      const point = getCurrentPoint(getCurrentGame());
      const lastAction = point?.possessions[0].actions.at(-1);
      expect(lastAction?.kind).toBe('throw');
      if (lastAction?.kind === 'throw') {
        expect(lastAction.splitAttribution).toBe(true);
      }
    });

    it('records a callahan', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        result: 'callahan',
        defender: meves,
      });

      const game = getCurrentGame()!;
      const point = getCurrentPoint(game);
      expect(point?.possessions).toHaveLength(1);
      expect(getGameScore(game)[awaySideId]).toBe(1);
      expect(getGameScore(game)[homeSideId]).toBe(0);
    });
  });

  describe('undo behavior edge cases', () => {
    it('undoing a goal in a multi-possession point removes only the goal action, leaving prior possessions', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({ thrower: august, result: 'throwaway' });
      useAdvancedTrackingStore.getState().recordPickup({ sideId: awaySideId, player: untracked });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: untracked,
        toPlayer: untracked,
        result: 'goal',
      });

      let game = getCurrentGame()!;
      expect(game.points[0].possessions).toHaveLength(2);

      useAdvancedTrackingStore.getState().undoLastOperation();

      game = getCurrentGame()!;
      const point = getCurrentPoint(game);
      expect(point?.possessions).toHaveLength(2);
      expect(point?.possessions[1].actions).toHaveLength(1); // just the pickup
    });

    it('undoing a pickup after a turnover removes the pickup and the empty possession', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({ thrower: august, result: 'throwaway' });
      useAdvancedTrackingStore.getState().recordPickup({ sideId: awaySideId, player: untracked });

      let game = getCurrentGame()!;
      expect(game.points[0].possessions).toHaveLength(2);

      useAdvancedTrackingStore.getState().undoLastOperation();

      game = getCurrentGame()!;
      expect(game.points[0].possessions).toHaveLength(1);
    });

    it('canceling an active stoppage also removes linked subs', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [
          { sideId: homeSideId, participantIds: [august.participantId, meves.participantId] },
        ],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      const stoppageId = useAdvancedTrackingStore.getState().recordStoppage({
        reason: 'injury',
      });
      useAdvancedTrackingStore.getState().recordSub({
        stoppageActionId: stoppageId,
        sideId: homeSideId,
        inIds: [meves.participantId],
        outIds: [august.participantId],
      });

      let game = getCurrentGame()!;
      expect(getCurrentPoint(game)?.subs).toHaveLength(1);

      useAdvancedTrackingStore.getState().cancelStoppage(stoppageId);
      game = getCurrentGame()!;
      expect(getCurrentPoint(game)?.subs).toBeUndefined();
      expect(getCurrentPoint(game)?.possessions[0].actions.at(-1)?.kind).toBe('pull');
    });
  });

  describe('recordPickup validation', () => {
    it('throws when pickup side does not match expected next possession side', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({ thrower: august, result: 'throwaway' });

      // Home threw it away, so Away should pick up. Home trying to pick up should throw.
      expect(() =>
        useAdvancedTrackingStore.getState().recordPickup({
          sideId: homeSideId,
          player: august,
        }),
      ).toThrow(`Expected pickup for side "${awaySideId}".`);
    });

    it('allows pickup for the same side after a non-turnover throw (complete)', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [
          { sideId: homeSideId, participantIds: [august.participantId, meves.participantId] },
        ],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        toPlayer: meves,
        result: 'complete',
      });

      // Home completed the pass, so Home still has possession
      useAdvancedTrackingStore.getState().recordPickup({
        sideId: homeSideId,
        player: meves,
      });

      const point = getCurrentPoint(getCurrentGame());
      expect(point?.possessions).toHaveLength(1); // same possession
      expect(point?.possessions[0].actions.at(-1)?.kind).toBe('disc_pickup');
    });
  });

  describe('finalizeGame edge cases', () => {
    it('throws when game is not over (score below gameTo)', async () => {
      createGame(15);
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        toPlayer: meves,
        result: 'goal',
      });

      await expect(useAdvancedTrackingStore.getState().finalizeGame()).rejects.toThrow(
        'Cannot finalize game before it is over.',
      );
    });

    it('throws when game is tied at gameTo (needs to win by 1)', async () => {
      createGame(1);
      // Home scores
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        toPlayer: meves,
        result: 'goal',
      });
      // Away scores (tied 1-1)
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: august,
        receiver: untracked,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: untracked,
        toPlayer: untracked,
        result: 'goal',
      });

      await expect(useAdvancedTrackingStore.getState().finalizeGame()).rejects.toThrow(
        'Cannot finalize game before it is over.',
      );
    });

    it('succeeds when score is ahead by 1 at gameTo', async () => {
      createGame(1);
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        toPlayer: meves,
        result: 'goal',
      });

      await expect(useAdvancedTrackingStore.getState().finalizeGame()).resolves.toBeUndefined();
      expect(useAdvancedTrackingStore.getState().currentGameId).toBeNull();
      expect(useAdvancedTrackingStore.getState().currentGame!.status).toBe('final');
    });
  });

  describe('recordPull validation', () => {
    it('throws if a point is already in progress', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });

      expect(() =>
        useAdvancedTrackingStore.getState().recordPull({
          lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
          puller: untracked,
          receiver: august,
          result: 'inbound',
        }),
      ).toThrow('Cannot record a pull while the current point is still in progress.');
    });
  });

  describe('receiving side rotation', () => {
    it('alternates receiving side correctly after goals and callahans', () => {
      createGame();

      // Point 1: Home receives, Home scores → Away receives next
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        toPlayer: meves,
        result: 'goal',
      });

      // Point 2: Away receives, Home callahan → Away receives next (Home scored)
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: august,
        receiver: untracked,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: untracked,
        result: 'callahan',
        defender: meves,
      });

      let game = getCurrentGame()!;
      expect(game.points).toHaveLength(2);
      expect(game.points[0].possessions[0].sideId).toBe(homeSideId);
      expect(game.points[1].possessions[0].sideId).toBe(awaySideId);
    });
  });

  describe('amendLastThrowAsGoal', () => {
    it('amends a complete throw to goal and ends the point', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        toPlayer: meves,
        result: 'complete',
      });

      let game = getCurrentGame()!;
      expect(getCurrentPoint(game)?.possessions[0].actions.at(-1)?.kind).toBe('throw');

      useAdvancedTrackingStore.getState().amendLastThrowAsGoal();

      game = getCurrentGame()!;
      const lastAction = getCurrentPoint(game)?.possessions[0].actions.at(-1);
      expect(lastAction?.kind).toBe('throw');
      if (lastAction?.kind === 'throw') {
        expect(lastAction.result).toBe('goal');
      }
      expect(getGameScore(game)[homeSideId]).toBe(1);
    });

    it('does nothing if last throw is not complete', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        result: 'throwaway',
      });

      const before = getCurrentGame()!;
      useAdvancedTrackingStore.getState().amendLastThrowAsGoal();
      const after = getCurrentGame()!;

      expect(after).toEqual(before);
    });
  });

  describe('stoppage and resume', () => {
    it('cannot resume a stoppage that is already resumed', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      const stoppageId = useAdvancedTrackingStore.getState().recordStoppage({
        reason: 'timeout',
        sideId: homeSideId,
      });
      useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);

      expect(() => useAdvancedTrackingStore.getState().resumeStoppage(stoppageId)).toThrow(
        'Stoppage has already been resumed.',
      );
    });

    it('cannot record stoppage after point has ended', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        toPlayer: meves,
        result: 'goal',
      });

      expect(() =>
        useAdvancedTrackingStore.getState().recordStoppage({ reason: 'timeout' }),
      ).toThrow('Cannot record a stoppage after the point has ended.');
    });
  });

  describe('deleteSavedGame cleanup', () => {
    it('removes undo entries for deleted game points', async () => {
      const gameId = createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        toPlayer: meves,
        result: 'goal',
      });

      expect(useAdvancedTrackingStore.getState().undoStack.length).toBeGreaterThan(0);

      await useAdvancedTrackingStore.getState().deleteSavedGame(gameId);

      expect(useAdvancedTrackingStore.getState().currentGame).toBeNull();
      expect(useAdvancedTrackingStore.getState().undoStack).toHaveLength(0);
    });
  });
});
