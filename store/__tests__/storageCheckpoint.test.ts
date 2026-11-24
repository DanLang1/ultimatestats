import { CURRENT_SCHEMA_VERSION, SavedGame, SavedTeam } from '@/lib/storage/types';
import {
  coldStartApp,
  readCheckpointFile,
  readStorage,
  seedStorage,
  type StorageCheckpoint,
} from '@/test/storageCheckpoint';

const BASIC_GAME_STORAGE_KEY = 'ultimatestats-game-storage';

type PersistedBasicGameEntry = {
  state: {
    currentTeam: SavedTeam;
    savedGames: SavedGame[];
    savedTeams: SavedTeam[];
  };
  version: number;
};

function getBasicGameEntry(storage: StorageCheckpoint) {
  return storage[BASIC_GAME_STORAGE_KEY] as PersistedBasicGameEntry;
}

function getSavedGameIds(savedGames: SavedGame[]) {
  return savedGames.map((game) => game.id);
}

describe('storage checkpoints', () => {
  // mid-game holds a game in progress (events, lines, running clocks, an open timeout), so a live
  // field that failed to hydrate cannot hide behind its default.
  it('cold-starts 2.6.0/mid-game.json and writes it back unchanged', async () => {
    const checkpoint = readCheckpointFile('2.6.0/mid-game.json');
    const persistedBasicGame = getBasicGameEntry(checkpoint).state;
    await seedStorage(checkpoint);

    const app = await coldStartApp();

    expect(app.reportedErrors).toEqual([]);
    const hydratedBasicGame = app.useGameStore.getState();
    expect(getSavedGameIds(hydratedBasicGame.savedGames)).toEqual(
      getSavedGameIds(persistedBasicGame.savedGames),
    );
    expect(hydratedBasicGame.savedTeams).toEqual(persistedBasicGame.savedTeams);
    expect(hydratedBasicGame.currentTeam).toEqual(persistedBasicGame.currentTeam);
    expect(hydratedBasicGame).toMatchObject(persistedBasicGame);

    await app.writeAllPersistedStores();

    expect(await readStorage()).toEqual(checkpoint);
  });

  it.each(['2.6.0/mid-game.json', '2.6.0/legacy-saved-games.json'])(
    'leaves storage identical after a second cold start of %s',
    async (checkpointPath) => {
      await seedStorage(readCheckpointFile(checkpointPath));

      const firstStart = await coldStartApp();
      await firstStart.writeAllPersistedStores();
      const storageAfterFirstStart = await readStorage();

      const secondStart = await coldStartApp();
      await secondStart.writeAllPersistedStores();

      expect(secondStart.reportedErrors).toEqual([]);
      expect(await readStorage()).toEqual(storageAfterFirstStart);
    },
  );

  it('migrates legacy saved games at hydration and persists the result', async () => {
    const checkpoint = readCheckpointFile('2.6.0/legacy-saved-games.json');
    const legacySavedGames = getBasicGameEntry(checkpoint).state.savedGames;
    await seedStorage(checkpoint);

    const app = await coldStartApp();

    expect(app.reportedErrors).toEqual([]);
    const persistedBasicGame = getBasicGameEntry(await readStorage());
    const migratedSavedGames = persistedBasicGame.state.savedGames;
    expect(getSavedGameIds(migratedSavedGames)).toEqual(getSavedGameIds(legacySavedGames));
    expect(migratedSavedGames.map((game) => game.schemaVersion)).toEqual([
      CURRENT_SCHEMA_VERSION,
      CURRENT_SCHEMA_VERSION,
      CURRENT_SCHEMA_VERSION,
    ]);
    expect({ [BASIC_GAME_STORAGE_KEY]: persistedBasicGame }).toEqual(
      readCheckpointFile('expected/legacy-saved-games.after-cold-start.json'),
    );
  });
});
