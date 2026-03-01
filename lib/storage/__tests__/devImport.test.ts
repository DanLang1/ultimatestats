import { parseRawSavedGamesJson, parseSavedGamesJson } from '../devImport';
import type { SavedGame } from '../types';

function makeSavedGame(overrides: Partial<SavedGame> = {}): SavedGame {
  return {
    id: 'game-1',
    schemaVersion: 2,
    createdAt: 1,
    team1: {
      id: 'team-1',
      name: 'My Team',
      roster: [],
    },
    team2Name: 'Opponent',
    team1Score: 0,
    team2Score: 0,
    events: [],
    gameTo: 15,
    gameLength: 90,
    startingPossession: 'team1',
    ...overrides,
  };
}

describe('legacy game JSON import parsing', () => {
  it('parses a persisted game-store blob with state.savedGames', () => {
    const game = makeSavedGame();

    const parsed = parseSavedGamesJson(
      JSON.stringify({
        state: {
          savedGames: [game],
        },
        version: 4,
      }),
    );

    expect(parsed).toEqual([game]);
  });

  it('parses a shared payload with a saved game nested under data', () => {
    const game = makeSavedGame({
      id: 'legacy-game',
      team1Score: 8,
      team2Score: 3,
      gameTo: 13,
    });

    const parsed = parseSavedGamesJson(
      JSON.stringify({
        data: game,
        type: 'game',
        schemaVersion: game.schemaVersion,
      }),
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(game);
  });

  it('rejects unsupported payloads', () => {
    expect(() => parseSavedGamesJson(JSON.stringify({ foo: 'bar' }))).toThrow(
      'Paste a saved game object',
    );
  });

  it('extracts raw game entries from a bulk payload without validating each item', () => {
    const game = makeSavedGame();
    const malformedEntry = { id: 'bad-game', schemaVersion: 2, events: [null] };

    const parsed = parseRawSavedGamesJson(
      JSON.stringify({
        type: 'games',
        schemaVersion: 2,
        data: [game, malformedEntry],
      }),
    );

    expect(parsed).toEqual([game, malformedEntry]);
  });
});
