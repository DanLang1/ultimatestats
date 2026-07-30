import {
  getAdvancedFocusSide,
  getAdvancedFocusTeamName,
  getAdvancedGameTimestamp,
  getAdvancedOpponentName,
} from '@/lib/advancedTracking/advancedGameTeamUtils';
import { getGameScore } from '@/lib/advancedTracking/trackingUtils';
import type {
  AdvancedGameType,
  AdvancedTrackedGame,
  GameStatus,
} from '@/lib/advancedTracking/types';

export interface AdvancedGameSummary {
  id: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  importedAt?: number;
  playedAt: number | null;
  sortTimestamp: number;
  status: GameStatus;
  gameType: AdvancedGameType;
  focusSideId: string;
  focusSourceTeamId: string | null;
  myTeamName: string;
  opponentName: string;
  myScore: number;
  opponentScore: number;
  pointsTracked: number;
}

export function getAdvancedGamePlayedAt(game: AdvancedTrackedGame): number | null {
  if (!game.metadata?.date) return null;
  return new Date(game.metadata.date).getTime() || null;
}

export function deriveAdvancedGameSummary(game: AdvancedTrackedGame): AdvancedGameSummary {
  const focusSide = getAdvancedFocusSide(game);
  const opponentSide = game.sides.find((side) => side.id !== game.focusSideId);
  const score = getGameScore(game);

  return {
    id: game.id,
    schemaVersion: game.schemaVersion,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    importedAt: game.importedAt,
    playedAt: getAdvancedGamePlayedAt(game),
    sortTimestamp: getAdvancedGameTimestamp(game),
    status: game.status,
    gameType: game.gameType,
    focusSideId: game.focusSideId,
    focusSourceTeamId: focusSide?.sourceTeamId ?? null,
    myTeamName: getAdvancedFocusTeamName(game),
    opponentName: getAdvancedOpponentName(game),
    myScore: score[game.focusSideId] ?? 0,
    opponentScore: opponentSide ? (score[opponentSide.id] ?? 0) : 0,
    pointsTracked: game.points.length,
  };
}

export function isCompletedAdvancedGameSummary(summary: AdvancedGameSummary): boolean {
  return summary.status === 'final' || summary.status === 'terminated';
}

export function isAdvancedGameAggregateEligible(
  game: Pick<AdvancedTrackedGame, 'gameType'>,
): boolean {
  return game.gameType !== 'scrimmage';
}

export function compareAdvancedGameSummaries(
  a: AdvancedGameSummary,
  b: AdvancedGameSummary,
): number {
  return b.sortTimestamp - a.sortTimestamp || b.updatedAt - a.updatedAt;
}
