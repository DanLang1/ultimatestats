import type { AdvancedGameSummary } from '@/lib/advancedTracking/summary';
import { getGameScore } from '@/lib/advancedTracking/trackingUtils';
import type { AdvancedGameType, AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { resolveTeamName } from '@/lib/playerUtils';
import { getGameDisplayTimestamp } from '@/lib/savedGameUtils';
import { SavedGame, SavedTeam } from '@/lib/storage';

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

/** Aggregate team row subtitle, e.g. "2 games • 5 points tracked". */
export function formatAggregateTeamMeta(gameCount: number, pointsTracked: number): string {
  const games = `${gameCount} game${gameCount !== 1 ? 's' : ''}`;
  const points = `${pointsTracked} point${pointsTracked !== 1 ? 's' : ''}`;
  return `${games} • ${points} tracked`;
}

/** One focus team's row in the advanced aggregate list. */
export interface AdvancedAggregateTeam {
  id: string;
  name: string;
  gameCount: number;
  /** Points played across the team's games, not points scored. */
  totalPoints: number;
}

/** Groups advanced games by focus team (source team when known), most games first. */
export function groupAdvancedGamesByTeam(games: AdvancedGameSummary[]): AdvancedAggregateTeam[] {
  const groupMap = new Map<string, AdvancedAggregateTeam>();

  for (const game of games) {
    const teamId = game.focusSourceTeamId ?? game.focusSideId;
    const existing = groupMap.get(teamId);
    if (existing) {
      existing.gameCount++;
      existing.totalPoints += game.pointsTracked;
    } else {
      groupMap.set(teamId, {
        id: teamId,
        name: game.myTeamName,
        gameCount: 1,
        totalPoints: game.pointsTracked,
      });
    }
  }

  return Array.from(groupMap.values()).sort((a, b) => b.gameCount - a.gameCount);
}
