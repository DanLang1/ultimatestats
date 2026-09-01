import AsyncStorage from '@react-native-async-storage/async-storage';

import { useGameStore } from '@/store/basic/gameStore';

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

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
      savedGames: { id: string }[];
      team1Score: number;
    };
  };
}

describe('basic game store persistence', () => {
  beforeEach(async () => {
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    await useGameStore.setState(useGameStore.getInitialState(), true);
    mockedAsyncStorage.setItem.mockClear();
  });

  it('does not resolve saveCurrentGame until the persisted write finishes', async () => {
    let finishWrite: (() => void) | undefined;
    mockedAsyncStorage.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    );

    let didResolve = false;
    const savePromise = useGameStore
      .getState()
      .saveCurrentGame()
      .then(() => {
        didResolve = true;
      });

    await Promise.resolve();

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

  it('persists single deletion and finished-game reset in one update', async () => {
    const gameId = await seedFinishedSavedGame();

    await useGameStore.getState().deleteSavedGame(gameId);

    expect(getBasicStorageWrites()).toHaveLength(1);
    expect(getPersistedBasicState().state).toMatchObject({
      currentGameId: null,
      currentGameStatus: 'fresh',
      savedGames: [],
      team1Score: 0,
    });
  });

  it('persists bulk deletion and finished-game reset in one update', async () => {
    const gameId = await seedFinishedSavedGame();

    await useGameStore.getState().deleteSavedGames([gameId]);

    expect(getBasicStorageWrites()).toHaveLength(1);
    expect(getPersistedBasicState().state).toMatchObject({
      currentGameId: null,
      currentGameStatus: 'fresh',
      savedGames: [],
      team1Score: 0,
    });
  });
});
