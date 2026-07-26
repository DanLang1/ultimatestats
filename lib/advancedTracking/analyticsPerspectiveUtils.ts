import type { AnalyticsGame } from './analyticsTypes';
import { getFinalScores } from './buildAnalyticsGame';

export interface AnalyticsSidePerspective {
  sideId: string;
  opposingSideId: string;
  sideName: string;
  opposingSideName: string;
  score: number;
  opposingScore: number;
}

export function getAnalyticsOpposingSideId(game: AnalyticsGame, sideId: string): string {
  if (sideId === game.focusSideId) return game.oppSideId;
  if (sideId === game.oppSideId) return game.focusSideId;
  throw new Error(`Side "${sideId}" does not belong to this analytics game.`);
}

export function resolveAnalyticsSideId(
  game: AnalyticsGame,
  requestedSideId: string | null,
): string {
  if (requestedSideId === game.focusSideId) return requestedSideId;
  if (requestedSideId === game.oppSideId) return requestedSideId;
  return game.focusSideId;
}

export function getAnalyticsSidePerspective(
  game: AnalyticsGame,
  sideId = game.focusSideId,
): AnalyticsSidePerspective {
  const opposingSideId = getAnalyticsOpposingSideId(game, sideId);
  const finalScores = getFinalScores(game);
  const opposingSideName =
    sideId === game.focusSideId && game.metadata?.opponentName
      ? game.metadata.opponentName
      : (game.sideLabels[opposingSideId] ?? 'Opponent');

  return {
    sideId,
    opposingSideId,
    sideName: game.sideLabels[sideId] ?? 'My Team',
    opposingSideName,
    score: finalScores[sideId] ?? 0,
    opposingScore: finalScores[opposingSideId] ?? 0,
  };
}
