import { MAX_SHARE_GAMES_BY_KIND } from '../constants';
import type { LinkedGameListItem } from '../gameListUtils';
import {
  countTeamSearchMatches,
  filterSavedGames,
  getSelectionActionBlocks,
  getSelectionKind,
  getSharedTournament,
  groupSavedGames,
  SavedGamesSortKey,
  sortSavedGames,
  summarizeSavedGameTeams,
  summarizeTournaments,
} from '../savedGamesListUtils';
import type { GameKind, Tournament } from '../storage/types';

function tournament(id: string, kind: GameKind = 'basic'): Tournament {
  return {
    id,
    schemaVersion: 1,
    kind,
    name: `${id} Open`,
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    createdAt: 0,
    updatedAt: 0,
  };
}

function game(
  id: string,
  overrides: Partial<Omit<LinkedGameListItem, 'kind'>> = {},
): LinkedGameListItem {
  return {
    kind: 'basic',
    id,
    teamId: 'zoo',
    timestamp: new Date(2026, 0, 1, 12).getTime(),
    myTeamName: 'Zoo',
    opponentName: 'Rivals',
    myScore: 13,
    opponentScore: 10,
    tournament: null,
    ...overrides,
  };
}

const ids = (games: LinkedGameListItem[]) => games.map((g) => g.id);

describe('summarizeTournaments', () => {
  it('counts each tournament’s games and lists the tournament with the newest game first', () => {
    const a = tournament('a');
    const b = tournament('b');
    const summaries = summarizeTournaments([
      game('a1', { timestamp: 1, tournament: a }),
      game('b1', { timestamp: 2, tournament: b }),
      game('none', { timestamp: 5, tournament: null }),
      game('a2', { timestamp: 3, tournament: a }),
    ]);

    expect(summaries).toEqual([
      { tournament: a, gameCount: 2, latestTimestamp: 3 },
      { tournament: b, gameCount: 1, latestTimestamp: 2 },
    ]);
  });
});

describe('summarizeSavedGameTeams', () => {
  it('counts each team’s games and record and lists the team with the newest game first', () => {
    const teams = summarizeSavedGameTeams([
      game('zoo-win', { teamId: 'zoo', timestamp: 1, myScore: 13, opponentScore: 10 }),
      game('owls-win', { teamId: 'owls', myTeamName: 'Owls', timestamp: 2 }),
      game('zoo-loss', { teamId: 'zoo', timestamp: 3, myScore: 8, opponentScore: 13 }),
    ]);

    expect(teams).toEqual([
      { id: 'zoo', name: 'Zoo', gameCount: 2, record: '1–1', latestTimestamp: 3 },
      { id: 'owls', name: 'Owls', gameCount: 1, record: '1–0', latestTimestamp: 2 },
    ]);
  });

  it('names a team from its newest game', () => {
    const [team] = summarizeSavedGameTeams([
      game('new', { timestamp: 2, myTeamName: 'New Name' }),
      game('old', { timestamp: 1, myTeamName: 'Old Name' }),
    ]);

    expect(team.name).toBe('New Name');
  });

  it('skips a newer scrimmage’s side label when naming the team', () => {
    const scrimmage: LinkedGameListItem = {
      ...game('scrim', { timestamp: 2, myTeamName: 'Light', opponentName: 'Dark' }),
      kind: 'advanced',
      gameType: 'scrimmage',
    };
    const [team] = summarizeSavedGameTeams([scrimmage, game('game', { timestamp: 1 })]);

    expect(team).toMatchObject({ name: 'Zoo', record: '1–0 · 1 scrim', latestTimestamp: 2 });
  });
});

const advanced = (id: string, gameType: 'game' | 'scrimmage' = 'game'): LinkedGameListItem => ({
  ...game(id),
  kind: 'advanced',
  gameType,
});

describe('getSelectionActionBlocks', () => {
  const gamesOfKind = (kind: GameKind, count: number) =>
    Array.from({ length: count }, (_, index) =>
      kind === 'advanced' ? advanced(`g${index}`) : game(`g${index}`),
    );

  it('allows every action for a shareable selection of one kind', () => {
    expect(getSelectionActionBlocks([game('a'), game('b')])).toEqual({
      viewStats: null,
      share: null,
      addToTournament: null,
    });
  });

  it('blocks combining, sharing, and adding a selection of both kinds', () => {
    expect(getSelectionActionBlocks([game('a'), advanced('b')])).toEqual({
      viewStats: "Basic and advanced games can't be combined.",
      share: 'Share basic games or advanced games separately.',
      addToTournament: 'Add basic and advanced games to tournaments separately.',
    });
  });

  it('blocks combining scrimmages but still shares and adds them', () => {
    expect(getSelectionActionBlocks([advanced('a'), advanced('b', 'scrimmage')])).toEqual({
      viewStats: "Scrimmages can't be combined.",
      share: null,
      addToTournament: null,
    });
  });

  it('lets a lone scrimmage open its own stats', () => {
    expect(getSelectionActionBlocks([advanced('a', 'scrimmage')]).viewStats).toBeNull();
  });

  it.each([
    ['basic', `You can share up to ${MAX_SHARE_GAMES_BY_KIND.basic} games at a time.`],
    [
      'advanced',
      `You can share up to ${MAX_SHARE_GAMES_BY_KIND.advanced} advanced games at a time.`,
    ],
  ] as const)('blocks sharing more %s games than the share limit', (kind, reason) => {
    const limit = MAX_SHARE_GAMES_BY_KIND[kind];
    expect(getSelectionActionBlocks(gamesOfKind(kind, limit + 1)).share).toBe(reason);
    expect(getSelectionActionBlocks(gamesOfKind(kind, limit)).share).toBeNull();
  });
});

