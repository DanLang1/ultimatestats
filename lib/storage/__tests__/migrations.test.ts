import { GoalEvent } from '@/store/gameStore.types';
import { migrateSavedGame, migrateSavedGames } from '../migrations';
import { CURRENT_SCHEMA_VERSION, SavedGame } from '../types';

const goal = (team: 'team1' | 'team2'): GoalEvent => ({
  type: 'goal',
  team,
  goalPlayerId: null,
  assistPlayerId: null,
});

function makeSavedGame(overrides: Partial<SavedGame> = {}): SavedGame {
  return {
    id: 'game-1',
    schemaVersion: CURRENT_SCHEMA_VERSION - 1,
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

describe('storage migrations', () => {
  it('stamps an inferred halftime goal for legacy saves missing the marker', () => {
    const events = [
      goal('team1'),
      goal('team2'),
      goal('team1'),
      goal('team2'),
      goal('team1'),
      goal('team2'),
      goal('team1'),
      goal('team2'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
    ];
    const migrated = migrateSavedGame(
      makeSavedGame({
        events,
        team1Score: 11,
        team2Score: 4,
      }),
    );

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.autoHalftimeEnabled).toBe(true);
    expect(
      migrated.events.filter((event) => event.type === 'goal' && event.triggeredHalftime),
    ).toHaveLength(1);
    expect(migrated.events[11]).toMatchObject({
      type: 'goal',
      triggeredHalftime: true,
    });
  });

  it('preserves the first explicit halftime marker and clears extra ones', () => {
    const migrated = migrateSavedGame(
      makeSavedGame({
        events: [
          goal('team1'),
          { ...goal('team1'), triggeredHalftime: true },
          { ...goal('team2'), triggeredHalftime: true },
        ],
      }),
    );

    expect(migrated.events[1]).toMatchObject({
      type: 'goal',
      triggeredHalftime: true,
    });
    expect(migrated.events[2]).not.toHaveProperty('triggeredHalftime');
  });

  it('returns didChange when any game is migrated', () => {
    const { games, didChange } = migrateSavedGames([makeSavedGame()]);

    expect(didChange).toBe(true);
    expect(games[0].schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});
