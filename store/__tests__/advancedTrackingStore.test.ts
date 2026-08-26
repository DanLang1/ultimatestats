import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import { upsertAdvancedGame } from '@/lib/advancedTracking/storage';
import { getEffectiveLineParticipantIds } from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getActiveAdvancedGame,
  getCurrentPoint,
  getEffectiveGameTo,
  getGameScore,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { DEFAULT_HALFTIME_BREAK_SECONDS, MAX_ADVANCED_GAME_NOTE_LENGTH } from '@/lib/constants';
import { useSettingsStore } from '@/store/settingsStore';

import { useSavedAdvancedGamesStore } from '../advancedTracking/savedGamesStore';
import type {
  AdvancedTrackingState,
  CreateAdvancedGameInput,
} from '../advancedTracking/trackingStore.types';
import { useAdvancedTrackingStore } from './captureTestStore';

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
    currentGame: null,
    undoStack: [],
    pendingNextPointLineSelection: null,
    isHalftimeBreakActive: false,
    halftimeTimerStartedAt: null,
    halftimeTimerDurationSeconds: DEFAULT_HALFTIME_BREAK_SECONDS,
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

function createDualTrackedScrimmage() {
  const participants = Array.from({ length: 18 }, (_, index) => ({
    id: `scrim-player-${index + 1}`,
    name: `Scrim Player ${index + 1}`,
  }));
  const lightIds = participants.slice(0, 7).map((participant) => participant.id);
  const darkIds = participants.slice(7, 14).map((participant) => participant.id);

  useAdvancedTrackingStore.getState().createGame({
    id: 'dual-tracked-scrimmage',
    gameType: 'scrimmage',
    focusSideId: homeSideId,
    initialReceivingSideId: homeSideId,
    sides: [
      { id: homeSideId, label: 'Light', trackingMode: 'full-roster' },
      { id: awaySideId, label: 'Dark', trackingMode: 'full-roster' },
    ],
    participants,
    format: { gameTo: 15 },
  });
  useAdvancedTrackingStore.getState().recordPull({
    lines: [
      { sideId: homeSideId, participantIds: lightIds },
      { sideId: awaySideId, participantIds: darkIds },
    ],
    puller: { refType: 'participant', participantId: darkIds[0] },
    receiver: { refType: 'participant', participantId: lightIds[0] },
    result: 'inbound',
  });

  return {
    lightIds,
    darkIds,
    lightBenchId: participants[14].id,
    darkBenchId: participants[15].id,
    lightCorrectionId: participants[16].id,
    darkCorrectionId: participants[17].id,
  };
}

