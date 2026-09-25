import { defineAdvancedGameTestContext } from '@/test/fixtures/advancedGameBuilder';

import { computeAdvancedGameStats } from '../advancedGameStats';
import { computeAdvancedPlayerStats } from '../advancedPlayerStatsUtils';
import { computePullStats } from '../advancedPullStatsUtils';
import { computeAdvancedTeamStats } from '../advancedTeamStatsUtils';
import { computeAdvancedTimeOfPossessionStats } from '../advancedTimeOfPossessionUtils';
import { computeAdvancedTimingStats } from '../advancedTimingStatsUtils';
import {
  getAnalyticsOpposingSideId,
  getAnalyticsSidePerspective,
} from '../analyticsPerspectiveUtils';

const LIGHT = 'light';
const DARK = 'dark';

const statsFixtures = defineAdvancedGameTestContext({
  id: 'stats-bundle-game',
  createdAt: 0,
  updatedAt: 0,
  status: 'final',
  focusSideId: LIGHT,
  initialReceivingSideId: LIGHT,
  sides: [
    { id: LIGHT, label: 'Light', trackingMode: 'full-roster' },
    { id: DARK, label: 'Dark', trackingMode: 'full-roster' },
  ],
  players: {
    ana: { id: 'p_ana', name: 'Ana' },
    ben: { id: 'p_ben', name: 'Ben' },
    cal: { id: 'p_cal', name: 'Cal' },
    dee: { id: 'p_dee', name: 'Dee' },
    eli: { id: 'p_eli', name: 'Eli' },
    fay: { id: 'p_fay', name: 'Fay' },
    gus: { id: 'p_gus', name: 'Gus' },
    hal: { id: 'p_hal', name: 'Hal' },
    ivy: { id: 'p_ivy', name: 'Ivy' },
    jon: { id: 'p_jon', name: 'Jon' },
    kim: { id: 'p_kim', name: 'Kim' },
    leo: { id: 'p_leo', name: 'Leo' },
    mia: { id: 'p_mia', name: 'Mia' },
    ned: { id: 'p_ned', name: 'Ned' },
  },
  defaultLines: [
    {
      sideId: LIGHT,
      participantIds: ['p_ana', 'p_ben', 'p_cal', 'p_dee', 'p_eli', 'p_fay', 'p_gus'],
    },
    {
      sideId: DARK,
      participantIds: ['p_hal', 'p_ivy', 'p_jon', 'p_kim', 'p_leo', 'p_mia', 'p_ned'],
    },
  ],
});

const { ana, ben, hal, ivy } = statsFixtures.players;

function buildAnalytics() {
  return statsFixtures
    .scenario()
    .hold({ puller: hal, receiver: ana, scorer: ben, startedAt: 1000, recordedAt: 1000 })
    .startPoint({ puller: ana, receiver: hal, startedAt: 40000, recordedAt: 40000 })
    .goal(ivy, { recordedAt: 70000 })
    .buildAnalytics();
}

describe('computeAdvancedGameStats', () => {
  it('returns each slice identical to its standalone utility, for either side', () => {
    const analytics = buildAnalytics();

    for (const sideId of [LIGHT, DARK]) {
      const stats = computeAdvancedGameStats(analytics, sideId);
      const opposingSideId = getAnalyticsOpposingSideId(analytics, sideId);

      expect(stats.opposingSideId).toBe(opposingSideId);
      expect(stats.perspective).toEqual(getAnalyticsSidePerspective(analytics, sideId));
      expect(stats.playerStats).toEqual(computeAdvancedPlayerStats(analytics, sideId));
      expect(stats.teamStats).toEqual(computeAdvancedTeamStats(analytics, sideId));
      expect(stats.pullStats).toEqual(computePullStats(analytics, sideId));
      expect(stats.timingStats).toEqual(computeAdvancedTimingStats(analytics));
      expect(stats.timeOfPossessionStats).toEqual(
        computeAdvancedTimeOfPossessionStats(analytics, sideId, opposingSideId),
      );
    }
  });

  it('resolves the perspective and opposing side per requested side', () => {
    const analytics = buildAnalytics();

    expect(computeAdvancedGameStats(analytics, LIGHT).perspective.sideName).toBe('Light');
    expect(computeAdvancedGameStats(analytics, LIGHT).opposingSideId).toBe(DARK);
    expect(computeAdvancedGameStats(analytics, DARK).perspective.sideName).toBe('Dark');
    expect(computeAdvancedGameStats(analytics, DARK).opposingSideId).toBe(LIGHT);
  });
});
