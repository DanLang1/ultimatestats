import type { AdvancedTrackedGame } from './types';

export function getAdvancedFocusSide(game: AdvancedTrackedGame) {
  return game.sides.find((side) => side.id === game.focusSideId) ?? null;
}

export function getAdvancedFocusTeamId(game: AdvancedTrackedGame) {
  return getAdvancedFocusSide(game)?.sourceTeamId ?? game.focusSideId;
}

export function getAdvancedFocusTeamName(game: AdvancedTrackedGame) {
  return getAdvancedFocusSide(game)?.label ?? 'My Team';
}

export function getAdvancedGameTimestamp(game: AdvancedTrackedGame) {
  if (game.metadata?.date) {
    return new Date(game.metadata.date).getTime() || game.createdAt;
  }
  return game.createdAt;
}

export function getAdvancedOpponentName(game: AdvancedTrackedGame) {
  const opponentSide = game.sides.find((side) => side.id !== game.focusSideId);
  return game.metadata?.opponentName ?? opponentSide?.label ?? 'Opponent';
}

export function getAdvancedGameLabel(game: AdvancedTrackedGame) {
  const date = new Date(getAdvancedGameTimestamp(game)).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return `${date} vs ${getAdvancedOpponentName(game)}`;
}
