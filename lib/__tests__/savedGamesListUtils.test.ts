import type { LinkedGameListItem } from '../gameListUtils';
import {
  filterSavedGames,
  getSharedTournament,
  getTournamentFilterOptions,
  groupSavedGames,
  SavedGamesSortKey,
  sortSavedGames,
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

describe('getTournamentFilterOptions', () => {
  const summaries = [tournament('basic', 'basic'), tournament('adv', 'advanced')].map((t) => ({
    tournament: t,
    gameCount: 1,
    latestTimestamp: 0,
  }));
  const optionIds = (kind: GameKind | null) =>
    getTournamentFilterOptions(summaries, kind).map((option) => option.tournament.id);

  it('keeps every tournament when no selection kind is given', () => {
    expect(optionIds(null)).toEqual(['basic', 'adv']);
  });

  it('keeps only tournaments of the selection kind', () => {
    expect(optionIds('advanced')).toEqual(['adv']);
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

describe('sortSavedGames', () => {
  const games = [
    game('mid', { timestamp: 2, myTeamName: 'Mango', myScore: 10, opponentScore: 10 }),
    game('low', { timestamp: 1, myTeamName: 'Zebra', myScore: 5, opponentScore: 3 }),
    game('high', { timestamp: 3, myTeamName: 'Apple', myScore: 15, opponentScore: 13 }),
  ];

  it.each<[SavedGamesSortKey, string[]]>([
    ['newest', ['high', 'mid', 'low']],
    ['oldest', ['low', 'mid', 'high']],
    ['team-asc', ['high', 'mid', 'low']],
    ['team-desc', ['low', 'mid', 'high']],
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
