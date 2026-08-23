import type { AnalyticsGame } from './analyticsTypes';
import type { AdvancedTrackedGame, GameSide } from './types';

export function isSideFullyTracked(
  game: Pick<AdvancedTrackedGame, 'sides'>,
  sideId: string,
): boolean {
  return game.sides.find((side) => side.id === sideId)?.trackingMode === 'full-roster';
}

export function areBothSidesFullyTracked(game: Pick<AdvancedTrackedGame, 'sides'>): boolean {
  return game.sides.length === 2 && game.sides.every((side) => side.trackingMode === 'full-roster');
}

export function getFullyTrackedSideIds(game: Pick<AdvancedTrackedGame, 'sides'>): string[] {
  return game.sides.filter((side) => side.trackingMode === 'full-roster').map((side) => side.id);
}

export function supportsTimelineLineCorrection(game: Pick<AdvancedTrackedGame, 'sides'>): boolean {
  return getFullyTrackedSideIds(game).length > 0;
}

export function areBothAnalyticsSidesFullyTracked(
  game: Pick<AnalyticsGame, 'focusSideId' | 'oppSideId' | 'sideTrackingModes'>,
): boolean {
  return (
    game.sideTrackingModes?.[game.focusSideId] === 'full-roster' &&
    game.sideTrackingModes[game.oppSideId] === 'full-roster'
  );
}

export function getSideTrackingModes(sides: GameSide[]): Record<string, GameSide['trackingMode']> {
  return Object.fromEntries(sides.map((side) => [side.id, side.trackingMode]));
}
