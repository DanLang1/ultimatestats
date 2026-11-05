import { MAX_SHARE_GAMES_BY_KIND } from '@/lib/constants';
import { formatDayTitle } from '@/lib/dateUtils';
import { formatRecord, GameListItem, isScrimmage, LinkedGameListItem } from '@/lib/gameListUtils';
import { GameKind, Tournament } from '@/lib/storage/types';

export type SavedGamesSortField = 'date' | 'score';
export type SavedGamesSortDirection = 'asc' | 'desc';
export type SavedGamesSortKey = 'newest' | 'oldest' | 'points-desc' | 'points-asc';

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

/** A tracked team with saved games, for the Saved Games team switcher. */
export interface SavedGameTeam {
  id: string;
  /** The name on the team's newest game, preferring one that isn't a scrimmage. */
  name: string;
  gameCount: number;
  /** As `formatRecord`, e.g. "4–2" or "4–2 · 1 scrim". */
  record: string;
  latestTimestamp: number;
}

/** One entry per tracked team, the team with the newest game first. */
export function summarizeSavedGameTeams(games: GameListItem[]): SavedGameTeam[] {
  const gamesByTeam = new Map<string, GameListItem[]>();
  for (const game of games) {
    const teamGames = gamesByTeam.get(game.teamId);
    if (teamGames) teamGames.push(game);
    else gamesByTeam.set(game.teamId, [game]);
  }
  return [...gamesByTeam.entries()]
    .map(([id, teamGames]) => {
      const newestFirst = [...teamGames].sort((a, b) => b.timestamp - a.timestamp);
      // A scrimmage names its side ("Light"), which only stands in for the team when the saved
      // team is gone.
      const namingGame = newestFirst.find((game) => !isScrimmage(game)) ?? newestFirst[0];
      return {
        id,
        name: namingGame.myTeamName,
        gameCount: teamGames.length,
        record: formatRecord(teamGames),
        latestTimestamp: newestFirst[0].timestamp,
      };
    })
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
}

/**
 * Why each select-bar action can't run on the selected games, or null when it can. Delete runs on
 * any selection, so it has no entry.
 */
export interface SelectionActionBlocks {
  viewStats: string | null;
  share: string | null;
  addToTournament: string | null;
}

/** The Saved Games select bar's action rules for a non-empty selection. */
export function getSelectionActionBlocks(games: GameListItem[]): SelectionActionBlocks {
  const kind = games[0].kind;
  if (games.some((game) => game.kind !== kind)) {
    return {
      viewStats: "Basic and advanced games can't be combined.",
      share: 'Share basic games or advanced games separately.',
      addToTournament: 'Add basic and advanced games to tournaments separately.',
    };
  }

  // One game opens its own stats, so only a combine is blocked by a scrimmage.
  const combinesScrimmage = games.length > 1 && games.some(isScrimmage);
  return {
    viewStats: combinesScrimmage ? "Scrimmages can't be combined." : null,
    share: getShareLimitBlock(kind, games.length),
    addToTournament: null,
  };
}

/** Why `count` games of one kind can't go in one share link, or null when they can. */
export function getShareLimitBlock(kind: GameKind, count: number): string | null {
  const shareLimit = MAX_SHARE_GAMES_BY_KIND[kind];
  if (count <= shareLimit) return null;
  const gameLabel = kind === 'advanced' ? 'advanced games' : 'games';
  return `You can share up to ${shareLimit} ${gameLabel} at a time.`;
}

/** The one kind of a selection the select bar allows an action on. */
export function getSelectionKind(games: GameListItem[]): GameKind {
  if (games.length === 0) throw new Error('getSelectionKind requires a selected game');
  const kind = games[0].kind;
  if (games.some((game) => game.kind !== kind)) {
    throw new Error('getSelectionKind requires games of one kind');
  }
  return kind;
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

/** A team and how many of its games match a search. */
export interface SavedGameTeamSearchMatch {
  team: SavedGameTeam;
  matchCount: number;
}

/**
 * The teams with games matching the search query, in the given team order. Ignores the tournament
 * filter, so it finds every match a switch to that team could show.
 */
export function countTeamSearchMatches(
  teams: SavedGameTeam[],
  games: LinkedGameListItem[],
  query: string,
): SavedGameTeamSearchMatch[] {
  const matches = filterSavedGames(games, { tournament: null, query });
  return teams
    .map((team) => ({
      team,
      matchCount: matches.filter((game) => game.teamId === team.id).length,
    }))
    .filter(({ matchCount }) => matchCount > 0);
}

/** Ascending order for each sort field; typed by field so a new field needs its own comparator. */
const SORT_FIELD_COMPARATORS: Record<
  SavedGamesSortField,
  (a: LinkedGameListItem, b: LinkedGameListItem) => number
> = {
  date: (a, b) => a.timestamp - b.timestamp,
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
