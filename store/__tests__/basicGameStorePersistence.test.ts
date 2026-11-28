import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadSavedBasicGamesAtStartup } from '@/hooks/basic/useLoadSavedBasicGames';
import { loadAllBasicGames } from '@/lib/basic/savedGameStorage';
import { reportError } from '@/lib/sentry';
import { useGameStore } from '@/store/basic/gameStore';
import type { GameEvent } from '@/store/basic/gameStore.types';
import { useSavedBasicGamesStore } from '@/store/basic/savedGamesStore';
import { createSavedBasicGame } from '@/test/fixtures/domain';

jest.mock('@/lib/sentry');

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedReportError = jest.mocked(reportError);

async function seedFinishedSavedGame(): Promise<string> {
  await useGameStore.getState().saveCurrentGame();
  const gameId = useGameStore.getState().currentGameId;
  if (gameId == null) throw new Error('Expected saveCurrentGame to assign a game ID.');

  await useGameStore.setState({ team1Score: 7, currentGameStatus: 'finished' });
  mockedAsyncStorage.setItem.mockClear();
  return gameId;
}

function getBasicStorageWrites() {
  return mockedAsyncStorage.setItem.mock.calls.filter(
    ([storageKey]) => storageKey === 'ultimatestats-game-storage',
  );
}

function getPersistedBasicState() {
  const serializedState = getBasicStorageWrites()[0]?.[1];
  if (serializedState == null) throw new Error('Expected a persisted basic-store write.');
  return JSON.parse(serializedState) as {
    state: {
      currentGameId: string | null;
      currentGameStatus: string;
      team1Score: number;
    };
  };
}

