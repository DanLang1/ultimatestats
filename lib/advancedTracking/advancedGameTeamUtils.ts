import type { AdvancedTrackedGame } from './types';

export function getAdvancedFocusSide(game: AdvancedTrackedGame) {
  return game.sides.find((side) => side.id === game.focusSideId) ?? null;
}

/** Capture always sets the focus side's source team, and sharing rejects games without it. */
export function getAdvancedFocusSourceTeamId(game: AdvancedTrackedGame): string {
  const sourceTeamId = getAdvancedFocusSide(game)?.sourceTeamId;
  if (!sourceTeamId) throw new Error(`Advanced game ${game.id} has no focus source team`);
  return sourceTeamId;
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
