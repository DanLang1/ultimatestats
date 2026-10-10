import { defineAdvancedGameTestContext } from '@/test/fixtures/advancedGameBuilder';

import { computeAdvancedGameStats } from '../advancedGameStats';
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
    .startPoint({ puller: hal, receiver: ana, startedAt: 1000, recordedAt: 1000, hangTimeMs: 1000 })
    .goal(ben, { recordedAt: 11000 })
    .startPoint({
      puller: ana,
      receiver: hal,
      startedAt: 40000,
      recordedAt: 40000,
      hangTimeMs: 2000,
    })
    .goal(ivy, { recordedAt: 70000 })
    .startPoint({
      puller: hal,
      receiver: ana,
      startedAt: 80000,
      recordedAt: 80000,
      hangTimeMs: 3000,
    })
    .goal(ben, { recordedAt: 90000 })
    .buildAnalytics();
}

describe('computeAdvancedGameStats', () => {
  it('routes every slice to the requested side', () => {
    // Light scores twice in 20 seconds; Dark scores once in 30 seconds.
    // Dark pulls twice; Light pulls once. Each slice's math is owned by its own unit test.
    const analytics = buildAnalytics();
    const light = computeAdvancedGameStats(analytics, LIGHT);
    const dark = computeAdvancedGameStats(analytics, DARK);

    expect(light.perspective).toMatchObject({ sideName: 'Light' });
    expect(light.opposingSideId).toBe(DARK);
    expect(dark.perspective).toMatchObject({ sideName: 'Dark' });
    expect(dark.opposingSideId).toBe(LIGHT);

    expect(light.playerStats.find((player) => player.participantId === 'p_ben')).toMatchObject({
      goals: 2,
    });
    expect(light.playerStats.some((player) => player.participantId === 'p_ivy')).toBe(false);
    expect(dark.playerStats.find((player) => player.participantId === 'p_ivy')).toMatchObject({
      goals: 1,
    });
    expect(dark.playerStats.some((player) => player.participantId === 'p_ben')).toBe(false);

    expect(light.teamStats.holds).toBe(2);
    expect(dark.teamStats.holds).toBe(1);
    expect(light.pullStats.totalPulls).toBe(1);
    expect(dark.pullStats.totalPulls).toBe(2);
    expect(light.timeOfPossessionStats.team1TotalPossessionMs).toBe(20000);
    expect(dark.timeOfPossessionStats.team1TotalPossessionMs).toBe(30000);
  });
});