describe('getSelectionKind', () => {
  it('returns the kind shared by every selected game', () => {
    expect(getSelectionKind([advanced('a'), advanced('b')])).toBe('advanced');
  });

  it('throws for a selection of both kinds', () => {
    expect(() => getSelectionKind([game('a'), advanced('b')])).toThrow();
  });
});

describe('filterSavedGames', () => {
  const a = tournament('a');
  const games = [
    game('in-a', { tournament: a }),
    game('in-b', { tournament: tournament('b') }),
    game('other', { myTeamName: 'Hybrid', opponentName: 'Beta' }),
  ];

  it('keeps only games in the filtered tournament', () => {
    expect(ids(filterSavedGames(games, { tournament: a, query: '' }))).toEqual(['in-a']);
  });

  it.each([
    ['team name', ' HYBRID '],
    ['opponent name', 'beta'],
  ])('matches the %s with trimmed, case-insensitive search', (_field, query) => {
    expect(ids(filterSavedGames(games, { tournament: null, query }))).toEqual(['other']);
  });

  it('matches the tournament name', () => {
    expect(ids(filterSavedGames(games, { tournament: null, query: 'a open' }))).toEqual(['in-a']);
  });

  it('matches the weekday and date shown in day headings, and the year', () => {
    const played = new Date(2024, 2, 15, 12);
    const dated = [game('old', { timestamp: played.getTime() }), game('new')];
    const weekday = played.toLocaleDateString(undefined, { weekday: 'short' });
    const monthDay = played.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    for (const query of [weekday, monthDay, '2024']) {
      expect(ids(filterSavedGames(dated, { tournament: null, query }))).toEqual(['old']);
    }
  });
});

describe('countTeamSearchMatches', () => {
  it('counts each listed team’s matches in team order and drops teams without one', () => {
    const [owls, zoo, hawks] = summarizeSavedGameTeams([
      game('owls', { teamId: 'owls', myTeamName: 'Owls', timestamp: 3 }),
      game('zoo', { teamId: 'zoo', timestamp: 2 }),
      game('hawks', { teamId: 'hawks', myTeamName: 'Hawks', timestamp: 1 }),
    ]);
    const games = [
      game('zoo-1', { teamId: 'zoo', opponentName: 'Beta' }),
      game('zoo-2', { teamId: 'zoo', opponentName: 'Beta', tournament: tournament('a') }),
      game('owls-1', { teamId: 'owls', myTeamName: 'Owls', opponentName: 'Beta' }),
      game('hawks-1', { teamId: 'hawks', myTeamName: 'Hawks', opponentName: 'Gamma' }),
    ];

    expect(countTeamSearchMatches([owls, zoo, hawks], games, 'beta')).toEqual([
      { team: owls, matchCount: 1 },
      { team: zoo, matchCount: 2 },
    ]);
  });
});

describe('sortSavedGames', () => {
  const games = [
    game('mid', { timestamp: 2, myTeamName: 'Mango', myScore: 10, opponentScore: 10 }),
    game('low', { timestamp: 1, myTeamName: 'Zebra', myScore: 5, opponentScore: 3 }),
    game('high', { timestamp: 3, myTeamName: 'Apple', myScore: 15, opponentScore: 13 }),
  ];

  it.each<[SavedGamesSortKey, string[]]>([
    ['newest', ['high', 'mid', 'low']],
    ['oldest', ['low', 'mid', 'high']],
    ['points-desc', ['high', 'mid', 'low']],
    ['points-asc', ['low', 'mid', 'high']],
  ])('orders %s', (key, expected) => {
    expect(ids(sortSavedGames(games, key))).toEqual(expected);
  });
});

describe('groupSavedGames', () => {
  it('keeps consecutive same-day games together in sorted order', () => {
    const day1 = new Date(2026, 0, 1, 10).getTime();
    const day2 = new Date(2026, 0, 2, 10).getTime();
    const groups = groupSavedGames(
      [
        game('d2-late', { timestamp: day2 + 1 }),
        game('d2-early', { timestamp: day2 }),
        game('d1', { timestamp: day1 }),
      ],
      true,
    );

    expect(groups.map((group) => ids(group.games))).toEqual([['d2-late', 'd2-early'], ['d1']]);
  });

  it('puts every game in one untitled group when not grouped by day', () => {
    const groups = groupSavedGames([game('a'), game('b')], false);
    expect(groups).toEqual([{ key: 'all', title: null, games: [game('a'), game('b')] }]);
  });
});

describe('getSharedTournament', () => {
  it('returns the tournament every game shares, or null when a day mixes tournaments', () => {
    const a = tournament('a');
    expect(getSharedTournament([game('1', { tournament: a }), game('2', { tournament: a })])).toBe(
      a,
    );
    expect(
      getSharedTournament([
        game('1', { tournament: a }),
        game('2', { tournament: tournament('b') }),
      ]),
    ).toBeNull();
    expect(
      getSharedTournament([game('1', { tournament: a }), game('2', { tournament: null })]),
    ).toBeNull();
  });
});
