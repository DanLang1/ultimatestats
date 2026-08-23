import { buildAnalyticsGame } from '../buildAnalyticsGame';
import {
  areBothAnalyticsSidesFullyTracked,
  areBothSidesFullyTracked,
  getFullyTrackedSideIds,
  isSideFullyTracked,
  supportsTimelineLineCorrection,
} from '../trackingModeUtils';
import type { AdvancedTrackedGame } from '../types';

const game: AdvancedTrackedGame = {
  id: 'dual-tracked-game',
  schemaVersion: 2,
  createdAt: 0,
  updatedAt: 0,
  gameType: 'game',
  status: 'in_progress',
  focusSideId: 'home',
  initialReceivingSideId: 'home',
  settings: { locationMode: 'none' },
  sides: [
    { id: 'home', label: 'Home', trackingMode: 'full-roster' },
    { id: 'away', label: 'Away', trackingMode: 'full-roster' },
  ],
  participants: [],
  points: [],
};

describe('trackingModeUtils', () => {
  it('derives both-side tracking from side capabilities rather than game type', () => {
    expect(game.gameType).toBe('game');
    expect(areBothSidesFullyTracked(game)).toBe(true);
    expect(getFullyTrackedSideIds(game)).toEqual(['home', 'away']);
    expect(isSideFullyTracked(game, 'home')).toBe(true);
    expect(areBothAnalyticsSidesFullyTracked(buildAnalyticsGame(game))).toBe(true);
  });

  it('returns false when one side is anonymous', () => {
    const singleSideGame: AdvancedTrackedGame = {
      ...game,
      sides: [game.sides[0], { ...game.sides[1], trackingMode: 'anonymous' }],
    };

    expect(areBothSidesFullyTracked(singleSideGame)).toBe(false);
    expect(getFullyTrackedSideIds(singleSideGame)).toEqual(['home']);
    expect(isSideFullyTracked(singleSideGame, 'away')).toBe(false);
    expect(areBothAnalyticsSidesFullyTracked(buildAnalyticsGame(singleSideGame))).toBe(false);
  });

  it('supports timeline line correction whenever at least one side is fully tracked', () => {
    expect(supportsTimelineLineCorrection(game)).toBe(true);
    expect(
      supportsTimelineLineCorrection({
        ...game,
        sides: [game.sides[0], { ...game.sides[1], trackingMode: 'anonymous' }],
      }),
    ).toBe(true);
    expect(
      supportsTimelineLineCorrection({
        sides: game.sides.map((side) => ({ ...side, trackingMode: 'anonymous' as const })),
      }),
    ).toBe(false);
  });
});
