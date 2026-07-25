import { screen } from '@testing-library/react-native';

import OpeningSetupStats from '@/components/advancedTracking/OpeningSetupStats';
import type {
  AdvancedFlipStats,
  AdvancedInitialPullWinStats,
} from '@/lib/advancedTracking/advancedAggregateStatsUtils';
import { renderScreen } from '@/test/render';

const initialPullWinStats: AdvancedInitialPullWinStats = {
  receivingFirst: {
    games: 1,
    wins: 1,
    losses: 0,
    winPercentage: 1,
  },
  pullingFirst: {
    games: 2,
    wins: 0,
    losses: 2,
    winPercentage: 0,
  },
};

const flipStats: AdvancedFlipStats = {
  recorded: 3,
  wins: 2,
  losses: 1,
  winPercentage: 2 / 3,
  byChoice: {
    offense: {
      games: 1,
      wins: 1,
      losses: 0,
      ties: 0,
      winPercentage: 1,
    },
    defense: {
      games: 1,
      wins: 0,
      losses: 1,
      ties: 0,
      winPercentage: 0,
    },
    side: {
      games: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      winPercentage: null,
    },
  },
};

describe('OpeningSetupStats', () => {
  it('merges flip, starting possession, and recorded choices', async () => {
    await renderScreen(
      <OpeningSetupStats flipStats={flipStats} initialPullWinStats={initialPullWinStats} />,
    );

    expect(screen.getByText('Flips Won')).toBeVisible();
    expect(screen.getByText('2 of 3 recorded')).toBeVisible();
    expect(screen.getByText('67%')).toBeVisible();
    expect(screen.getByText('Started on Offense')).toBeVisible();
    expect(screen.getByText('Started on Defense')).toBeVisible();
    expect(screen.getByText('We chose offense')).toBeVisible();
    expect(screen.getByText('1-0 · 100%')).toBeVisible();
    expect(screen.getByText('We chose defense')).toBeVisible();
    expect(screen.getByText('0-1 · 0%')).toBeVisible();
    expect(screen.queryByText('We chose side')).not.toBeOnTheScreen();
  });

  it('hides choices that were not recorded', async () => {
    await renderScreen(
      <OpeningSetupStats
        flipStats={{
          ...flipStats,
          byChoice: {
            offense: {
              games: 0,
              wins: 0,
              losses: 0,
              ties: 0,
              winPercentage: null,
            },
            defense: {
              games: 0,
              wins: 0,
              losses: 0,
              ties: 0,
              winPercentage: null,
            },
            side: {
              games: 0,
              wins: 0,
              losses: 0,
              ties: 0,
              winPercentage: null,
            },
          },
        }}
        initialPullWinStats={initialPullWinStats}
      />,
    );

    expect(screen.queryByText('We chose offense')).not.toBeOnTheScreen();
    expect(screen.queryByText('We chose defense')).not.toBeOnTheScreen();
    expect(screen.queryByText('We chose side')).not.toBeOnTheScreen();
  });

  it('shows side choices and a tie value only when they occur', async () => {
    await renderScreen(
      <OpeningSetupStats
        flipStats={{
          ...flipStats,
          byChoice: {
            ...flipStats.byChoice,
            side: {
              games: 2,
              wins: 1,
              losses: 0,
              ties: 1,
              winPercentage: 1,
            },
          },
        }}
        initialPullWinStats={initialPullWinStats}
      />,
    );

    expect(screen.getByText('We chose side')).toBeVisible();
    expect(screen.getByText('1-0-1 · 100%')).toBeVisible();
  });
});
