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

function setThrowDetails(game: AdvancedTrackedGame, details: unknown): AdvancedTrackedGame {
  const action = game.points[0].possessions[0].actions.at(-1);
  if (action?.kind !== 'throw') throw new Error('Expected throw fixture.');
  Object.assign(action, { details });
  return game;
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

    it('drops private notes from incoming advanced game payloads', () => {
      const data = makeAdvancedGameData({
        metadata: { opponentName: 'Rivals', notes: 'Sender private note' },
      });
      data.points[0].note = 'Point-level private note';

      const result = validatePayload(makeAdvancedGamePayload({ data }));

      expect(result.type).toBe('advanced-game');
      if (result.type !== 'advanced-game') throw new Error('Expected an advanced-game payload.');
      expect(result.data.metadata).toEqual({ opponentName: 'Rivals' });
      expect(result.data.points[0]).not.toHaveProperty('note');
    });

    it.each(THROW_RESULTS)('accepts the declared %s throw result', (throwResult) => {
      const data = makeAdvancedGameData({}, throwResult);
      const result = validatePayload(makeAdvancedGamePayload({ data }));

      expect(result.type).toBe('advanced-game');
    });

    it('accepts and migrates classified throwaways', () => {
      const data = setThrowDetails(makeAdvancedGameData({}, 'throwaway'), { type: 'huck' });
      const result = validatePayload(makeAdvancedGamePayload({ data }));

      expect(result.type).toBe('advanced-game');
      if (result.type !== 'advanced-game') throw new Error('Expected advanced-game payload.');
      expect(result.data.schemaVersion).toBe(ADVANCED_TRACKING_SCHEMA_VERSION);
      expect(result.data.points[0].possessions[0].actions.at(-1)).toMatchObject({
        details: { type: 'huck' },
      });
    });

    it('accepts and migrates possession red-zone data', () => {
      const data = makeAdvancedGameData();
      data.points[0].possessions[0].redZone = { enteredAt: 1_234 };

      const result = validatePayload(makeAdvancedGamePayload({ data }));

      expect(result.type).toBe('advanced-game');
      if (result.type !== 'advanced-game') throw new Error('Expected advanced-game payload.');
      expect(result.data.schemaVersion).toBe(ADVANCED_TRACKING_SCHEMA_VERSION);
      expect(result.data.points[0].possessions[0].redZone).toEqual({ enteredAt: 1_234 });
    });

    it('rejects malformed possession red-zone data', () => {
      const data = makeAdvancedGameData();
      Object.assign(data.points[0].possessions[0], { redZone: { enteredAt: 'during-play' } });

      expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow(
        'invalid red-zone data',
      );
    });

    it('rejects anonymous scaffold metadata on a full-roster possession', () => {
      const data = makeAdvancedGameData();
      data.points[0].possessions[0].redZone = {
        enteredAt: 1_234,
        anonymousScaffold: true,
      };

      expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow(
        'invalid red-zone data',
      );
    });

    it('rejects false anonymous scaffold metadata', () => {
      const data = makeAdvancedGameData();
      Object.assign(data.points[0].possessions[0], {
        redZone: { enteredAt: 1_234, anonymousScaffold: false },
      });

      expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow(
        'invalid red-zone data',
      );
    });

    it('rejects a point revival pause that ends before it starts', () => {
      const data = makeAdvancedGameData();
      data.points[0].revivalPauses = [{ pausedAt: 2_000, resumedAt: 1_000 }];

      expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow(
        'invalid point revival pause',
      );
    });

    it.each([
      { label: 'non-finite', enteredAt: Number.POSITIVE_INFINITY },
      { label: 'before point start', enteredAt: 999 },
      { label: 'after possession outcome', enteredAt: 2_001 },
    ])('rejects a $label Red Zone timestamp', ({ enteredAt }) => {
      const data = makeAdvancedGameData();
      const point = data.points[0];
      point.startedAt = 1_000;
      const outcome = point.possessions[0].actions.at(-1);
      if (outcome == null) throw new Error('Expected an outcome action.');
      outcome.recordedAt = 2_000;
      point.possessions[0].redZone = { enteredAt };

      expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow(
        'invalid red-zone data',
      );
    });

    it('rejects an unknown throw type', () => {
      const data = setThrowDetails(makeAdvancedGameData({}, 'throwaway'), { type: 'hammer' });

      expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow(
        'invalid throw details',
      );
    });

    it('rejects backfield reset details on a completion', () => {
      const data = setThrowDetails(makeAdvancedGameData({}, 'goal'), { type: 'backfield_reset' });

      expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow(
        'backfield reset details require a turnover result',
      );
    });

    it('rejects throw details on an anonymous side', () => {
      const data = setThrowDetails(makeAdvancedGameData({}, 'throwaway'), { type: 'huck' });
      const possession = data.points[0].possessions[0];
      const action = possession.actions.at(-1);
      if (action?.kind !== 'throw') throw new Error('Expected throw fixture.');
      possession.sideId = 'away';
      action.sideId = 'away';

      expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow(
        'throw details require a fully tracked side',
      );
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

    it('drops private notes from incoming bulk advanced game payloads', () => {
      const data = [makeAdvancedGameData({ metadata: { notes: 'Sender private note' } })];

      const result = validatePayload(makeAdvancedGamesPayload({ data }));

      expect(result.type).toBe('advanced-games');
      if (result.type !== 'advanced-games') throw new Error('Expected advanced-games payload.');
      expect(result.data[0].metadata).toBeUndefined();
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

describe('shared advanced record boundary validation', () => {
  it.each([
    ['id', '', 'missing data id'],
    ['schemaVersion', undefined, 'missing schemaVersion'],
    ['createdAt', undefined, 'missing timestamps'],
    ['updatedAt', NaN, 'missing timestamps'],
    ['importedAt', 'yesterday', 'invalid importedAt'],
    ['status', 'unknown', 'invalid status'],
    ['focusSideId', null, 'missing side ids'],
    ['flip', { result: 'draw' }, 'invalid flip result'],
    ['settings', null, 'missing settings'],
    ['sides', [], 'expected two sides'],
    ['sides', [null, { id: 'away', label: 'Away', trackingMode: 'anonymous' }], 'invalid side'],
    [
      'sides',
      [
        { id: 'home', label: 'Home', trackingMode: 'partial' },
        { id: 'away', label: 'Away', trackingMode: 'anonymous' },
      ],
      'invalid tracking mode',
    ],
    ['participants', null, 'missing participants'],
    ['participants', [null], 'invalid participant'],
    [
      'participants',
      Array.from({ length: 101 }, (_, i) => ({ id: `p${i}`, name: 'Player' })),
      'too many participants',
    ],
    [
      'points',
      Array.from({ length: 101 }, () => ({ id: 'point', lines: [], possessions: [] })),
      'too many points',
    ],
    ['points', [null], 'invalid point'],
    ['points', [{ id: 'point', lines: [null], possessions: [] }], 'invalid point line'],
    ['points', [{ id: 'point', lines: [], possessions: null }], 'missing possessions'],
    ['points', [{ id: 'point', lines: [], possessions: [null] }], 'invalid possession'],
    [
      'points',
      [{ id: 'point', lines: [], possessions: [{ id: 'pos', sideId: 'home', actions: null }] }],
      'missing actions',
    ],
    [
      'points',
      [
        {
          id: 'point',
          lines: [],
          possessions: Array.from({ length: 1001 }, (_, i) => ({
            id: `pos${i}`,
            sideId: 'home',
            actions: [],
          })),
        },
      ],
      'too many possessions',
    ],
  ])('rejects malformed %s with %s', (field, value, message) => {
    const data = { ...makeAdvancedGameData(), [field]: value };
    expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow(message);
  });

  it.each([
    [null, 'invalid action'],
    [{ id: '', kind: 'stoppage', reason: 'injury' }, 'missing action id'],
    [{ id: 'pull', kind: 'pull', sideId: null }, 'invalid pull side'],
    [{ id: 'pickup', kind: 'disc_pickup', sideId: null }, 'invalid pickup side'],
    [{ id: 'throw', kind: 'throw', sideId: null }, 'invalid throw side'],
    [{ id: 'throw', kind: 'throw', sideId: 'home', thrower: null }, 'invalid player reference'],
    [
      {
        id: 'throw',
        kind: 'throw',
        sideId: 'home',
        thrower: { refType: 'participant', participantId: '' },
      },
      'missing participantId',
    ],
    [
      { id: 'throw', kind: 'throw', sideId: 'home', thrower: { refType: 'other' } },
      'invalid player reference type',
    ],
    [
      {
        id: 'throw',
        kind: 'throw',
        sideId: 'home',
        thrower: { refType: 'untracked' },
        result: 'bad',
      },
      'invalid throw result',
    ],
    [
      {
        id: 'pull',
        kind: 'pull',
        sideId: 'away',
        receivingSideId: 'home',
        puller: { refType: 'untracked' },
        result: 'bad',
      },
      'invalid pull result',
    ],
    [{ id: 'stop', kind: 'stoppage', reason: 'bad' }, 'invalid stoppage reason'],
    [{ id: 'stop', kind: 'stoppage', reason: 'timeout', sideId: 1 }, 'invalid stoppage side'],
  ])('rejects malformed action %#', (action, message) => {
    const data = makeAdvancedGameData();
    Object.assign(data.points[0].possessions[0], { actions: [action] });
    expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow(message);
  });

  it.each(['timeout', 'injury', 'manual_pause'])('preserves a valid %s stoppage', (reason) => {
    const data = makeAdvancedGameData();
    Object.assign(data.points[0].possessions[0], {
      actions: [{ id: 'pause', kind: 'stoppage', reason, sideId: 'home' }],
    });
    const result = validatePayload(makeAdvancedGamePayload({ data }));
    if (result.type !== 'advanced-game') throw new Error('Expected advanced game');
    expect(result.data.points[0].possessions[0].actions).toEqual([
      { id: 'pause', kind: 'stoppage', reason, sideId: 'home' },
    ]);
  });

  it.each(['ob', 'dropped', 'roller'])('preserves a valid %s pull', (result) => {
    const data = makeAdvancedGameData();
    const pull = {
      id: 'pull',
      kind: 'pull',
      sideId: 'away',
      receivingSideId: 'home',
      puller: { refType: 'untracked' },
      result,
    };
    Object.assign(data.points[0].possessions[0], { actions: [pull] });
    const validated = validatePayload(makeAdvancedGamePayload({ data }));
    if (validated.type !== 'advanced-game') throw new Error('Expected advanced game');
    expect(validated.data.points[0].possessions[0].actions).toEqual([pull]);
  });

  it('rejects huck classification on a stall', () => {
    const data = setThrowDetails(makeAdvancedGameData({}, 'stall'), { type: 'huck' });
    expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow(
      'throw details require an eligible throw result',
    );
  });

  it('rejects missing advanced data', () => {
    expect(() => validatePayload(makeAdvancedGamePayload({ data: null }))).toThrow('missing data');
  });

  it('rejects malformed bulk records and non-object presets', () => {
    expect(() => validatePayload(makeAdvancedGamesPayload({ data: {} }))).toThrow(
      'advanced games data must be an array',
    );
    expect(() =>
      validatePayload(makeTeamPayload({ data: { id: '', name: 'Team', roster: [] } })),
    ).toThrow('missing data id');
    expect(() => validatePayload(makeTeamPayload({ data: null }))).toThrow('missing data');
    expect(() => validatePayload(makeGamePayload({ presets: [null] }))).toThrow('not an object');
  });
});

describe('shared field locations', () => {
  it.each([
    [null, 'invalid field location'],
    [{ locationType: 'zone' }, 'missing zoneId'],
    [{ locationType: 'xy', x: 'left', y: 0.5 }, 'invalid xy location'],
    [{ locationType: 'polar', x: 0, y: 0 }, 'invalid field location type'],
  ])('rejects a malformed pickup location %#', (location, message) => {
    const data = makeAdvancedGameData();
    Object.assign(data.points[0].possessions[0], {
      actions: [
        {
          id: 'pickup',
          kind: 'disc_pickup',
          sideId: 'home',
          player: { refType: 'unknown' },
          location,
        },
      ],
    });
    expect(() => validatePayload(makeAdvancedGamePayload({ data }))).toThrow(message);
  });

  it('preserves valid pull, pickup and throw locations through migration', () => {
    const data = makeAdvancedGameData();
    const xy = { locationType: 'xy', x: 0.25, y: 0.75 };
    const zone = { locationType: 'zone', zoneId: 'endzone' };
    Object.assign(data.points[0].possessions[0], {
      actions: [
        {
          id: 'pull',
          kind: 'pull',
          sideId: 'away',
          receivingSideId: 'home',
          puller: { refType: 'untracked' },
          result: 'inbound',
          origin: xy,
          landing: zone,
        },
        {
          id: 'pickup',
          kind: 'disc_pickup',
          sideId: 'home',
          player: { refType: 'unknown' },
          location: zone,
        },
        {
          id: 'throw',
          kind: 'throw',
          sideId: 'home',
          thrower: { refType: 'unknown' },
          result: 'throwaway',
          origin: zone,
          target: xy,
        },
      ],
    });
    const result = validatePayload(makeAdvancedGamePayload({ data }));
    if (result.type !== 'advanced-game') throw new Error('Expected advanced game');
    expect(result.data.points[0].possessions[0].actions).toMatchObject([
      { origin: xy, landing: zone },
      { location: zone },
      { origin: zone, target: xy },
    ]);
  });
});