describe('basic game store persistence', () => {
  beforeEach(async () => {
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    await useGameStore.setState(useGameStore.getInitialState(), true);
    useSavedBasicGamesStore.setState(useSavedBasicGamesStore.getInitialState(), true);
    mockedAsyncStorage.setItem.mockClear();
  });

  it('does not resolve saveCurrentGame until the persisted write finishes', async () => {
    let finishWrite: (() => void) | undefined;
    // The SQLite write comes first, so the AsyncStorage write starts a few ticks into the save.
    const writeStarted = new Promise<void>((resolveWriteStarted) => {
      mockedAsyncStorage.setItem.mockImplementationOnce(() => {
        resolveWriteStarted();
        return new Promise<void>((resolve) => {
          finishWrite = resolve;
        });
      });
    });

    let didResolve = false;
    const savePromise = useGameStore
      .getState()
      .saveCurrentGame()
      .then(() => {
        didResolve = true;
      });

    await writeStarted;

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      'ultimatestats-game-storage',
      expect.any(String),
    );
    expect(didResolve).toBe(false);

    finishWrite?.();
    await savePromise;

    expect(didResolve).toBe(true);
  });

  it('rejects saveCurrentGame when persistence fails', async () => {
    mockedAsyncStorage.setItem.mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(useGameStore.getState().saveCurrentGame()).rejects.toThrow('storage unavailable');
  });

  it.each([
    ['single', (gameId: string) => useGameStore.getState().deleteSavedGame(gameId)],
    ['bulk', (gameId: string) => useGameStore.getState().deleteSavedGames([gameId])],
  ])('persists %s deletion and finished-game reset in one update', async (_label, deleteGame) => {
    const gameId = await seedFinishedSavedGame();

    await deleteGame(gameId);

    expect(getBasicStorageWrites()).toHaveLength(1);
    expect(getPersistedBasicState().state).toMatchObject({
      currentGameId: null,
      currentGameStatus: 'fresh',
      team1Score: 0,
    });
  });

  describe('saved games in SQLite', () => {
    it('stores the current game when it is saved', async () => {
      await useGameStore.getState().saveCurrentGame();

      const savedGames = useSavedBasicGamesStore.getState().savedGames;
      expect(savedGames).toHaveLength(1);
      expect(await loadAllBasicGames()).toEqual(savedGames);
    });

    it('stores an imported game and an edit to one of its events', async () => {
      const game = createSavedBasicGame();
      await useSavedBasicGamesStore.getState().importGame(game);

      await useSavedBasicGamesStore
        .getState()
        .updateSavedGameEvent(game.id, 0, { goalPlayerId: 'corrected' });

      const [storedGame] = await loadAllBasicGames();
      expect(storedGame.events[0]).toMatchObject({ type: 'goal', goalPlayerId: 'corrected' });
      expect(useSavedBasicGamesStore.getState().savedGames).toEqual([storedGame]);
    });

    it('stores a changed played date and the removal of an event', async () => {
      const turnover: GameEvent = {
        type: 'turnover',
        team: 'team1',
        subtype: 'drop',
        playerId: null,
      };
      const game = createSavedBasicGame();
      await useSavedBasicGamesStore
        .getState()
        .importGame({ ...game, events: [...game.events, turnover] });
      const turnoverIndex = game.events.length;

      await useSavedBasicGamesStore.getState().updateSavedGamePlayedAt(game.id, 1234);
      await useSavedBasicGamesStore.getState().deleteSavedGameEvent(game.id, turnoverIndex);

      const [storedGame] = await loadAllBasicGames();
      expect(storedGame.playedAt).toBe(1234);
      expect(storedGame.events).toHaveLength(game.events.length);
      expect(useSavedBasicGamesStore.getState().savedGames).toEqual([storedGame]);
    });

    it('removes deleted games', async () => {
      await useSavedBasicGamesStore
        .getState()
        .importGame({ ...createSavedBasicGame(), id: 'game-a' });
      await useSavedBasicGamesStore
        .getState()
        .importGame({ ...createSavedBasicGame(), id: 'game-b' });
      await useSavedBasicGamesStore
        .getState()
        .importGame({ ...createSavedBasicGame(), id: 'game-c' });

      await useGameStore.getState().deleteSavedGame('game-a');
      await useGameStore.getState().deleteSavedGames(['game-b']);

      expect((await loadAllBasicGames()).map((game) => game.id)).toEqual(['game-c']);
    });

    it('rejects a save that SQLite refuses and keeps it out of the saved games', async () => {
      const device = jest.requireMock<typeof import('@/test/mocks/expoSqlite')>('expo-sqlite');
      const db = await device.openDatabaseAsync('ultimatestats_basic_games.db');
      const failingWrite = jest
        .spyOn(db, 'withTransactionAsync')
        .mockRejectedValueOnce(new Error('disk full'));

      await expect(
        useSavedBasicGamesStore.getState().importGame(createSavedBasicGame()),
      ).rejects.toThrow('disk full');

      expect(useSavedBasicGamesStore.getState().savedGames).toEqual([]);
      expect(getBasicStorageWrites()).toEqual([]);
      // The database outlives this test, so the spy would too.
      failingWrite.mockRestore();
    });

    it.each([
      {
        change: 'an event edit',
        applyChange: (gameId: string) =>
          useSavedBasicGamesStore
            .getState()
            .updateSavedGameEvent(gameId, 0, { goalPlayerId: 'corrected' }),
      },
      {
        change: 'a played date',
        applyChange: (gameId: string) =>
          useSavedBasicGamesStore.getState().updateSavedGamePlayedAt(gameId, 1234),
      },
    ])(
      'rejects $change that SQLite refuses and leaves the saved game as it was',
      async ({ applyChange }) => {
        const game = createSavedBasicGame();
        await useSavedBasicGamesStore.getState().importGame(game);
        const savedGamesBeforeChange = useSavedBasicGamesStore.getState().savedGames;
        const device = jest.requireMock<typeof import('@/test/mocks/expoSqlite')>('expo-sqlite');
        const db = await device.openDatabaseAsync('ultimatestats_basic_games.db');
        const failingWrite = jest
          .spyOn(db, 'withTransactionAsync')
          .mockRejectedValueOnce(new Error('disk full'));

        await expect(applyChange(game.id)).rejects.toThrow('disk full');

        expect(useSavedBasicGamesStore.getState().savedGames).toEqual(savedGamesBeforeChange);
        // The database outlives this test, so the spy would too.
        failingWrite.mockRestore();
      },
    );

    it('counts the games as loaded when only the AsyncStorage write after the load fails', async () => {
      const game = createSavedBasicGame();
      // What hydration leaves on a device that has not moved its games to SQLite yet.
      useGameStore.setState({ asyncStorageSavedGames: [game] });
      mockedAsyncStorage.setItem.mockRejectedValueOnce(new Error('storage unavailable'));

      await loadSavedBasicGamesAtStartup();

      expect(mockedReportError).toHaveBeenCalledWith(
        'basic-saved-games-load',
        new Error('storage unavailable'),
      );
      const { savedGames, savedGamesLoadStatus } = useSavedBasicGamesStore.getState();
      expect(savedGamesLoadStatus).toBe('loaded');
      expect(savedGames.map((savedGame) => savedGame.id)).toEqual([game.id]);
    });
  });
});
