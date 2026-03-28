import { validatePayload } from '../sharing/validate';

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
        'not an object',
      );
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
