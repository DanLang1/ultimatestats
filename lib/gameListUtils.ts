import type { AdvancedGameSummary } from '@/lib/advancedTracking/summary';
import { getGameScore } from '@/lib/advancedTracking/trackingUtils';
import type { AdvancedGameType, AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { resolveTeamName } from '@/lib/playerUtils';
import { getGameDisplayTimestamp } from '@/lib/savedGameUtils';
import { SavedGame, SavedTeam, Tournament } from '@/lib/storage';

export type GameKind = 'basic' | 'advanced';

export type GameListItem =
  | {
      kind: 'basic';
      id: string;
      timestamp: number;
      myTeamName: string;
      opponentName: string;
      myScore: number;
      opponentScore: number;
      tournamentId?: string;
    }
  | {
      kind: 'advanced';
      gameType: AdvancedGameType;
      id: string;
      timestamp: number;
      myTeamName: string;
      opponentName: string;
      myScore: number;
      opponentScore: number;
      tournamentId?: string;
    };

export function basicGameToListItem(game: SavedGame, savedTeams: SavedTeam[]): GameListItem {
  return {
    kind: 'basic',
    id: game.id,
    timestamp: getGameDisplayTimestamp(game),
    myTeamName: resolveTeamName(game.team1.id, game.team1.name, savedTeams),
    opponentName: game.team2Name,
    myScore: game.team1Score,
    opponentScore: game.team2Score,
    tournamentId: game.tournamentId,
  };
}

export function advancedGameToListItem(game: AdvancedTrackedGame): GameListItem {
  const focusSide = game.sides.find((s) => s.id === game.focusSideId);
  const oppSide = game.sides.find((s) => s.id !== game.focusSideId);
  const score = getGameScore(game);

  const myTeamName = focusSide?.label ?? 'My Team';

  const opponentName = game.metadata?.opponentName ?? oppSide?.label ?? 'Opponent';

  const myScore = score[game.focusSideId] ?? 0;
  const opponentScore = oppSide ? (score[oppSide.id] ?? 0) : 0;

  const timestamp = game.metadata?.date
    ? new Date(game.metadata.date).getTime() || game.createdAt
    : game.createdAt;

  return {
    kind: 'advanced',
    gameType: game.gameType,
    id: game.id,
    timestamp,
    myTeamName,
    opponentName,
    myScore,
    opponentScore,
  };
}

export function advancedGameSummaryToListItem(summary: AdvancedGameSummary): GameListItem {
  return {
    kind: 'advanced',
    gameType: summary.gameType,
    id: summary.id,
    timestamp: summary.sortTimestamp,
    myTeamName: summary.myTeamName,
    opponentName: summary.opponentName,
    myScore: summary.myScore,
    opponentScore: summary.opponentScore,
  };
}

/**
 * Like `advancedGameSummaryToListItem`, but names the tracked team by its live saved-team name, as
 * basic games do, so a renamed team's games share one name.
 */
export function advancedGameSummaryToTeamListItem(
  summary: AdvancedGameSummary,
  savedTeams: SavedTeam[],
): GameListItem {
  const item = advancedGameSummaryToListItem(summary);
  if (summary.focusSourceTeamId === null) return item;
  return {
    ...item,
    myTeamName: resolveTeamName(summary.focusSourceTeamId, summary.myTeamName, savedTeams),
  };
}

export type GameResult = 'win' | 'loss' | 'tie';

/** A scrimmage pits two sides of the same team, so it has no win or loss for the tracked side. */
export function isScrimmage(game: GameListItem): boolean {
  return game.kind === 'advanced' && game.gameType === 'scrimmage';
}

/** Result from the tracked side's perspective. */
export function getGameResult(game: GameListItem): GameResult {
  if (game.myScore > game.opponentScore) return 'win';
  if (game.myScore < game.opponentScore) return 'loss';
  return 'tie';
}

/**
 * Win–loss(–tie) record for a group of games; scrimmages are counted separately since they have no
 * result. Null when the group mixes tracked teams, since one combined record would credit neither.
 */
export function formatRecord(games: GameListItem[]): string | null {
  // Scrimmage sides are labels like "Light", not tracked teams, so they don't count as a mix.
  const trackedTeams = new Set(
    games.filter((game) => !isScrimmage(game)).map((game) => game.myTeamName),
  );
  if (trackedTeams.size > 1) return null;

  let wins = 0;
  let losses = 0;
  let ties = 0;
  let scrimmages = 0;
  for (const game of games) {
    if (isScrimmage(game)) {
      scrimmages++;
      continue;
    }
    const result = getGameResult(game);
    if (result === 'win') wins++;
    else if (result === 'loss') losses++;
    else ties++;
  }
  const scrimmageLabel = `${scrimmages} ${scrimmages === 1 ? 'scrim' : 'scrims'}`;
  if (wins + losses + ties === 0) return scrimmageLabel;
  const record = ties > 0 ? `${wins}–${losses}–${ties}` : `${wins}–${losses}`;
  return scrimmages > 0 ? `${record} · ${scrimmageLabel}` : record;
}

/**
 * Tracked side's points scored minus points allowed, e.g. "+8", "−5", or "0". Scrimmages are
 * skipped because neither side is the opponent.
 */
export function formatPointDifferential(games: GameListItem[]): string {
  const differential = games
    .filter((game) => !isScrimmage(game))
    .reduce((sum, game) => sum + game.myScore - game.opponentScore, 0);
  if (differential > 0) return `+${differential}`;
  // A real minus sign, which matches the plus sign's width.
  if (differential < 0) return `\u2212${-differential}`;
  return '0';
}

/** Games that share a tournament, or the games linked to none when `tournament` is null. */
export interface TournamentGameSection {
  tournament: Tournament | null;
  /** Newest first; never empty. */
  games: GameListItem[];
}

/**
 * One section per tournament that has a listed game, ordered by its newest game, then a final
 * section for games linked to no tournament.
 */
export function groupGamesByTournament(
  games: GameListItem[],
  tournaments: Tournament[],
  tournamentIdsByGame: Map<string, string>,
): TournamentGameSection[] {
  const tournamentsById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
  // Map insertion order follows each tournament's newest game.
  const tournamentSections = new Map<string, TournamentGameSection>();
  const unlinkedGames: GameListItem[] = [];

  for (const game of [...games].sort((a, b) => b.timestamp - a.timestamp)) {
    const tournamentId = tournamentIdsByGame.get(game.id);
    if (tournamentId === undefined) {
      unlinkedGames.push(game);
      continue;
    }
    const section = tournamentSections.get(tournamentId);
    if (section) {
      section.games.push(game);
      continue;
    }
    const tournament = tournamentsById.get(tournamentId);
    if (!tournament) {
      throw new Error(`Game ${game.id} is linked to missing tournament ${tournamentId}`);
    }
    tournamentSections.set(tournamentId, { tournament, games: [game] });
  }

  const sections = [...tournamentSections.values()];
  if (unlinkedGames.length > 0) sections.push({ tournament: null, games: unlinkedGames });
  return sections;
}

/** Names the winner so screen readers announce the result without knowing the tracked side. */
function formatMarginLabel(game: GameListItem): string {
  const margin = Math.abs(game.myScore - game.opponentScore);
  if (margin === 0) return 'Tied';
  const winnerName = game.myScore > game.opponentScore ? game.myTeamName : game.opponentName;
  return `${winnerName} by ${margin}`;
}

/** A game row's accessibility label: matchup, score, winner, then the row's date or detail if any. */
export function formatGameRowAccessibilityLabel(
  game: GameListItem,
  detailLabel: string | null,
): string {
  const label = `${game.myTeamName} versus ${game.opponentName}, ${game.myScore} to ${game.opponentScore}, ${formatMarginLabel(game)}`;
  return detailLabel != null ? `${label}, ${detailLabel}` : label;
}

/** One tracked team in the aggregate team list. */
export interface AggregateTeam {
  id: string;
  name: string;
  /** Newest first; never empty. */
  games: GameListItem[];
}

/** Groups games by team with each team's games newest first, then sorts teams by most games. */
function groupGamesByTeam<T>(
  games: T[],
  getTeamId: (game: T) => string,
  toListItem: (game: T) => GameListItem,
): AggregateTeam[] {
  const teams = new Map<string, AggregateTeam>();
  for (const game of games) {
    const item = toListItem(game);
    const teamId = getTeamId(game);
    const team = teams.get(teamId);
    if (team) team.games.push(item);
    else teams.set(teamId, { id: teamId, name: item.myTeamName, games: [item] });
  }
  for (const team of teams.values()) team.games.sort((a, b) => b.timestamp - a.timestamp);
  return [...teams.values()].sort((a, b) => b.games.length - a.games.length);
}

/** Groups advanced games by focus team (source team when known), most games first. */
export function groupAdvancedGamesByTeam(
  games: AdvancedGameSummary[],
  savedTeams: SavedTeam[],
): AggregateTeam[] {
  return groupGamesByTeam(
    games,
    (game) => game.focusSourceTeamId ?? game.focusSideId,
    (game) => advancedGameSummaryToTeamListItem(game, savedTeams),
  );
}

/** Groups basic games by tracked team ID (names resolve live), most games first. */
export function groupBasicGamesByTeam(
  games: SavedGame[],
  savedTeams: SavedTeam[],
): AggregateTeam[] {
  return groupGamesByTeam(
    games,
    (game) => game.team1.id,
    (game) => basicGameToListItem(game, savedTeams),
  );
}
