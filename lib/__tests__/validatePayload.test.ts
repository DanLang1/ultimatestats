import {
  ADVANCED_TRACKING_SCHEMA_VERSION,
  THROW_RESULTS,
  type AdvancedTrackedGame,
  type ThrowResult,
} from '../advancedTracking/types';
import { validatePayload } from '../sharing/validate';
import { CURRENT_SCHEMA_VERSION } from '../storage/types';

function makeGamePayload(overrides: Record<string, unknown> = {}): unknown {
  return {
    type: 'game',
    appVersion: '1.0.0',
    schemaVersion: 1,
    sharedAt: Date.now(),
    data: makeGameData(),
    ...overrides,
  };
}

function makeGameData(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: 'game-1',
    team2Name: 'Rival',
    team1Score: 10,
    team2Score: 8,
    events: [],
    team1: { id: 'team-1', name: 'Home', roster: [{ id: 'p1', name: 'Alice' }] },
    ...overrides,
  };
}

function makeTeamPayload(overrides: Record<string, unknown> = {}): unknown {
  return {
    type: 'team',
    appVersion: '1.0.0',
    schemaVersion: 1,
    sharedAt: Date.now(),
    data: { id: 'team-1', name: 'Thunderbirds', roster: [] },
    ...overrides,
  };
}

function makeGamesPayload(overrides: Record<string, unknown> = {}): unknown {
  return {
    type: 'games',
    appVersion: '1.0.0',
    schemaVersion: 1,
    sharedAt: Date.now(),
    data: [makeGameData()],
    ...overrides,
  };
}

