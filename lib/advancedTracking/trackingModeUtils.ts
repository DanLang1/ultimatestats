import type { AdvancedTrackedGame } from './types';

export function areBothSidesFullyTracked(game: Pick<AdvancedTrackedGame, 'sides'>): boolean {
  return game.sides.length === 2 && game.sides.every((side) => side.trackingMode === 'full-roster');
}

export function getFullyTrackedSideIds(game: Pick<AdvancedTrackedGame, 'sides'>): string[] {
  return game.sides.filter((side) => side.trackingMode === 'full-roster').map((side) => side.id);
}

export function supportsTimelineLineCorrection(game: Pick<AdvancedTrackedGame, 'sides'>): boolean {
  return getFullyTrackedSideIds(game).length > 0;
}
