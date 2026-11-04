import { formatDayTitle } from '@/lib/dateUtils';
import { LinkedGameListItem } from '@/lib/gameListUtils';
import { GameKind, Tournament } from '@/lib/storage/types';

export type SavedGamesSortField = 'date' | 'team' | 'score';
export type SavedGamesSortDirection = 'asc' | 'desc';
export type SavedGamesSortKey =
  | 'newest'
  | 'oldest'
  | 'team-asc'
  | 'team-desc'
  | 'points-desc'
  | 'points-asc';

export interface SavedGamesSortOption {
  key: SavedGamesSortKey;
  field: SavedGamesSortField;
  direction: SavedGamesSortDirection;
  /** Full wording for the picker sheet. */
  label: string;
  /** Compact wording for the sort button. */
  shortLabel: string;
}

export const SAVED_GAMES_SORT_OPTIONS: Record<SavedGamesSortKey, SavedGamesSortOption> = {
  newest: {
    key: 'newest',
    field: 'date',
    direction: 'desc',
    label: 'Newest first',
    shortLabel: 'Newest',
  },
  oldest: {
    key: 'oldest',
    field: 'date',
    direction: 'asc',
    label: 'Oldest first',
    shortLabel: 'Oldest',
  },
  'team-asc': {
    key: 'team-asc',
    field: 'team',
    direction: 'asc',
    label: 'Team A–Z',
    shortLabel: 'Team A–Z',
  },
  'team-desc': {
    key: 'team-desc',
    field: 'team',
    direction: 'desc',
    label: 'Team Z–A',
    shortLabel: 'Team Z–A',
  },
  'points-desc': {
    key: 'points-desc',
    field: 'score',
    direction: 'desc',
    label: 'Highest scoring',
    shortLabel: 'High scoring',
  },
  'points-asc': {
    key: 'points-asc',
    field: 'score',
    direction: 'asc',
    label: 'Lowest scoring',
    shortLabel: 'Low scoring',
  },
};

/** A tournament with at least one listed game, how many it has, and when its newest was played. */
export interface TournamentSummary {
  tournament: Tournament;
  gameCount: number;
  latestTimestamp: number;
}

/** One summary per tournament with a linked game, newest tournament (by its newest game) first. */
export function summarizeTournaments(games: LinkedGameListItem[]): TournamentSummary[] {
  const summaries = new Map<string, TournamentSummary>();
  for (const game of games) {
    const { tournament } = game;
    if (tournament === null) continue;
    const summary = summaries.get(tournament.id);
    if (summary) {
      summary.gameCount++;
      summary.latestTimestamp = Math.max(summary.latestTimestamp, game.timestamp);
    } else {
      summaries.set(tournament.id, { tournament, gameCount: 1, latestTimestamp: game.timestamp });
    }
  }
  return [...summaries.values()].sort((a, b) => b.latestTimestamp - a.latestTimestamp);
}

/** Tournaments the list can be filtered to: all of them, or only the selected kind's while selecting. */
export function getTournamentFilterOptions(
  summaries: TournamentSummary[],
  selectionKind: GameKind | null,
): TournamentSummary[] {
  return summaries.filter(
    ({ tournament }) => selectionKind === null || tournament.kind === selectionKind,
  );
}

export interface SavedGamesFilter {
  /** Null lists games from every tournament and none. */
  tournament: Tournament | null;
  query: string;
}

/** Games in the filtered tournament whose teams, day, or tournament name match the search. */
export function filterSavedGames(
  games: LinkedGameListItem[],
  { tournament, query }: SavedGamesFilter,
): LinkedGameListItem[] {
  let filtered = games;

  if (tournament !== null) {
    filtered = filtered.filter((game) => game.tournament?.id === tournament.id);
  }

  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery) {
    filtered = filtered.filter((game) => {
      const t1 = game.myTeamName.toLowerCase();
      const t2 = game.opponentName.toLowerCase();
      // Matches the day heading the list shows, e.g. "Thu, Oct 29", plus the year it may omit.
      const date =
        `${formatDayTitle(game.timestamp)} ${new Date(game.timestamp).getFullYear()}`.toLowerCase();
      const matchesTournament =
        game.tournament?.name.toLowerCase().includes(normalizedQuery) ?? false;
      return (
        t1.includes(normalizedQuery) ||
        t2.includes(normalizedQuery) ||
        date.includes(normalizedQuery) ||
        matchesTournament
      );
    });
  }

  return filtered;
}

/** Ascending order for each sort field; typed by field so a new field needs its own comparator. */
const SORT_FIELD_COMPARATORS: Record<
  SavedGamesSortField,
  (a: LinkedGameListItem, b: LinkedGameListItem) => number
> = {
  date: (a, b) => a.timestamp - b.timestamp,
  team: (a, b) => a.myTeamName.localeCompare(b.myTeamName),
  score: (a, b) => a.myScore + a.opponentScore - (b.myScore + b.opponentScore),
};

/** A sorted copy of the games. */
export function sortSavedGames(
  games: LinkedGameListItem[],
  key: SavedGamesSortKey,
): LinkedGameListItem[] {
  const { field, direction } = SAVED_GAMES_SORT_OPTIONS[key];
  const dir = direction === 'asc' ? 1 : -1;
  const compare = SORT_FIELD_COMPARATORS[field];
  return [...games].sort((a, b) => dir * compare(a, b));
}

export interface SavedGameGroup {
  key: string;
  /** Null when the list is not sorted by date, so the games share one ungrouped section. */
  title: string | null;
  games: LinkedGameListItem[];
}

/** Groups consecutive games that share a calendar day, preserving the sorted order. */
function groupGamesByDay(games: LinkedGameListItem[]): SavedGameGroup[] {
  const groups: SavedGameGroup[] = [];
  for (const game of games) {
    const key = new Date(game.timestamp).toDateString();
    const current = groups.at(-1);
    if (current?.key === key) {
      current.games.push(game);
    } else {
      groups.push({ key, title: formatDayTitle(game.timestamp), games: [game] });
    }
  }
  return groups;
}

/** Day groups when sorted by date, otherwise one untitled group. Every group has at least one game. */
export function groupSavedGames(
  games: LinkedGameListItem[],
  isGroupedByDay: boolean,
): SavedGameGroup[] {
  if (games.length === 0) return [];
  if (isGroupedByDay) return groupGamesByDay(games);
  return [{ key: 'all', title: null, games }];
}

/** The tournament every game in the group belongs to, or null when they differ or have none. */
export function getSharedTournament(games: LinkedGameListItem[]): Tournament | null {
  const firstTournament = games[0].tournament;
  if (firstTournament === null) return null;
  const sharesTournament = games.every((game) => game.tournament?.id === firstTournament.id);
  return sharesTournament ? firstTournament : null;
}
