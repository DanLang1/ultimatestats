import { resolveTeamName } from '@/lib/playerUtils';
import { getGameDisplayTimestamp } from '@/lib/savedGameUtils';
import { SavedGame, SavedTeam } from '@/lib/storage';
import { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { getGameScore } from '@/lib/advancedTracking/trackingUtils';
import type { AdvancedGameSummary } from '@/lib/advancedTracking/summary';

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
      pointsTracked: number;
      tournamentId?: string;
      importedAt?: number;
    }
  | {
      kind: 'advanced';
      id: string;
      timestamp: number;
      myTeamName: string;
      opponentName: string;
      myScore: number;
      opponentScore: number;
      pointsTracked: number;
      tournamentId?: string;
      importedAt?: number;
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
    pointsTracked: game.events.filter((e) => e.type === 'goal').length,
    tournamentId: game.tournamentId,
    importedAt: game.importedAt,
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
    id: game.id,
    timestamp,
    myTeamName,
    opponentName,
    myScore,
    opponentScore,
    pointsTracked: game.points.length,
    importedAt: game.importedAt,
  };
}

export function advancedGameSummaryToListItem(summary: AdvancedGameSummary): GameListItem {
  return {
    kind: 'advanced',
    id: summary.id,
    timestamp: summary.sortTimestamp,
    myTeamName: summary.myTeamName,
    opponentName: summary.opponentName,
    myScore: summary.myScore,
    opponentScore: summary.opponentScore,
    pointsTracked: summary.pointsTracked,
    importedAt: summary.importedAt,
  };
}