function makeAdvancedGameData(
  overrides: Partial<AdvancedTrackedGame> = {},
  throwResult: ThrowResult = 'goal',
): AdvancedTrackedGame {
  const tracksReceiver =
    throwResult === 'complete' || throwResult === 'goal' || throwResult === 'drop';
  const tracksDefender = throwResult === 'block' || throwResult === 'pressure';

  return {
    id: 'advanced-game-1',
    schemaVersion: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    gameType: 'game',
    status: 'final',
    focusSideId: 'home',
    initialReceivingSideId: 'home',
    settings: { locationMode: 'none', format: { formatType: 'standard', gameTo: 15 } },
    sides: [
      { id: 'home', label: 'Home', trackingMode: 'full-roster' },
      { id: 'away', label: 'Away', trackingMode: 'anonymous' },
    ],
    participants: [{ id: 'p1', name: 'Alex' }],
    points: [
      {
        id: 'point-1',
        lines: [{ sideId: 'home', participantIds: ['p1'] }],
        possessions: [
          {
            id: 'possession-1',
            sideId: 'home',
            actions: [
              {
                id: 'pull-1',
                kind: 'pull',
                sideId: 'away',
                receivingSideId: 'home',
                puller: { refType: 'untracked' },
                receiver: { refType: 'participant', participantId: 'p1' },
                result: 'inbound',
              },
              {
                id: 'throw-1',
                kind: 'throw',
                sideId: 'home',
                thrower: { refType: 'participant', participantId: 'p1' },
                ...(tracksReceiver && {
                  toPlayer: { refType: 'participant' as const, participantId: 'p1' },
                }),
                ...(tracksDefender && {
                  defender: { refType: 'participant' as const, participantId: 'p1' },
                }),
                result: throwResult,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

function makeAdvancedGamePayload(overrides: Record<string, unknown> = {}): unknown {
  return {
    type: 'advanced-game',
    appVersion: '1.0.0',
    schemaVersion: 1,
    sharedAt: Date.now(),
    data: makeAdvancedGameData(),
    ...overrides,
  };
}

function makeAdvancedGamesPayload(overrides: Record<string, unknown> = {}): unknown {
  return {
    type: 'advanced-games',
    appVersion: '1.0.0',
    schemaVersion: 1,
    sharedAt: Date.now(),
    data: [makeAdvancedGameData()],
    ...overrides,
  };
}

describe('validatePayload', () => {
  describe('top-level validation', () => {
    it('throws for null', () => {
      expect(() => validatePayload(null)).toThrow('not an object');
    });

    it('throws for non-object', () => {
      expect(() => validatePayload('string')).toThrow('not an object');
      expect(() => validatePayload(42)).toThrow('not an object');
    });

    it('throws for unknown type', () => {
      expect(() => validatePayload({ type: 'unknown', schemaVersion: 1 })).toThrow('unknown type');
    });

    it('throws for missing schemaVersion', () => {
      expect(() => validatePayload({ type: 'game' })).toThrow('schemaVersion');
    });

    it('throws for non-numeric schemaVersion', () => {
      expect(() => validatePayload({ type: 'game', schemaVersion: 'v1' })).toThrow('schemaVersion');
    });
  });

  describe('schema version guard', () => {
    it('accepts payloads at the current schema version', () => {
      expect(() =>
        validatePayload(makeGamePayload({ schemaVersion: CURRENT_SCHEMA_VERSION })),
      ).not.toThrow();
      expect(() =>
        validatePayload(
          makeAdvancedGamePayload({ schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION }),
        ),
      ).not.toThrow();
    });

    it('throws for a basic payload newer than the supported schema version', () => {
      expect(() =>
        validatePayload(makeGamePayload({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 })),
      ).toThrow('newer than supported version');
    });

    it('throws for an advanced payload newer than the supported schema version', () => {
      expect(() =>
        validatePayload(
          makeAdvancedGamePayload({ schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION + 1 }),
        ),
      ).toThrow('newer than supported version');
      expect(() =>
        validatePayload(
          makeAdvancedGamesPayload({ schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION + 1 }),
        ),
      ).toThrow('newer than supported version');
    });

    it('throws when an advanced game record is newer than its supported envelope', () => {
      expect(() =>
        validatePayload(
          makeAdvancedGamePayload({
            schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION,
            data: makeAdvancedGameData({
              schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION + 1,
            }),
          }),
        ),
      ).toThrow('newer than supported version');
    });

    it('checks every advanced game record in a bulk payload', () => {
      expect(() =>
        validatePayload(
          makeAdvancedGamesPayload({
            schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION,
            data: [
              makeAdvancedGameData({
                id: 'supported-game',
                schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION,
              }),
              makeAdvancedGameData({
                id: 'future-game',
                schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION + 1,
              }),
            ],
          }),
        ),
      ).toThrow('newer than supported version');
    });

    it('compares against the advanced schema version, not the basic one', () => {
      // Basic and advanced payloads version independently — an advanced payload
      // above its own current version must be rejected even when it would pass
      // the basic game's higher version ceiling.
      const betweenVersions =
        ADVANCED_TRACKING_SCHEMA_VERSION < CURRENT_SCHEMA_VERSION
          ? CURRENT_SCHEMA_VERSION
          : ADVANCED_TRACKING_SCHEMA_VERSION + 1;
      expect(() =>
        validatePayload(makeAdvancedGamePayload({ schemaVersion: betweenVersions })),
      ).toThrow('newer than supported version');
    });
  });

  describe('game payload', () => {
    it('accepts a valid game payload', () => {
      const result = validatePayload(makeGamePayload());
      expect(result.type).toBe('game');
      expect(result.schemaVersion).toBe(1);
    });

    it('falls back to Date.now() when sharedAt is missing', () => {
      const before = Date.now();
      const result = validatePayload(makeGamePayload({ sharedAt: undefined }));
      expect(result.sharedAt).toBeGreaterThanOrEqual(before);
    });

    it('throws for missing data', () => {
      expect(() => validatePayload(makeGamePayload({ data: null }))).toThrow('missing data');
    });

    it('throws for missing data id', () => {
      expect(() => validatePayload(makeGamePayload({ data: makeGameData({ id: '' }) }))).toThrow(
        'missing data id',
      );
    });

    it('throws for missing team2Name', () => {
      expect(() =>
        validatePayload(makeGamePayload({ data: makeGameData({ team2Name: undefined }) })),
      ).toThrow('team2Name');
    });

    it('throws for missing scores', () => {
      expect(() =>
        validatePayload(makeGamePayload({ data: makeGameData({ team1Score: undefined }) })),
      ).toThrow('scores');
    });

    it('throws for invalid playedAt', () => {
      expect(() =>
        validatePayload(makeGamePayload({ data: makeGameData({ playedAt: 'yesterday' }) })),
      ).toThrow('playedAt');
    });

    it('accepts a valid playedAt timestamp', () => {
      const ts = Date.now();
      const result = validatePayload(makeGamePayload({ data: makeGameData({ playedAt: ts }) }));
      expect((result.data as unknown as Record<string, unknown>).playedAt).toBe(ts);
    });

    it('throws for missing events', () => {
      expect(() =>
        validatePayload(makeGamePayload({ data: makeGameData({ events: undefined }) })),
      ).toThrow('events');
    });

    it('throws when events exceeds 500', () => {
      const events = Array.from({ length: 501 }, (_, i) => ({ id: i }));
      expect(() => validatePayload(makeGamePayload({ data: makeGameData({ events }) }))).toThrow(
        'too many events',
      );
    });

    it('throws for missing team1 roster', () => {
      expect(() =>
        validatePayload(
          makeGamePayload({ data: makeGameData({ team1: { id: 't1', name: 'X' } }) }),
        ),
      ).toThrow('team1 roster');
    });

    it('throws when roster exceeds 50', () => {
      const roster = Array.from({ length: 51 }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }));
      expect(() =>
        validatePayload(
          makeGamePayload({ data: makeGameData({ team1: { id: 't1', name: 'X', roster } }) }),
        ),
      ).toThrow('roster too large');
    });
  });

  describe('team payload', () => {
    it('accepts a valid team payload', () => {
      const result = validatePayload(makeTeamPayload());
      expect(result.type).toBe('team');
    });

    it('throws for missing team name', () => {
      expect(() =>
        validatePayload(makeTeamPayload({ data: { id: 'team-1', name: '', roster: [] } })),
      ).toThrow('missing name');
    });

    it('throws for missing roster', () => {
      expect(() =>
        validatePayload(makeTeamPayload({ data: { id: 'team-1', name: 'X', roster: undefined } })),
      ).toThrow('missing roster');
    });

    it('throws when roster exceeds 50', () => {
      const roster = Array.from({ length: 51 }, (_, i) => ({ id: `p${i}` }));
      expect(() =>
        validatePayload(makeTeamPayload({ data: { id: 'team-1', name: 'X', roster } })),
      ).toThrow('roster too large');
    });
  });

  describe('games (bulk) payload', () => {
    it('accepts a valid games payload', () => {
      const result = validatePayload(makeGamesPayload());
      expect(result.type).toBe('games');
    });

    it('throws for non-array data', () => {
      expect(() => validatePayload(makeGamesPayload({ data: {} }))).toThrow('must be an array');
    });

    it('throws for empty array', () => {
      expect(() => validatePayload(makeGamesPayload({ data: [] }))).toThrow('no games');
    });

    it('throws when exceeds 10 games', () => {
      const data = Array.from({ length: 11 }, () => makeGameData());
      expect(() => validatePayload(makeGamesPayload({ data }))).toThrow('too many games');
    });

    it('throws for non-object entry in array', () => {
      expect(() => validatePayload(makeGamesPayload({ data: ['not-an-object'] }))).toThrow(
        'missing data',
      );
    });
  });

  describe('advanced game payload', () => {
    it('accepts a valid advanced game payload', () => {
      const data = makeAdvancedGameData({ flip: { result: 'won', choice: 'side' } });
      const result = validatePayload(makeAdvancedGamePayload({ data }));
      expect(result.type).toBe('advanced-game');
      expect(result.schemaVersion).toBe(1);
    });

    it.each(THROW_RESULTS)('accepts the declared %s throw result', (throwResult) => {
      const data = makeAdvancedGameData({}, throwResult);
      const result = validatePayload(makeAdvancedGamePayload({ data }));

      expect(result.type).toBe('advanced-game');
    });

    it('rejects an invalid advanced game flip choice', () => {
      const data = makeAdvancedGameData({
        flip: { result: 'won', choice: 'endzone' },
      } as never);

      expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow('flip choice');
    });

    it('rejects a choice when the advanced game lost the flip', () => {
      const data = makeAdvancedGameData({
        flip: { result: 'lost', choice: 'offense' },
      } as never);

      expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow(
        'lost flip cannot include a choice',
      );
    });

    it('throws for missing advanced points', () => {
      const data = makeAdvancedGameData({ points: undefined as never });
      expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow('points');
    });

    it('throws for invalid advanced action kind', () => {
      const data = makeAdvancedGameData({
        points: [
          {
            id: 'point-1',
            lines: [{ sideId: 'home', participantIds: ['p1'] }],
            possessions: [
              {
                id: 'possession-1',
                sideId: 'home',
                actions: [{ id: 'bad-action', kind: 'travel' }],
              },
            ],
          },
        ],
      } as never);
      expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow('action kind');
    });

    it('throws when advanced actions exceed limit', () => {
      const actions = Array.from({ length: 10000 }, (_, index) => ({
        id: `throw-${index}`,
        kind: 'throw',
        sideId: 'home',
        thrower: { refType: 'participant', participantId: 'p1' },
        result: 'complete',
      }));
      const data = makeAdvancedGameData({
        points: [
          {
            id: 'point-1',
            lines: [{ sideId: 'home', participantIds: ['p1'] }],
            possessions: [{ id: 'possession-1', sideId: 'home', actions }],
          },
        ],
      } as never);
      expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow('too many actions');
    });
  });

  describe('advanced games (bulk) payload', () => {
    it('accepts a valid advanced games payload', () => {
      const result = validatePayload(makeAdvancedGamesPayload());
      expect(result.type).toBe('advanced-games');
    });

    it.each(THROW_RESULTS)('accepts the declared %s throw result', (throwResult) => {
      const data = [makeAdvancedGameData({}, throwResult)];
      const result = validatePayload(makeAdvancedGamesPayload({ data }));

      expect(result.type).toBe('advanced-games');
    });

    it('throws for empty advanced games array', () => {
      expect(() => validatePayload(makeAdvancedGamesPayload({ data: [] }))).toThrow('no games');
    });

    it('throws when advanced games exceed 10 games', () => {
      const data = Array.from({ length: 11 }, (_, index) =>
        makeAdvancedGameData({ id: `advanced-game-${index}` }),
      );
      expect(() => validatePayload(makeAdvancedGamesPayload({ data }))).toThrow('too many games');
    });
  });

  describe('presets', () => {
    it('accepts valid presets', () => {
      const presets = [{ id: 'pr1', name: 'O-Line', teamId: 'team-1', playerIds: ['p1'] }];
      const result = validatePayload(makeGamePayload({ presets }));
      expect(result.presets).toEqual(presets);
    });

    it('ignores presets when not an array', () => {
      const result = validatePayload(makeGamePayload({ presets: 'bad' }));
      expect(result.presets).toBeUndefined();
    });

    it('throws when presets exceed 20', () => {
      const presets = Array.from({ length: 21 }, (_, i) => ({
        id: `pr${i}`,
        name: `Preset ${i}`,
        teamId: 'team-1',
        playerIds: [],
      }));
      expect(() => validatePayload(makeGamePayload({ presets }))).toThrow('too many presets');
    });

    it('throws for preset missing required fields', () => {
      const presets = [{ id: 'pr1', playerIds: [] }];
      expect(() => validatePayload(makeGamePayload({ presets }))).toThrow(
        'missing required fields',
      );
    });

    it('throws for preset missing playerIds', () => {
      const presets = [{ id: 'pr1', name: 'O-Line', teamId: 'team-1' }];
      expect(() => validatePayload(makeGamePayload({ presets }))).toThrow('missing playerIds');
    });
  });

  describe('string sanitization', () => {
    it('truncates appVersion longer than 200 characters', () => {
      const longVersion = 'a'.repeat(300);
      const result = validatePayload(makeGamePayload({ appVersion: longVersion }));
      expect(result.appVersion.length).toBe(200);
    });

    it('returns empty string for non-string appVersion', () => {
      const result = validatePayload(makeGamePayload({ appVersion: 123 }));
      expect(result.appVersion).toBe('');
    });
  });
});
