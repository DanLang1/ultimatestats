import { buildAnalyticsGame } from '../buildAnalyticsGame';
import {
  areBothAnalyticsSidesFullyTracked,
  areBothSidesFullyTracked,
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
    expect(isSideFullyTracked(game, 'home')).toBe(true);
    expect(areBothAnalyticsSidesFullyTracked(buildAnalyticsGame(game))).toBe(true);
  });

  it('returns false when one side is anonymous', () => {
    const singleSideGame: AdvancedTrackedGame = {
      ...game,
      sides: [game.sides[0], { ...game.sides[1], trackingMode: 'anonymous' }],
    };

    expect(areBothSidesFullyTracked(singleSideGame)).toBe(false);
    expect(isSideFullyTracked(singleSideGame, 'away')).toBe(false);
    expect(areBothAnalyticsSidesFullyTracked(buildAnalyticsGame(singleSideGame))).toBe(false);
  });

  it('supports timeline line correction for scrimmages or exactly one full-roster side', () => {
    expect(supportsTimelineLineCorrection(game)).toBe(false);
    expect(
      supportsTimelineLineCorrection({
        ...game,
        sides: [game.sides[0], { ...game.sides[1], trackingMode: 'anonymous' }],
      }),
    ).toBe(true);
    expect(supportsTimelineLineCorrection({ ...game, gameType: 'scrimmage' })).toBe(true);
  });
});