function getCurrentGame(): AdvancedTrackedGame | null {
  return getActiveAdvancedGame(useAdvancedTrackingStore.getState());
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
    const { currentGameId, currentGame } = useAdvancedTrackingStore.getState();

    expect(currentGameId).toBe(gameId);
    expect(currentGame).not.toBeNull();
    expect(currentGame!.id).toBe(gameId);
    expect(currentGame!.status).toBe('in_progress');
    expect(currentGame!.gameType).toBe('game');
    expect(currentGame!.points).toEqual([]);
    expect(currentGame!.settings.locationMode).toBe('none');
    expect(currentGame!.settings.format?.gameTo).toBe(15);
    expect(currentGame!.settings.format?.halftimeAt).toBe(8);
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      'ultimatestats_advanced_tracking',
      expect.any(String),
    );
  });

  it('stores advanced cap settings on the game format when provided', () => {
    useAdvancedTrackingStore.getState().createGame({
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
      format: {
        gameTo: 15,
        softCapEnabled: false,
        hardCapEnabled: true,
      },
    });

    const { currentGame } = useAdvancedTrackingStore.getState();
    expect(currentGame!.settings.format).toMatchObject({
      softCapEnabled: false,
      hardCapEnabled: true,
    });
  });

  it('does not replace a new game with a stale async load', async () => {
    createGame();
    const staleGame = useAdvancedTrackingStore.getState().currentGame!;
    useAdvancedTrackingStore.setState({ currentGameId: staleGame.id, currentGame: null });

    let resolveLoad: (game: AdvancedTrackedGame) => void = () => undefined;
    const loadPromise = new Promise<AdvancedTrackedGame>((resolve) => {
      resolveLoad = resolve;
    });
    const loadGameSpy = jest
      .spyOn(useSavedAdvancedGamesStore.getState(), 'loadGame')
      .mockReturnValue(loadPromise);

    const staleLoad = useAdvancedTrackingStore.getState().loadCurrentGame();
    const newGameId = createGame();
    resolveLoad(staleGame);
    await staleLoad;

    expect(useAdvancedTrackingStore.getState().currentGameId).toBe(newGameId);
    expect(useAdvancedTrackingStore.getState().currentGame?.id).toBe(newGameId);
    loadGameSpy.mockRestore();
  });

  it('persists undo history for an active advanced game session', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    const undoStack = useAdvancedTrackingStore.getState().undoStack;
    const advancedTrackingWrites = mockedAsyncStorage.setItem.mock.calls.filter(
      ([key]) => key === 'ultimatestats_advanced_tracking',
    );
    const lastWrite = advancedTrackingWrites.at(-1);
    expect(lastWrite).toBeDefined();

    const persistedPayload = JSON.parse(lastWrite![1]);
    expect(persistedPayload.state.undoStack).toEqual(undoStack);
    expect(persistedPayload.state.undoStack).toHaveLength(1);
  });

  it('persists active halftime timer state', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore.getState().recordThrow({
      thrower: august,
      result: 'goal',
      toPlayer: meves,
    });

    expect(useAdvancedTrackingStore.getState().triggerHalftimeEarly()).toBe(true);
    useAdvancedTrackingStore.getState().startHalftimeTimer();

    const { halftimeTimerStartedAt } = useAdvancedTrackingStore.getState();
    const advancedTrackingWrites = mockedAsyncStorage.setItem.mock.calls.filter(
      ([key]) => key === 'ultimatestats_advanced_tracking',
    );
    const lastWrite = advancedTrackingWrites.at(-1);
    expect(lastWrite).toBeDefined();

    const persistedPayload = JSON.parse(lastWrite![1]);
    expect(persistedPayload.state.isHalftimeBreakActive).toBe(true);
    expect(persistedPayload.state.halftimeTimerStartedAt).toBe(halftimeTimerStartedAt);
    expect(persistedPayload.state.halftimeTimerDurationSeconds).toBe(
      DEFAULT_HALFTIME_BREAK_SECONDS,
    );
  });

  it('persists a partial next-point line without adding it to game history', () => {
    createGame();
    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    const afterPointId = getCurrentGame()?.points[0].id;
    useAdvancedTrackingStore
      .getState()
      .savePendingNextPointLineSelection(homeSideId, [august.participantId]);

    expect(useAdvancedTrackingStore.getState().pendingNextPointLineSelection).toEqual({
      gameId: getCurrentGame()?.id,
      afterPointId,
      participantIdsBySide: { [homeSideId]: [august.participantId] },
    });
    expect(getCurrentGame()?.points).toHaveLength(1);

    const advancedTrackingWrites = mockedAsyncStorage.setItem.mock.calls.filter(
      ([key]) => key === 'ultimatestats_advanced_tracking',
    );
    const persistedPayload = JSON.parse(advancedTrackingWrites.at(-1)![1]);
    expect(persistedPayload.state.pendingNextPointLineSelection).toEqual(
      useAdvancedTrackingStore.getState().pendingNextPointLineSelection,
    );
  });

  it('keeps the pending next-point line when halftime starts', () => {
    createGame();
    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });
    useAdvancedTrackingStore
      .getState()
      .savePendingNextPointLineSelection(homeSideId, [august.participantId]);

    const pendingSelection = useAdvancedTrackingStore.getState().pendingNextPointLineSelection;

    expect(useAdvancedTrackingStore.getState().triggerHalftimeEarly()).toBe(true);
    expect(useAdvancedTrackingStore.getState().pendingNextPointLineSelection).toEqual(
      pendingSelection,
    );
  });

  it('keeps the pending next-point line when its completed game reloads', async () => {
    createGame();
    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });
    useAdvancedTrackingStore
      .getState()
      .savePendingNextPointLineSelection(homeSideId, [august.participantId]);

    const game = getCurrentGame()!;
    const pendingSelection = useAdvancedTrackingStore.getState().pendingNextPointLineSelection;
    useAdvancedTrackingStore.setState({ currentGame: null });
    const loadGameSpy = jest
      .spyOn(useSavedAdvancedGamesStore.getState(), 'loadGame')
      .mockResolvedValue(game);

    await useAdvancedTrackingStore.getState().loadCurrentGame();

    expect(useAdvancedTrackingStore.getState().pendingNextPointLineSelection).toEqual(
      pendingSelection,
    );
    loadGameSpy.mockRestore();
  });

  it('keeps pending next-point selections separate for each tracked side', () => {
    const { lightIds, darkIds } = createDualTrackedScrimmage();
    useAdvancedTrackingStore.getState().recordThrow({
      thrower: { refType: 'participant', participantId: lightIds[0] },
      result: 'goal',
      toPlayer: { refType: 'participant', participantId: lightIds[1] },
    });

    useAdvancedTrackingStore
      .getState()
      .savePendingNextPointLineSelection(homeSideId, lightIds.slice(0, 3));
    useAdvancedTrackingStore
      .getState()
      .savePendingNextPointLineSelection(awaySideId, darkIds.slice(0, 2));

    expect(
      useAdvancedTrackingStore.getState().pendingNextPointLineSelection?.participantIdsBySide,
    ).toEqual({
      [homeSideId]: lightIds.slice(0, 3),
      [awaySideId]: darkIds.slice(0, 2),
    });
  });

  it('clears the pending next-point line when the pull creates that point', () => {
    createGame();
    useAdvancedTrackingStore
      .getState()
      .savePendingNextPointLineSelection(homeSideId, [august.participantId]);

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    expect(useAdvancedTrackingStore.getState().pendingNextPointLineSelection).toBeNull();
  });

  it('clears the pending next-point line when undo reopens the completed point', () => {
    createGame();
    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });
    useAdvancedTrackingStore
      .getState()
      .savePendingNextPointLineSelection(homeSideId, [august.participantId]);

    useAdvancedTrackingStore.getState().undoLastOperation();

    expect(useAdvancedTrackingStore.getState().pendingNextPointLineSelection).toBeNull();
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
    const { currentGame } = useAdvancedTrackingStore.getState();
    expect(currentGame!.settings.format?.halftimeAt).toBe(6);
  });

  it('recordPull creates the point and records the pull atomically', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLines,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    const game = getCurrentGame() as AdvancedTrackedGame;
    expect(game.points).toHaveLength(1);
    expect(game.points[0].lines).toEqual(homeLines);
    expect(game.points[0].startedAt).toBeDefined();
    expect(game.points[0].possessions).toHaveLength(1);
    expect(game.points[0].possessions[0].actions[0].kind).toBe('pull');
  });

  it('records an anonymous opponent outcome in one update and returns the outcome action id', () => {
    createGame();
    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLines,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore.getState().recordCaptureIntent({ kind: 'pickup', player: august });
    useAdvancedTrackingStore.getState().recordCaptureIntent({ kind: 'throwaway' });

    const listener = jest.fn();
    const unsubscribe = useAdvancedTrackingStore.subscribe(listener);
    const result = useAdvancedTrackingStore
      .getState()
      .recordCaptureIntent({ kind: 'anonymous-opponent-goal' });
    unsubscribe();

    expect(result.ok).toBe(true);
    const opponentActions = getCurrentPoint(getCurrentGame())?.possessions[1].actions ?? [];
    expect(opponentActions.map((action) => action.kind)).toEqual(['disc_pickup', 'throw']);
    expect(result).toEqual({ ok: true, actionId: opponentActions[1].id });
    expect(result).not.toEqual({ ok: true, actionId: opponentActions[0].id });
    expect(listener).toHaveBeenCalledTimes(1);

    expect(useAdvancedTrackingStore.getState().undoLastOperation()).toBe(true);
    expect(getCurrentPoint(getCurrentGame())?.possessions[1].actions).toEqual([
      expect.objectContaining({ kind: 'disc_pickup', player: untracked }),
    ]);
  });

  it('records and undoes a direct self-goal with the existing goal and assist attribution', () => {
    createGame();
    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLines,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore.getState().recordCaptureIntent({ kind: 'pickup', player: august });

    const result = useAdvancedTrackingStore
      .getState()
      .recordCaptureIntent({ kind: 'goal', scorer: august });
    expect(result.ok).toBe(true);

    const game = getCurrentGame()!;
    const goalAction = getCurrentPoint(game)?.possessions[0].actions.at(-1);
    expect(goalAction).toMatchObject({
      kind: 'throw',
      result: 'goal',
      thrower: august,
      toPlayer: august,
    });
    const selfGoalAttributions = buildAnalyticsGame(game).attributions.filter(
      (attribution) =>
        attribution.participantId === august.participantId &&
        (attribution.type === 'goal' || attribution.type === 'assist'),
    );
    expect(selfGoalAttributions.map((attribution) => attribution.type).sort()).toEqual([
      'assist',
      'goal',
    ]);

    expect(useAdvancedTrackingStore.getState().undoLastOperation()).toBe(true);
    const revivedPoint = getCurrentPoint(getCurrentGame());
    expect(revivedPoint?.possessions[0].actions.at(-1)).toMatchObject({ kind: 'disc_pickup' });
    expect(revivedPoint?.revivedAt).toBeDefined();
    expect(getGameScore(getCurrentGame()!)).toEqual({ [homeSideId]: 0, [awaySideId]: 0 });
  });

  it('records a simple hold and builds analytics from the game', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLines,
      puller: untracked,
      receiver: august,
      result: 'inbound',
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
      result: 'inbound',
    });
    useAdvancedTrackingStore.getState().recordThrow({ thrower: august, result: 'throwaway' });
    useAdvancedTrackingStore.getState().recordPickup({ sideId: awaySideId, player: untracked });

    const point = getCurrentPoint(getCurrentGame());

    expect(point?.possessions).toHaveLength(2);
    expect(point?.possessions[0].sideId).toBe(homeSideId);
    expect(point?.possessions[1].sideId).toBe(awaySideId);
    expect(point?.possessions[1].actions[0].kind).toBe('disc_pickup');
  });

  it('attaches throw details to a throwaway and undoes them with the turnover', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    const actionId = useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'throwaway' });
    const point = getCurrentPoint(getCurrentGame())!;
    const possession = point.possessions[0];
    const undoCountBeforeClassification = useAdvancedTrackingStore.getState().undoStack.length;

    useAdvancedTrackingStore.getState().updateThrowType({
      pointId: point.id,
      possessionId: possession.id,
      actionId,
      type: 'huck',
    });

    const classifiedAction = getCurrentPoint(getCurrentGame())?.possessions[0].actions.at(-1);
    expect(classifiedAction).toMatchObject({
      id: actionId,
      kind: 'throw',
      result: 'throwaway',
      details: { type: 'huck' },
    });
    expect(useAdvancedTrackingStore.getState().undoStack).toHaveLength(
      undoCountBeforeClassification,
    );

    useAdvancedTrackingStore.getState().updateThrowType({
      pointId: point.id,
      possessionId: possession.id,
      actionId,
      type: undefined,
    });
    expect(getCurrentPoint(getCurrentGame())?.possessions[0].actions.at(-1)).toMatchObject({
      id: actionId,
      kind: 'throw',
      result: 'throwaway',
    });
    expect(getCurrentPoint(getCurrentGame())?.possessions[0].actions.at(-1)).not.toHaveProperty(
      'details',
    );

    expect(useAdvancedTrackingStore.getState().undoLastOperation()).toBe(true);
    expect(getCurrentPoint(getCurrentGame())?.possessions[0].actions).toHaveLength(2);
    expect(getCurrentPoint(getCurrentGame())?.possessions[0].actions.at(-1)?.kind).toBe(
      'disc_pickup',
    );
  });

  it('rejects backfield reset details on a completed throw', () => {
    createGame();
    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLines,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    const actionId = useAdvancedTrackingStore.getState().recordThrow({
      thrower: august,
      toPlayer: meves,
      result: 'complete',
    });
    const point = getCurrentPoint(getCurrentGame())!;

    expect(() =>
      useAdvancedTrackingStore.getState().updateThrowType({
        pointId: point.id,
        possessionId: point.possessions[0].id,
        actionId,
        type: 'backfield_reset',
      }),
    ).toThrow('Backfield reset details require a turnover result');
  });

  it('attaches huck details to a completed throw', () => {
    createGame();
    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLines,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    const actionId = useAdvancedTrackingStore.getState().recordThrow({
      thrower: august,
      toPlayer: meves,
      result: 'complete',
    });
    const point = getCurrentPoint(getCurrentGame())!;

    useAdvancedTrackingStore.getState().updateThrowType({
      pointId: point.id,
      possessionId: point.possessions[0].id,
      actionId,
      type: 'huck',
    });

    expect(getCurrentPoint(getCurrentGame())?.possessions[0].actions.at(-1)).toMatchObject({
      id: actionId,
      result: 'complete',
      details: { type: 'huck' },
    });
  });

  it('rejects throw details for an anonymous side', () => {
    createGame();
    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore.getState().recordThrow({ thrower: august, result: 'throwaway' });
    useAdvancedTrackingStore.getState().recordPickup({ sideId: awaySideId, player: untracked });
    const actionId = useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: untracked, result: 'throwaway' });
    const point = getCurrentPoint(getCurrentGame())!;
    const possession = point.possessions.at(-1)!;

    expect(() =>
      useAdvancedTrackingStore.getState().updateThrowType({
        pointId: point.id,
        possessionId: possession.id,
        actionId,
        type: 'huck',
      }),
    ).toThrow('fully tracked sides');
  });

  it('undoes the last action and removes an empty turnover possession', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
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
      result: 'inbound',
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
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    // Point 2: pull recorded with different lines
    useAdvancedTrackingStore.getState().recordPull({
      lines: point2Lines,
      puller: untracked,
      result: 'inbound',
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
    expect(point?.possessions[0].actions.at(-1)?.kind).toBe('disc_pickup');
  });

  it('resetCurrentGame removes the in-progress game from savedGames', () => {
    createGame();
    expect(useAdvancedTrackingStore.getState().currentGame).not.toBeNull();

    useAdvancedTrackingStore.getState().resetCurrentGame();
    const { currentGameId, currentGame } = useAdvancedTrackingStore.getState();

    expect(currentGameId).toBeNull();
    expect(currentGame).toBeNull();
  });

  it('deleteSavedGame clears currentGameId when deleting the active game', async () => {
    const gameId = createGame();
    await useAdvancedTrackingStore.getState().deleteSavedGame(gameId);
    const { currentGameId, currentGame } = useAdvancedTrackingStore.getState();

    expect(currentGameId).toBeNull();
    expect(currentGame).toBeNull();
  });

  it('finalizeGame throws if the game has not reached a valid game-over state', async () => {
    createGame();

    await expect(useAdvancedTrackingStore.getState().finalizeGame()).rejects.toThrow(
      'Cannot finalize game before it is over.',
    );
  });

  it('terminateGame sets status to terminated with endReason', () => {
    const gameId = createGame();
    useAdvancedTrackingStore.getState().terminateGame('weather');
    const { currentGameId, currentGame } = useAdvancedTrackingStore.getState();

    expect(currentGameId).toBe(gameId);
    expect(currentGame!.id).toBe(gameId);
    expect(currentGame!.status).toBe('terminated');
    expect(currentGame!.endReason).toBe('weather');
  });

  it('finishTerminatedGame clears the current game pointer without deleting the saved game', async () => {
    const gameId = createGame();
    useAdvancedTrackingStore.getState().terminateGame('manual');
    await useAdvancedTrackingStore.getState().finishTerminatedGame();
    const { currentGameId, currentGame } = useAdvancedTrackingStore.getState();

    expect(currentGameId).toBeNull();
    expect(currentGame!.id).toBe(gameId);
    expect(currentGame!.status).toBe('terminated');
  });

  it('updateGameMetadata replaces the metadata on the active game', async () => {
    createGame();
    await useAdvancedTrackingStore
      .getState()
      .updateGameMetadata({ title: 'Updated Title', location: 'Field A' });

    const game = getCurrentGame() as AdvancedTrackedGame;
    expect(game.metadata?.title).toBe('Updated Title');
    expect(game.metadata?.location).toBe('Field A');
  });

  it('corrects a completed current-game touch without changing score undo behavior', async () => {
    createGame();
    const casey = { refType: 'participant' as const, participantId: 'p-casey' };
    const initialGame = getCurrentGame()!;
    useAdvancedTrackingStore.setState({
      currentGame: {
        ...initialGame,
        participants: [...initialGame.participants, { id: casey.participantId, name: 'Casey' }],
      },
    });
    useAdvancedTrackingStore.getState().recordPull({
      lines: [
        {
          sideId: homeSideId,
          participantIds: [...homeLines[0].participantIds, casey.participantId],
        },
      ],
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    const gameBeforeCorrection = getCurrentGame()!;
    const point = gameBeforeCorrection.points[0];
    const possession = point.possessions[0];
    const action = possession.actions.at(-1)!;
    const undoStackBeforeCorrection = [...useAdvancedTrackingStore.getState().undoStack];
    jest.clearAllMocks();

    await useAdvancedTrackingStore.getState().correctCurrentTouch({
      pointId: point.id,
      possessionId: possession.id,
      touchId: `terminal-receiver:${action.id}`,
      participantId: casey.participantId,
    });

    expect(getCurrentGame()?.points[0].possessions[0].actions.at(-1)).toMatchObject({
      kind: 'throw',
      toPlayer: casey,
    });
    expect(useAdvancedTrackingStore.getState().undoStack).toEqual(undoStackBeforeCorrection);
    expect(upsertAdvancedGame).toHaveBeenCalledTimes(1);

    expect(useAdvancedTrackingStore.getState().undoLastOperation()).toBe(true);
    expect(getCurrentGame()?.points[0].possessions[0].actions.at(-1)?.kind).toBe('disc_pickup');
  });

  it('corrects a completed turnover atomically without adding an undo entry', async () => {
    createGame();
    const casey = { refType: 'participant' as const, participantId: 'p-casey' };
    const initialGame = getCurrentGame()!;
    useAdvancedTrackingStore.setState({
      currentGame: {
        ...initialGame,
        participants: [...initialGame.participants, { id: casey.participantId, name: 'Casey' }],
      },
    });
    useAdvancedTrackingStore.getState().recordPull({
      lines: [
        {
          sideId: homeSideId,
          participantIds: [august.participantId, meves.participantId, casey.participantId],
        },
      ],
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore.getState().recordThrow({
      thrower: august,
      result: 'complete',
      toPlayer: meves,
    });
    useAdvancedTrackingStore.getState().recordThrow({ thrower: meves, result: 'throwaway' });
    useAdvancedTrackingStore.getState().recordCaptureIntent({ kind: 'anonymous-opponent-goal' });

    const gameBeforeCorrection = getCurrentGame()!;
    const point = gameBeforeCorrection.points[0];
    const possession = point.possessions[0];
    const turnover = possession.actions.at(-1)!;
    if (turnover.kind !== 'throw') throw new Error('Expected a turnover throw.');
    const undoStackBeforeCorrection = [...useAdvancedTrackingStore.getState().undoStack];
    jest.clearAllMocks();

    await useAdvancedTrackingStore.getState().correctCurrentTurnover({
      pointId: point.id,
      possessionId: possession.id,
      actionId: turnover.id,
      result: 'drop',
      throwerParticipantId: casey.participantId,
      receiverParticipantId: casey.participantId,
    });

    const correctedActions = getCurrentGame()?.points[0].possessions[0].actions;
    const correctedCompletion = correctedActions?.find(
      (action) => action.kind === 'throw' && action.result === 'complete',
    );
    const correctedTurnover = correctedActions?.find((action) => action.id === turnover.id);
    expect(correctedCompletion).toMatchObject({
      toPlayer: casey,
    });
    expect(correctedTurnover).toMatchObject({
      result: 'drop',
      thrower: casey,
      toPlayer: casey,
    });
    expect(useAdvancedTrackingStore.getState().undoStack).toEqual(undoStackBeforeCorrection);
    expect(upsertAdvancedGame).toHaveBeenCalledTimes(1);
  });

  it('keeps metadata absent when creating a game without metadata', () => {
    useAdvancedTrackingStore.getState().createGame({
      focusSideId: homeSideId,
      initialReceivingSideId: homeSideId,
      sides: [
        { id: homeSideId, label: 'Home', trackingMode: 'full-roster' },
        { id: awaySideId, label: 'Away', trackingMode: 'anonymous' },
      ],
      participants: [],
      format: { gameTo: 15 },
    });

    expect(getCurrentGame()?.metadata).toBeUndefined();
  });

  it('normalizes private notes when updating active-game metadata', async () => {
    createGame();
    const oversizedNote = `  ${'n'.repeat(MAX_ADVANCED_GAME_NOTE_LENGTH + 20)}  `;

    await useAdvancedTrackingStore
      .getState()
      .updateGameMetadata({ title: 'Showcase Game', notes: oversizedNote });

    expect(getCurrentGame()?.metadata?.notes).toHaveLength(MAX_ADVANCED_GAME_NOTE_LENGTH);

    await useAdvancedTrackingStore
      .getState()
      .updateGameMetadata({ title: 'Showcase Game', notes: '   ' });

    expect(getCurrentGame()?.metadata).toEqual({ title: 'Showcase Game' });
    expect(getCurrentGame()?.metadata).not.toHaveProperty('notes');
  });

  it('persists a private point note through goal undo and removes it on blank save', async () => {
    createGame();
    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    const pointId = getCurrentGame()!.points[0].id;
    jest.clearAllMocks();

    await useAdvancedTrackingStore
      .getState()
      .updatePointNote({ pointId, note: '  Review the reset spacing.  ' });

    expect(getCurrentGame()?.points[0].note).toBe('Review the reset spacing.');
    expect(upsertAdvancedGame).toHaveBeenCalledTimes(1);

    expect(useAdvancedTrackingStore.getState().undoLastOperation()).toBe(true);
    expect(getCurrentGame()?.points[0].note).toBe('Review the reset spacing.');
    expect(hasPointEnded(getCurrentGame()?.points[0] ?? null)).toBe(false);

    await useAdvancedTrackingStore.getState().updatePointNote({ pointId, note: '   ' });

    expect(getCurrentGame()?.points[0]).not.toHaveProperty('note');
  });

  it('derives halftime automatically when a side reaches halftimeAt', () => {
    createGame(1);

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
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
      result: 'inbound',
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

  it('starts the second half early after the latest completed point', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    const didTrigger = useAdvancedTrackingStore.getState().triggerHalftimeEarly();

    const game = getCurrentGame() as AdvancedTrackedGame;
    expect(didTrigger).toBe(true);
    expect(useAdvancedTrackingStore.getState().isHalftimeBreakActive).toBe(true);
    expect(game.gameTransitions).toEqual([
      {
        id: expect.any(String),
        transitionType: 'halftime',
        afterPointId: game.points[0].id,
        triggeredEarly: true,
      },
    ]);
    expect(useAdvancedTrackingStore.getState().undoStack.at(-1)).toEqual({
      kind: 'halftime_early',
      pointId: game.points[0].id,
      transitionId: game.gameTransitions?.[0].id,
    });
  });

  it('does not start the second half early when halftime is disabled', () => {
    useAdvancedTrackingStore.getState().createGame({
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
      format: { gameTo: 15, halftimeEnabled: false },
    });

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    const didTrigger = useAdvancedTrackingStore.getState().triggerHalftimeEarly();

    expect(didTrigger).toBe(false);
    expect(useAdvancedTrackingStore.getState().isHalftimeBreakActive).toBe(false);
    expect(getCurrentGame()?.gameTransitions).toBeUndefined();
  });

  it('undoes an early halftime marker without undoing the scoring point', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    expect(useAdvancedTrackingStore.getState().triggerHalftimeEarly()).toBe(true);

    const didUndo = useAdvancedTrackingStore.getState().undoLastOperation();

    expect(didUndo).toBe(true);
    expect(getCurrentGame()?.gameTransitions).toBeUndefined();
    expect(useAdvancedTrackingStore.getState().isHalftimeBreakActive).toBe(false);
    expect(hasPointEnded(getCurrentPoint(getCurrentGame()))).toBe(true);
  });

  it('can undo the scoring point after undoing early halftime', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    expect(useAdvancedTrackingStore.getState().triggerHalftimeEarly()).toBe(true);
    expect(useAdvancedTrackingStore.getState().undoLastOperation()).toBe(true);
    expect(useAdvancedTrackingStore.getState().undoLastOperation()).toBe(true);

    expect(getCurrentGame()?.gameTransitions).toBeUndefined();
    expect(hasPointEnded(getCurrentPoint(getCurrentGame()))).toBe(false);
  });

  it('preserves early halftime when later scoring re-syncs transitions', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    expect(useAdvancedTrackingStore.getState().triggerHalftimeEarly()).toBe(true);
    useAdvancedTrackingStore.getState().clearHalftimeBreak();

    const halftimePointId = getCurrentGame()?.points[0].id;

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: august,
      receiver: untracked,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: untracked, result: 'goal', toPlayer: untracked });

    expect(getCurrentGame()?.gameTransitions).toEqual([
      {
        id: expect.any(String),
        transitionType: 'halftime',
        afterPointId: halftimePointId,
        triggeredEarly: true,
      },
    ]);
  });

  it('does not start the second half early after a between-point timeout', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });
    useAdvancedTrackingStore.getState().recordBetweenPointTimeout({
      sideId: homeSideId,
      isFloater: false,
    });

    const didTrigger = useAdvancedTrackingStore.getState().triggerHalftimeEarly();

    expect(didTrigger).toBe(false);
    expect(useAdvancedTrackingStore.getState().isHalftimeBreakActive).toBe(false);
    expect(getCurrentGame()?.gameTransitions).toBeUndefined();
  });

  it('re-derives halftime after undo and flips next-point receiving side correctly', () => {
    createGame();

    const scoreHomePoint = () => {
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: untracked,
        receiver: august,
        result: 'inbound',
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
        result: 'inbound',
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
    expect(game.points[14].possessions[0].actions.at(-1)?.kind).toBe('disc_pickup');

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
      result: 'inbound',
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

  describe('halftime disabled (halftimeEnabled: false)', () => {
    function createGameNoHalftime(gameTo = 15): string {
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
        format: { gameTo, halftimeEnabled: false },
      });
    }

    it('does not set halftimeAt on the stored game format', () => {
      createGameNoHalftime();
      const { currentGame } = useAdvancedTrackingStore.getState();
      expect(currentGame!.settings.format?.halftimeAt).toBeUndefined();
    });

    it('does not derive a halftime transition when a side reaches the would-be halftime score', () => {
      createGameNoHalftime(2); // gameTo 2 → would-be halftimeAt 1

      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore
        .getState()
        .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

      const game = getCurrentGame() as AdvancedTrackedGame;
      expect(game.gameTransitions).toBeUndefined();
    });

    it('keeps half: 1 for all points in analytics when halftime is disabled', () => {
      createGameNoHalftime(2);

      const scoreHomePoint = () => {
        useAdvancedTrackingStore.getState().recordPull({
          lines: homeLinesAugust,
          puller: untracked,
          receiver: august,
          result: 'inbound',
        });
        useAdvancedTrackingStore
          .getState()
          .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });
      };

      scoreHomePoint(); // 1-0
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordCaptureIntent({
        kind: 'anonymous-opponent-goal',
      });

      const game = getCurrentGame() as AdvancedTrackedGame;
      const analytics = buildAnalyticsGame(game);
      expect(analytics.points).toHaveLength(2);
      expect(analytics.points.every((p) => p.half === 1)).toBe(true);
    });

    it('does not flip receiving side after the would-be halftime score', () => {
      createGameNoHalftime(2);

      // Home receives first, scores — without halftime, home should pull next (not receive)
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore
        .getState()
        .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

      // Start next point — home scored so away receives (normal rotation, no halftime flip)
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: august,
        receiver: untracked,
        result: 'inbound',
      });

      const game = getCurrentGame() as AdvancedTrackedGame;
      const pt2 = game.points[1];
      expect(pt2.possessions[0].sideId).toBe(awaySideId);
      expect(pt2.possessions[0].actions[0]).toMatchObject({
        kind: 'pull',
        sideId: homeSideId,
        receivingSideId: awaySideId,
      });
    });
  });

  it('recordGameTransition adds a soft_cap transition after the last completed point', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
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
      result: 'inbound',
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
      result: 'inbound',
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
      result: 'inbound',
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
      result: 'inbound',
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
        startedAt: expect.any(Number),
      },
    ]);
  });

  it('undoLastOperation removes the last between-point timeout', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
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
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });
    useAdvancedTrackingStore.getState().recordGameTransition('soft_cap');

    expect(useAdvancedTrackingStore.getState().undoLastOperation()).toBe(true);
    expect(getCurrentGame()?.gameTransitions?.some((t) => t.transitionType === 'soft_cap')).toBe(
      true,
    );
    expect(getCurrentGame()?.points[0].possessions[0].actions.at(-1)?.kind).toBe('disc_pickup');
  });

  it('recordPull throws if a point is already in progress', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    expect(() =>
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: untracked,
        result: 'inbound',
      }),
    ).toThrow('Cannot record a pull while the current point is still in progress.');
  });

  it('recordPickup throws if the sideId does not match the expected next possession side', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
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
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    expect(() =>
      useAdvancedTrackingStore.getState().recordThrow({ thrower: meves, result: 'complete' }),
    ).toThrow('Capture rejected: point-over');
  });

  it('recordThrow throws if the possession has already ended via turnover', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore.getState().recordThrow({ thrower: august, result: 'throwaway' });

    expect(() =>
      useAdvancedTrackingStore.getState().recordThrow({ thrower: august, result: 'complete' }),
    ).toThrow('Capture rejected: holder-required');
  });

  it('recordStoppage adds a stoppage action to the current possession', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    const undoCountBefore = useAdvancedTrackingStore.getState().undoStack.length;

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
    expect(useAdvancedTrackingStore.getState().undoStack).toHaveLength(undoCountBefore);
  });

  it('startGameClockPause records an active game-level delay outside stat undo', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);
    createGame();

    nowSpy.mockReturnValue(2_000);
    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    const undoCountBefore = useAdvancedTrackingStore.getState().undoStack.length;

    nowSpy.mockReturnValue(5_000);
    const pauseId = useAdvancedTrackingStore.getState().startGameClockPause('manual');

    const game = getCurrentGame();
    expect(game?.gameClockPauses).toEqual([
      {
        id: pauseId,
        reason: 'manual',
        pausedAt: 5_000,
        pointId: game?.points[0].id,
      },
    ]);
    expect(useAdvancedTrackingStore.getState().undoStack).toHaveLength(undoCountBefore);

    nowSpy.mockRestore();
  });

  it('resumeGameClockPause completes the active delay without adding to stat undo', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);
    createGame();
    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    nowSpy.mockReturnValue(5_000);
    const pauseId = useAdvancedTrackingStore.getState().startGameClockPause('manual');
    const undoCountBefore = useAdvancedTrackingStore.getState().undoStack.length;

    nowSpy.mockReturnValue(15_000);
    useAdvancedTrackingStore.getState().resumeGameClockPause(pauseId);

    expect(getCurrentGame()?.gameClockPauses?.[0]).toMatchObject({
      id: pauseId,
      resumedAt: 15_000,
    });
    expect(useAdvancedTrackingStore.getState().undoStack).toHaveLength(undoCountBefore);

    nowSpy.mockRestore();
  });

  it('resumeStoppage sets resumedAt on the stoppage action', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
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

  it('resumeStoppage does not add to the stat undo stack', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    const stoppageId = useAdvancedTrackingStore.getState().recordStoppage({ reason: 'injury' });
    const undoCountBefore = useAdvancedTrackingStore.getState().undoStack.length;
    useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);

    const point = getCurrentPoint(getCurrentGame());
    const lastAction = point?.possessions[0].actions.at(-1);

    if (lastAction?.kind === 'stoppage') {
      expect(lastAction.resumedAt).toBeDefined();
    } else {
      fail('Expected last action to be a stoppage');
    }
    expect(useAdvancedTrackingStore.getState().undoStack).toHaveLength(undoCountBefore);
  });

  it('undo after an injury stoppage removes the last stat action and keeps the injury records', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLines,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore.getState().recordThrow({
      thrower: august,
      toPlayer: meves,
      result: 'complete',
    });

    const stoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: homeSideId,
      changes: [
        {
          sideId: homeSideId,
          inIds: [],
          outIds: [meves.participantId],
        },
      ],
    });
    useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);

    expect(useAdvancedTrackingStore.getState().undoLastOperation()).toBe(true);

    const point = getCurrentPoint(getCurrentGame());
    expect(point?.subs).toHaveLength(1);
    expect(point?.possessions[0].actions.map((action) => action.kind)).toEqual([
      'pull',
      'disc_pickup',
      'stoppage',
    ]);
  });

  it('recordInjurySubs attaches a PointSub to the current point', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    const undoCountBefore = useAdvancedTrackingStore.getState().undoStack.length;
    const stoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: homeSideId,
      changes: [
        {
          sideId: homeSideId,
          inIds: [meves.participantId],
          outIds: [august.participantId],
        },
      ],
    });

    const point = getCurrentPoint(getCurrentGame());
    expect(point?.subs).toHaveLength(1);
    expect(point?.subs![0].stoppageActionId).toBe(stoppageId);
    expect(point?.subs![0].inIds).toEqual([meves.participantId]);
    expect(point?.subs![0].outIds).toEqual([august.participantId]);
    expect(point?.subs![0].type).toBe('injury');
    expect(useAdvancedTrackingStore.getState().undoStack).toHaveLength(undoCountBefore);
  });

  it('recordInjurySubs appends multiple injury subs in the same point', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    const firstStoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: homeSideId,
      changes: [
        {
          sideId: homeSideId,
          inIds: [meves.participantId],
          outIds: [august.participantId],
        },
      ],
    });
    useAdvancedTrackingStore.getState().resumeStoppage(firstStoppageId);

    const secondStoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: homeSideId,
      changes: [
        {
          sideId: homeSideId,
          inIds: [august.participantId],
          outIds: [meves.participantId],
        },
      ],
    });

    const point = getCurrentPoint(getCurrentGame());
    expect(point?.subs).toHaveLength(2);
    expect(point?.subs?.map((sub) => sub.stoppageActionId)).toEqual([
      firstStoppageId,
      secondStoppageId,
    ]);
    expect(getEffectiveLineParticipantIds(point!, homeSideId)).toEqual([august.participantId]);
  });

  it('recordInjurySubs rejects duplicate side changes for one stoppage', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    expect(() =>
      useAdvancedTrackingStore.getState().recordInjurySubs({
        sideId: homeSideId,
        changes: [
          {
            sideId: homeSideId,
            inIds: [meves.participantId],
            outIds: [august.participantId],
          },
          {
            sideId: homeSideId,
            inIds: [meves.participantId],
            outIds: [august.participantId],
          },
        ],
      }),
    ).toThrow('Only one injury sub per side');
  });

  it('updateInjurySubs changes only subs linked to the active stoppage', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    const firstStoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: homeSideId,
      changes: [
        {
          sideId: homeSideId,
          inIds: [meves.participantId],
          outIds: [august.participantId],
        },
      ],
    });
    useAdvancedTrackingStore.getState().resumeStoppage(firstStoppageId);

    const secondStoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: homeSideId,
      changes: [
        {
          sideId: homeSideId,
          inIds: [august.participantId],
          outIds: [meves.participantId],
        },
      ],
    });

    useAdvancedTrackingStore.getState().updateInjurySubs({
      stoppageActionId: secondStoppageId,
      changes: [],
    });

    const point = getCurrentPoint(getCurrentGame());
    expect(point?.subs).toHaveLength(1);
    expect(point?.subs?.[0]).toMatchObject({
      stoppageActionId: firstStoppageId,
      inIds: [meves.participantId],
      outIds: [august.participantId],
    });
  });

  it('rejects updating an injury substitution after the point has ended', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    const stoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: homeSideId,
      changes: [
        {
          sideId: homeSideId,
          inIds: [meves.participantId],
          outIds: [august.participantId],
        },
      ],
    });
    useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);
    useAdvancedTrackingStore.getState().recordPickup({ sideId: homeSideId, player: meves });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: meves, toPlayer: august, result: 'goal' });

    expect(() =>
      useAdvancedTrackingStore.getState().updateInjurySubs({
        stoppageActionId: stoppageId,
        changes: [],
      }),
    ).toThrow('Cannot update an injury substitution after the point has ended.');
  });

  it('records valid substitutions for both tracked sides at one injury stoppage', () => {
    const { lightIds, darkIds, lightBenchId, darkBenchId } = createDualTrackedScrimmage();

    const stoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
      changes: [
        {
          sideId: homeSideId,
          inIds: [lightBenchId],
          outIds: [lightIds[0]],
        },
        {
          sideId: awaySideId,
          inIds: [darkBenchId],
          outIds: [darkIds[0]],
        },
      ],
    });

    const point = getCurrentPoint(getCurrentGame());
    expect(point?.subs).toHaveLength(2);
    expect(point?.subs?.every((sub) => sub.stoppageActionId === stoppageId)).toBe(true);
    expect(getEffectiveLineParticipantIds(point!, homeSideId)).toContain(lightBenchId);
    expect(getEffectiveLineParticipantIds(point!, awaySideId)).toContain(darkBenchId);
  });

  it('rejects moving a participant to the other side after a point starts', () => {
    const { lightIds, darkIds, lightBenchId } = createDualTrackedScrimmage();

    const firstStoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: homeSideId,
      changes: [
        {
          sideId: homeSideId,
          inIds: [lightBenchId],
          outIds: [lightIds[0]],
        },
      ],
    });
    useAdvancedTrackingStore.getState().resumeStoppage(firstStoppageId);

    expect(() =>
      useAdvancedTrackingStore.getState().recordInjurySubs({
        sideId: awaySideId,
        changes: [
          {
            sideId: awaySideId,
            inIds: [lightIds[0]],
            outIds: [darkIds[0]],
          },
        ],
      }),
    ).toThrow('cannot change sides after a point has started');
  });

  it('cancelStoppage removes the active stoppage and linked sub', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    const stoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: homeSideId,
      changes: [
        {
          sideId: homeSideId,
          inIds: [meves.participantId],
          outIds: [august.participantId],
        },
      ],
    });

    expect(getCurrentPoint(getCurrentGame())?.subs).toHaveLength(1);

    useAdvancedTrackingStore.getState().cancelStoppage(stoppageId);

    const point = getCurrentPoint(getCurrentGame());
    expect(point?.subs).toBeUndefined();
    expect(point?.possessions[0].actions.at(-1)?.kind).toBe('pull');
  });

  it('cancelStoppage removes a timeout stoppage without subs', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    const stoppageId = useAdvancedTrackingStore
      .getState()
      .recordStoppage({ reason: 'timeout', sideId: homeSideId });

    const pointBefore = getCurrentPoint(getCurrentGame());
    expect(pointBefore?.possessions[0].actions.at(-1)?.kind).toBe('stoppage');

    useAdvancedTrackingStore.getState().cancelStoppage(stoppageId);

    const pointAfter = getCurrentPoint(getCurrentGame());
    expect(pointAfter?.possessions[0].actions.at(-1)?.kind).toBe('pull');
  });

  it('cancelStoppage throws after the stoppage has been resumed', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    const stoppageId = useAdvancedTrackingStore.getState().recordStoppage({ reason: 'injury' });
    useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);

    expect(() => useAdvancedTrackingStore.getState().cancelStoppage(stoppageId)).toThrow(
      'Cannot cancel a stoppage after it has resumed.',
    );
  });

  it('cancelStoppage throws when the action is not the last action', () => {
    createGame();

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });

    const firstStoppageId = useAdvancedTrackingStore
      .getState()
      .recordStoppage({ reason: 'manual_pause' });
    useAdvancedTrackingStore.getState().resumeStoppage(firstStoppageId);

    useAdvancedTrackingStore.getState().recordThrow({
      thrower: august,
      result: 'complete',
    });

    expect(() => useAdvancedTrackingStore.getState().cancelStoppage(firstStoppageId)).toThrow(
      `Stoppage action "${firstStoppageId}" not found as last action.`,
    );
  });

  it('cancelStoppage throws when there is no active game', () => {
    expect(() => useAdvancedTrackingStore.getState().cancelStoppage('nonexistent')).toThrow(
      'No active game.',
    );
  });

  it('cancelStoppage throws when there are no points yet', () => {
    createGame();
    expect(() => useAdvancedTrackingStore.getState().cancelStoppage('nonexistent')).toThrow(
      'No active point.',
    );
  });

  it('finalizeGame succeeds when the score reaches the effective gameTo target', async () => {
    createGame(1);

    useAdvancedTrackingStore.getState().recordPull({
      lines: homeLinesAugust,
      puller: untracked,
      receiver: august,
      result: 'inbound',
    });
    useAdvancedTrackingStore
      .getState()
      .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

    await useAdvancedTrackingStore.getState().finalizeGame();

    expect(useAdvancedTrackingStore.getState().currentGameId).toBeNull();
    expect(useAdvancedTrackingStore.getState().currentGame!.status).toBe('final');
  });

  describe('cap transition auto-recording', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    beforeEach(() => {
      jest.setSystemTime(0);
      useSettingsStore.setState({ hardCapMins: 90, softCapMins: 20, advancedSoftCapAtMins: 70 });
    });

    function setupGameAndPull(formatOverrides: Partial<CreateAdvancedGameInput['format']> = {}) {
      useAdvancedTrackingStore.getState().createGame({
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
        format: {
          gameTo: 15,
          softCapEnabled: true,
          hardCapEnabled: true,
          ...formatOverrides,
        },
      });
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
    }

    function recordGoalAtElapsedMinutes(minutes: number) {
      jest.setSystemTime(minutes * 60_000);
      useAdvancedTrackingStore
        .getState()
        .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });
    }

    function getCurrentGameTransitions() {
      return getCurrentGame()?.gameTransitions ?? [];
    }

    it('records soft_cap when a goal crosses the soft cap threshold', () => {
      setupGameAndPull();
      recordGoalAtElapsedMinutes(70);

      const transitions = getCurrentGameTransitions();
      expect(transitions).toHaveLength(1);
      expect(transitions[0]).toMatchObject({
        transitionType: 'soft_cap',
        afterPointId: getCurrentGame()!.points[0].id,
      });
    });

    it('records hard_cap when a goal crosses the hard cap threshold', () => {
      setupGameAndPull();
      recordGoalAtElapsedMinutes(90);

      const transitions = getCurrentGameTransitions();
      // Hard-cap threshold (90 min) also crosses the soft-cap threshold (70 min),
      // so both transitions are recorded.
      expect(transitions).toHaveLength(2);
      expect(transitions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            transitionType: 'soft_cap',
            afterPointId: getCurrentGame()!.points[0].id,
          }),
          expect.objectContaining({
            transitionType: 'hard_cap',
            afterPointId: getCurrentGame()!.points[0].id,
          }),
        ]),
      );
    });

    it('records both caps when a goal crosses both thresholds', () => {
      setupGameAndPull();
      recordGoalAtElapsedMinutes(95);

      const types = getCurrentGameTransitions()
        .map((t) => t.transitionType)
        .sort();
      expect(types).toEqual(['hard_cap', 'soft_cap']);
    });

    it('records only soft_cap when soft cap is enabled and hard cap is disabled', () => {
      setupGameAndPull({ hardCapEnabled: false });
      recordGoalAtElapsedMinutes(95);

      expect(getCurrentGameTransitions().map((t) => t.transitionType)).toEqual(['soft_cap']);
    });

    it('records only hard_cap when hard cap is enabled and soft cap is disabled', () => {
      setupGameAndPull({ softCapEnabled: false });
      recordGoalAtElapsedMinutes(95);

      expect(getCurrentGameTransitions().map((t) => t.transitionType)).toEqual(['hard_cap']);
    });

    it('records no cap transitions when neither cap is enabled', () => {
      setupGameAndPull({
        softCapEnabled: false,
        hardCapEnabled: false,
      });
      recordGoalAtElapsedMinutes(95);

      expect(getCurrentGameTransitions()).toHaveLength(0);
    });

    it('does not record a cap before the threshold', () => {
      setupGameAndPull();
      recordGoalAtElapsedMinutes(60);

      expect(getCurrentGameTransitions()).toHaveLength(0);
    });

    it('does not record soft_cap from wall-clock time spent in a game clock pause', () => {
      setupGameAndPull();
      jest.setSystemTime(65 * 60_000);
      const pauseId = useAdvancedTrackingStore.getState().startGameClockPause('manual');
      jest.setSystemTime(75 * 60_000);
      useAdvancedTrackingStore.getState().resumeGameClockPause(pauseId);

      recordGoalAtElapsedMinutes(75);

      expect(getCurrentGameTransitions()).toHaveLength(0);
    });

    it('records soft_cap once adjusted game-clock time reaches the threshold after a pause', () => {
      setupGameAndPull();
      jest.setSystemTime(65 * 60_000);
      const pauseId = useAdvancedTrackingStore.getState().startGameClockPause('manual');
      jest.setSystemTime(75 * 60_000);
      useAdvancedTrackingStore.getState().resumeGameClockPause(pauseId);

      recordGoalAtElapsedMinutes(80);

      expect(getCurrentGameTransitions()).toEqual([
        expect.objectContaining({
          transitionType: 'soft_cap',
          afterPointId: getCurrentGame()!.points[0].id,
        }),
      ]);
    });

    it('is idempotent — a second goal does not re-add the same cap', () => {
      setupGameAndPull();
      recordGoalAtElapsedMinutes(70);

      jest.setSystemTime(71 * 60_000);
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordCaptureIntent({
        kind: 'anonymous-opponent-turnover',
      });
      useAdvancedTrackingStore.getState().recordCaptureIntent({ kind: 'pickup', player: august });
      jest.setSystemTime(75 * 60_000);
      useAdvancedTrackingStore.getState().recordCaptureIntent({ kind: 'goal', scorer: meves });

      const softCaps = getCurrentGameTransitions().filter((t) => t.transitionType === 'soft_cap');
      expect(softCaps).toHaveLength(1);
    });

    it('keeps the cap transition when the triggering goal is undone', () => {
      setupGameAndPull();
      recordGoalAtElapsedMinutes(70);
      expect(getCurrentGameTransitions()).toHaveLength(1);

      // Undo removes the goal but does not re-evaluate cap transitions
      // (syncCapTransitions is additive-only).
      useAdvancedTrackingStore.getState().undoLastOperation();
      expect(getCurrentGameTransitions()).toHaveLength(1);
      expect(getCurrentGameTransitions()[0]).toMatchObject({
        transitionType: 'soft_cap',
      });
    });

    it('recomputes effectiveGameTo dynamically when the scoring point after soft_cap is undone', () => {
      // Scenario: score is 5-4, timer at 71 min (past soft cap).
      // Home scores → 6-4. Undo goal. Away scores → 5-5.
      // getEffectiveGameTo reads the score THROUGH the soft_cap afterPointId,
      // so it recalculates based on the CURRENT state of that point.
      useAdvancedTrackingStore.getState().createGame({
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
        format: {
          gameTo: 15,
          halftimeEnabled: false,
          softCapEnabled: true,
          hardCapEnabled: true,
        },
      });

      const scoreHomePoint = () => {
        useAdvancedTrackingStore.getState().recordPull({
          lines: homeLinesAugust,
          puller: untracked,
          receiver: august,
          result: 'inbound',
        });
        useAdvancedTrackingStore
          .getState()
          .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });
      };

      const scoreAwayPoint = () => {
        useAdvancedTrackingStore.getState().recordPull({
          lines: homeLinesAugust,
          puller: untracked,
          receiver: untracked,
          result: 'inbound',
        });
        useAdvancedTrackingStore
          .getState()
          .recordThrow({ thrower: untracked, result: 'goal', toPlayer: untracked });
      };

      // Build to 5-4 (home leads)
      for (let i = 0; i < 4; i++) {
        scoreHomePoint();
        scoreAwayPoint();
      }
      scoreHomePoint(); // 5-4

      // Soft-cap time: 71 minutes
      jest.setSystemTime(71 * 60_000);

      // Next point: away receives. Home gets a turnover and scores → 6-4.
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: untracked,
        receiver: untracked,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: untracked,
        result: 'throwaway',
      });
      useAdvancedTrackingStore.getState().recordPickup({ sideId: homeSideId, player: august });
      useAdvancedTrackingStore
        .getState()
        .recordThrow({ thrower: august, result: 'goal', toPlayer: meves });

      let game = getCurrentGame()!;
      expect(getGameScore(game)).toEqual({ [homeSideId]: 6, [awaySideId]: 4 });
      expect(getEffectiveGameTo(game)).toBe(7); // 6 + 1

      // Undo the goal → back to 5-4, point is revived
      useAdvancedTrackingStore.getState().undoLastOperation();
      game = getCurrentGame()!;
      expect(getGameScore(game)).toEqual({ [homeSideId]: 5, [awaySideId]: 4 });
      expect(getEffectiveGameTo(game)).toBe(6); // 5 + 1

      // Home turns it over, away picks up and scores → 5-5
      useAdvancedTrackingStore.getState().recordThrow({ thrower: august, result: 'throwaway' });
      useAdvancedTrackingStore.getState().recordPickup({ sideId: awaySideId, player: untracked });
      useAdvancedTrackingStore
        .getState()
        .recordThrow({ thrower: untracked, result: 'goal', toPlayer: untracked });

      game = getCurrentGame()!;
      expect(getGameScore(game)).toEqual({ [homeSideId]: 5, [awaySideId]: 5 });
      // The soft_cap transition still points to the original (now away-scored) point,
      // so the effective target is based on the score THROUGH that point: 5-5.
      expect(getEffectiveGameTo(game)).toBe(6);
    });
  });

  describe('correctCurrentGamePointActiveLines', () => {
    it('rewrites the canonical line from the desired active lineup', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLines,
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });

      useAdvancedTrackingStore.setState((state: AdvancedTrackingState) => {
        state.currentGame!.participants.push({ id: 'p-bench', name: 'Bench' });
      });
      const newIds = [august.participantId, 'p-bench'];
      void useAdvancedTrackingStore.getState().correctCurrentGamePointActiveLines({
        pointId: getCurrentPoint(getCurrentGame())!.id,
        activeLines: [{ sideId: homeSideId, participantIds: newIds }],
      });

      const point = getCurrentPoint(getCurrentGame());
      const homeLine = point?.lines.find((l) => l.sideId === homeSideId);
      expect(homeLine?.participantIds).toEqual(newIds);
    });

    it('rejects a live correction while a stoppage is active', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordStoppage({ reason: 'timeout' });

      expect(() =>
        useAdvancedTrackingStore.getState().correctCurrentGamePointActiveLines({
          pointId: getCurrentPoint(getCurrentGame())!.id,
          activeLines: [
            {
              sideId: homeSideId,
              participantIds: [august.participantId, meves.participantId],
            },
          ],
        }),
      ).toThrow('Finish or cancel the active stoppage before correcting the lineup.');
    });

    it('preserves injury subs when correcting both point lines', () => {
      const { lightIds, darkIds, lightBenchId, darkBenchId, lightCorrectionId, darkCorrectionId } =
        createDualTrackedScrimmage();
      const stoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
        changes: [
          {
            sideId: homeSideId,
            inIds: [lightBenchId],
            outIds: [lightIds[0]],
          },
          {
            sideId: awaySideId,
            inIds: [darkBenchId],
            outIds: [darkIds[0]],
          },
        ],
      });
      useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);

      const pointBefore = getCurrentPoint(getCurrentGame());
      expect(pointBefore?.subs).toHaveLength(2);

      void useAdvancedTrackingStore.getState().correctCurrentGamePointActiveLines({
        pointId: getCurrentPoint(getCurrentGame())!.id,
        activeLines: [
          {
            sideId: homeSideId,
            participantIds: [lightBenchId, lightCorrectionId, ...lightIds.slice(2)],
          },
          {
            sideId: awaySideId,
            participantIds: [darkBenchId, darkCorrectionId, ...darkIds.slice(2)],
          },
        ],
      });

      expect(getCurrentPoint(getCurrentGame())?.subs).toHaveLength(2);
    });

    it('preserves injury subs while one side remains unchanged', () => {
      const { lightIds, lightBenchId, darkIds, darkBenchId, lightCorrectionId } =
        createDualTrackedScrimmage();
      const stoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
        changes: [
          {
            sideId: homeSideId,
            inIds: [lightBenchId],
            outIds: [lightIds[0]],
          },
          {
            sideId: awaySideId,
            inIds: [darkBenchId],
            outIds: [darkIds[0]],
          },
        ],
      });
      useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);

      void useAdvancedTrackingStore.getState().correctCurrentGamePointActiveLines({
        pointId: getCurrentPoint(getCurrentGame())!.id,
        activeLines: [
          {
            sideId: homeSideId,
            participantIds: [lightBenchId, lightCorrectionId, ...lightIds.slice(2)],
          },
          {
            sideId: awaySideId,
            participantIds: [darkBenchId, ...darkIds.slice(1)],
          },
        ],
      });

      const point = getCurrentPoint(getCurrentGame());
      expect(point?.subs).toHaveLength(2);
      expect(point?.subs?.map((sub) => sub.sideId)).toEqual([homeSideId, awaySideId]);
    });

    it('atomically corrects both tracked active lines', () => {
      const { lightIds, darkIds, lightCorrectionId, darkCorrectionId } =
        createDualTrackedScrimmage();

      void useAdvancedTrackingStore.getState().correctCurrentGamePointActiveLines({
        pointId: getCurrentPoint(getCurrentGame())!.id,
        activeLines: [
          {
            sideId: homeSideId,
            participantIds: [lightIds[0], lightCorrectionId, ...lightIds.slice(2)],
          },
          {
            sideId: awaySideId,
            participantIds: [darkIds[0], darkCorrectionId, ...darkIds.slice(2)],
          },
        ],
      });

      const point = getCurrentPoint(getCurrentGame());
      expect(point?.lines.find((line) => line.sideId === homeSideId)?.participantIds).toContain(
        lightCorrectionId,
      );
      expect(point?.lines.find((line) => line.sideId === awaySideId)?.participantIds).toContain(
        darkCorrectionId,
      );
    });

    it('allows actionless players to swap tracked sides atomically', () => {
      const { lightIds, darkIds } = createDualTrackedScrimmage();

      void useAdvancedTrackingStore.getState().correctCurrentGamePointActiveLines({
        pointId: getCurrentPoint(getCurrentGame())!.id,
        activeLines: [
          {
            sideId: homeSideId,
            participantIds: [lightIds[0], darkIds[1], ...lightIds.slice(2)],
          },
          {
            sideId: awaySideId,
            participantIds: [darkIds[0], lightIds[1], ...darkIds.slice(2)],
          },
        ],
      });

      expect(getCurrentPoint(getCurrentGame())?.lines[0].participantIds).toContain(darkIds[1]);
      expect(getCurrentPoint(getCurrentGame())?.lines[1].participantIds).toContain(lightIds[1]);
    });

    it('rejects removing a participant who has recorded an action', () => {
      const { lightIds, darkIds, lightCorrectionId } = createDualTrackedScrimmage();

      expect(() =>
        useAdvancedTrackingStore.getState().correctCurrentGamePointActiveLines({
          pointId: getCurrentPoint(getCurrentGame())!.id,
          activeLines: [
            {
              sideId: homeSideId,
              participantIds: [lightCorrectionId, ...lightIds.slice(1)],
            },
            { sideId: awaySideId, participantIds: darkIds },
          ],
        }),
      ).toThrow(
        'Scrim Player 1 has recorded an action this point, so this correction cannot remove them from the active lineup at that time.',
      );
    });

    it('preserves an injury sub while correcting an unconstrained active player', () => {
      const { lightIds, darkIds, lightBenchId, lightCorrectionId } = createDualTrackedScrimmage();
      const stoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
        changes: [
          {
            sideId: homeSideId,
            inIds: [lightBenchId],
            outIds: [lightIds[1]],
          },
        ],
      });
      useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);

      void useAdvancedTrackingStore.getState().correctCurrentGamePointActiveLines({
        pointId: getCurrentPoint(getCurrentGame())!.id,
        activeLines: [
          {
            sideId: homeSideId,
            participantIds: [lightIds[0], lightCorrectionId, ...lightIds.slice(3), lightBenchId],
          },
          { sideId: awaySideId, participantIds: darkIds },
        ],
      });

      const point = getCurrentPoint(getCurrentGame());
      expect(point?.subs).toHaveLength(1);
      expect(getEffectiveLineParticipantIds(point!, homeSideId)).toContain(lightCorrectionId);
    });

    it('preserves an injury sub when its incoming player records an action', () => {
      const { lightIds, darkIds, lightBenchId, lightCorrectionId } = createDualTrackedScrimmage();
      const stoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
        changes: [
          {
            sideId: homeSideId,
            inIds: [lightBenchId],
            outIds: [lightIds[1]],
          },
        ],
      });
      useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);

      useAdvancedTrackingStore.setState((state: AdvancedTrackingState) => {
        state.currentGame!.points[0].possessions[0].actions.push({
          id: 'bench-pickup',
          kind: 'disc_pickup',
          sideId: homeSideId,
          player: { refType: 'participant', participantId: lightBenchId },
        });
      });

      void useAdvancedTrackingStore.getState().correctCurrentGamePointActiveLines({
        pointId: getCurrentPoint(getCurrentGame())!.id,
        activeLines: [
          {
            sideId: homeSideId,
            participantIds: [lightIds[0], lightCorrectionId, ...lightIds.slice(3), lightBenchId],
          },
          { sideId: awaySideId, participantIds: darkIds },
        ],
      });

      const point = getCurrentPoint(getCurrentGame());
      expect(point?.subs).toHaveLength(1);
      expect(getEffectiveLineParticipantIds(point!, homeSideId)).toContain(lightBenchId);
    });

    it('rejects removing a sub when that would orphan an action participant', () => {
      const { lightIds, darkIds, lightBenchId, lightCorrectionId } = createDualTrackedScrimmage();
      const stoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
        changes: [
          {
            sideId: homeSideId,
            inIds: [lightBenchId],
            outIds: [lightIds[1]],
          },
        ],
      });
      useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);
      useAdvancedTrackingStore.setState((state: AdvancedTrackingState) => {
        state.currentGame!.points[0].possessions[0].actions.push({
          id: 'bench-pickup',
          kind: 'disc_pickup',
          sideId: homeSideId,
          player: { refType: 'participant', participantId: lightBenchId },
        });
      });

      expect(() =>
        useAdvancedTrackingStore.getState().correctCurrentGamePointActiveLines({
          pointId: getCurrentPoint(getCurrentGame())!.id,
          activeLines: [
            {
              sideId: homeSideId,
              participantIds: [lightIds[0], lightCorrectionId, ...lightIds.slice(2)],
            },
            { sideId: awaySideId, participantIds: darkIds },
          ],
        }),
      ).toThrow(
        'Scrim Player 15 entered through a recorded injury substitution and must remain active.',
      );
    });

    it('allows a completed point in the current game to use the same correction action', () => {
      createGame();
      useAdvancedTrackingStore.getState().recordPull({
        lines: homeLinesAugust,
        puller: untracked,
        receiver: august,
        result: 'inbound',
      });
      useAdvancedTrackingStore.getState().recordThrow({
        thrower: august,
        toPlayer: meves,
        result: 'goal',
      });

      const point = getCurrentPoint(getCurrentGame());
      expect(hasPointEnded(point)).toBe(true);

      expect(() =>
        useAdvancedTrackingStore.getState().correctCurrentGamePointActiveLines({
          pointId: getCurrentPoint(getCurrentGame())!.id,
          activeLines: [{ sideId: homeSideId, participantIds: [august.participantId] }],
        }),
      ).not.toThrow();
    });

    it('awaits persistence and leaves the undo stack unchanged', async () => {
      const { lightIds, darkIds, lightBenchId } = createDualTrackedScrimmage();
      const undoStackBefore = [...useAdvancedTrackingStore.getState().undoStack];

      await useAdvancedTrackingStore.getState().correctCurrentGamePointActiveLines({
        pointId: getCurrentPoint(getCurrentGame())!.id,
        activeLines: [
          {
            sideId: homeSideId,
            participantIds: [lightIds[0], lightBenchId, ...lightIds.slice(2)],
          },
          { sideId: awaySideId, participantIds: darkIds },
        ],
      });

      expect(useAdvancedTrackingStore.getState().undoStack).toEqual(undoStackBefore);
      const persistedGame =
        useSavedAdvancedGamesStore.getState().gamesById['dual-tracked-scrimmage'];
      expect(getEffectiveLineParticipantIds(persistedGame.points[0], homeSideId)).toContain(
        lightBenchId,
      );
    });
  });
});
