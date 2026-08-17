import AsyncStorage from '@react-native-async-storage/async-storage';

import { getActiveAdvancedGame } from '@/lib/advancedTracking/trackingUtils';
import { AdvancedTrackedGame, Participant } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';

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

const homeSideId = 'focus-side';
const awaySideId = 'opp-side';

function rosterPlayer(id: string, name: string, isActive = true) {
  return { id, name, isActive, matchingType: null, role: null };
}

function setCurrentTeam(roster: ReturnType<typeof rosterPlayer>[]) {
  useGameStore.setState({
    currentTeam: { id: 'team-1', name: 'Timber', roster },
  });
}

function createGame(participants: Participant[], gameTo = 15) {
  useAdvancedTrackingStore.getState().createGame({
    focusSideId: homeSideId,
    initialReceivingSideId: homeSideId,
    sides: [
      { id: homeSideId, label: 'Timber', sourceTeamId: 'team-1', trackingMode: 'full-roster' },
      { id: awaySideId, label: 'Opponent', trackingMode: 'anonymous' },
    ],
    participants,
    format: { gameTo },
  });
}

function getLiveGame(): AdvancedTrackedGame {
  const game = getActiveAdvancedGame(useAdvancedTrackingStore.getState());
  if (game == null) {
    throw new Error('Expected a live advanced game.');
  }
  return game;
}

function resetStores() {
  useAdvancedTrackingStore.setState({
    currentGameId: null,
    currentGame: null,
    undoStack: [],
    pendingNextPointLineSelection: null,
    isHalftimeBreakActive: false,
  });
  useGameStore.setState({
    currentTeam: { id: 'team-1', name: 'Timber', roster: [] },
    events: [],
    pointLines: [],
  });
}

describe('live roster -> participant sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);
    resetStores();
  });

  it('appends a participant when a player is added to the roster mid-game', () => {
    setCurrentTeam([rosterPlayer('anne', 'Anne')]);
    createGame([{ id: 'anne', name: 'Anne', sourcePlayerId: 'anne' }]);

    const newPlayerId = useGameStore.getState().addPlayer('Newbie');

    expect(newPlayerId).not.toBeNull();
    expect(getLiveGame().participants).toEqual([
      { id: 'anne', name: 'Anne', sourcePlayerId: 'anne' },
      {
        id: newPlayerId!,
        name: 'Newbie',
        sourcePlayerId: newPlayerId!,
        matchingType: null,
        role: null,
      },
    ]);
  });

  it('appends a participant when an inactive-at-start player is reactivated mid-game', () => {
    setCurrentTeam([rosterPlayer('anne', 'Anne'), rosterPlayer('late', 'Late', false)]);
    createGame([{ id: 'anne', name: 'Anne', sourcePlayerId: 'anne' }]);

    const result = useGameStore.getState().updateRosterPlayer('late', { isActive: true });

    expect(result).toBe('updated');
    expect(getLiveGame().participants.map((participant) => participant.id)).toEqual([
      'anne',
      'late',
    ]);
  });

  it('does not append participants when no game is live', () => {
    setCurrentTeam([rosterPlayer('anne', 'Anne')]);

    const newPlayerId = useGameStore.getState().addPlayer('Newbie');

    expect(newPlayerId).not.toBeNull();
    expect(useAdvancedTrackingStore.getState().currentGame).toBeNull();
  });

  it('does not append participants after the game is finalized', () => {
    setCurrentTeam([rosterPlayer('anne', 'Anne')]);
    createGame([{ id: 'anne', name: 'Anne', sourcePlayerId: 'anne' }]);
    useAdvancedTrackingStore.setState((state) => {
      if (state.currentGame != null) state.currentGame.status = 'final';
    });

    useGameStore.getState().addPlayer('Newbie');

    expect(getLiveGame().participants.map((participant) => participant.id)).toEqual(['anne']);
  });

  it('prunes a deactivated zero-action participant from the pending line selection', () => {
    const roster = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'].map((id, index) =>
      rosterPlayer(id, `Player ${index + 1}`),
    );
    setCurrentTeam(roster);
    createGame(
      roster.map((player) => ({
        id: player.id,
        name: player.name,
        sourcePlayerId: player.id,
      })),
    );
    useAdvancedTrackingStore.getState().savePendingNextPointLineSelection(
      homeSideId,
      roster.map((player) => player.id),
    );

    const result = useGameStore.getState().updateRosterPlayer('p3', { isActive: false });

    expect(result).toBe('updated');
    const selection = useAdvancedTrackingStore.getState().pendingNextPointLineSelection;
    expect(selection?.participantIdsBySide[homeSideId]).toEqual([
      'p1',
      'p2',
      'p4',
      'p5',
      'p6',
      'p7',
    ]);
    expect(getLiveGame().participants.map((participant) => participant.id)).toContain('p3');
  });

  it('blocks deactivating a participant who has recorded actions in the live game', () => {
    const roster = [
      rosterPlayer('anne', 'Anne'),
      rosterPlayer('bea', 'Bea'),
      ...['p3', 'p4', 'p5', 'p6', 'p7'].map((id) => rosterPlayer(id, `Player ${id}`)),
    ];
    setCurrentTeam(roster);
    createGame(
      roster.map((player) => ({
        id: player.id,
        name: player.name,
        sourcePlayerId: player.id,
      })),
    );
    const lineIds = roster.map((player) => player.id);
    useAdvancedTrackingStore.getState().recordPull({
      lines: [{ sideId: homeSideId, participantIds: lineIds }],
      puller: { refType: 'untracked' },
      result: 'ob',
    });
    const pickup = useAdvancedTrackingStore.getState().recordCaptureIntent({
      kind: 'pickup',
      player: { refType: 'participant', participantId: 'anne' },
    });

    expect(pickup.ok).toBe(true);

    const result = useGameStore.getState().updateRosterPlayer('anne', { isActive: false });

    expect(result).toBe('blocked-current-game-participation');
    expect(
      useGameStore.getState().currentTeam.roster.find((player) => player.id === 'anne')?.isActive,
    ).toBe(true);
  });

  it('does not append participants for inactive roster players', () => {
    setCurrentTeam([rosterPlayer('anne', 'Anne'), rosterPlayer('bea', 'Bea', false)]);
    createGame([{ id: 'anne', name: 'Anne', sourcePlayerId: 'anne' }]);

    useGameStore.getState().addPlayer('Newbie');

    expect(getLiveGame().participants.map((participant) => participant.id)).toEqual([
      'anne',
      expect.any(String),
    ]);
  });
});
