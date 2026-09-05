import { screen, userEvent } from '@testing-library/react-native';

import OpeningSetupStats from '@/components/advancedTracking/OpeningSetupStats';
import type {
  AdvancedFlipStats,
  AdvancedInitialPullWinStats,
} from '@/lib/advancedTracking/advancedAggregateStatsUtils';
import { renderScreen } from '@/test/render';

const initialPullWinStats: AdvancedInitialPullWinStats = {
  receivingFirst: {
    games: 7,
    wins: 5,
    losses: 2,
    winPercentage: 5 / 7,
  },
  pullingFirst: {
    games: 1,
    wins: 1,
    losses: 0,
    winPercentage: 1,
  },
};

const flipStats: AdvancedFlipStats = {
  recorded: 2,
  wins: 1,
  losses: 1,
  winPercentage: 0.5,
  byChoice: {
    offense: {
      games: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      winPercentage: null,
    },
    defense: {
      games: 1,
      wins: 0,
      losses: 0,
      ties: 1,
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
};

describe('OpeningSetupStats', () => {
  it('shows a compact summary of flip and starting-possession results', async () => {
    await renderScreen(
      <OpeningSetupStats flipStats={flipStats} initialPullWinStats={initialPullWinStats} />,
    );

    expect(screen.getByTestId('advanced-opening-results-card')).toBeVisible();
    expect(screen.getByText('Flips Won')).toBeVisible();
    expect(screen.getByText('1 of 2 recorded')).toBeVisible();
    expect(screen.getByText('Started on Offense')).toBeVisible();
    expect(screen.getByText('5-2 record')).toBeVisible();
    expect(screen.getByText('Started on Defense')).toBeVisible();
    expect(screen.getByText('1-0 record')).toBeVisible();
  });

  it('restores recorded choices with explicit ties and omits unrecorded choices', async () => {
    await renderScreen(
      <OpeningSetupStats flipStats={flipStats} initialPullWinStats={initialPullWinStats} />,
    );

    expect(screen.queryByText('We chose defense')).not.toBeOnTheScreen();
    await userEvent.press(screen.getByRole('button', { name: 'Flip details' }));
    expect(screen.getByRole('button', { name: 'Flip details', expanded: true })).toBeVisible();
    expect(screen.queryByText('We chose offense')).not.toBeOnTheScreen();
    expect(screen.getByText('We chose defense')).toBeVisible();
    expect(screen.getByText('0W · 0L · 1 tie')).toBeVisible();
    expect(screen.getByText('After winning the flip')).toBeVisible();
    expect(screen.queryByText('We chose side')).not.toBeOnTheScreen();
    expect(screen.queryByText(/0-0-1/)).not.toBeOnTheScreen();
    await userEvent.press(screen.getByRole('button', { name: 'Flip details' }));
    expect(screen.queryByText('We chose defense')).not.toBeOnTheScreen();
    expect(screen.getByText('Started on Offense')).toBeVisible();
  });

  it('shows choice win rates alongside explicit records for each recorded choice', async () => {
    await renderScreen(
      <OpeningSetupStats
        flipStats={{
          ...flipStats,
          byChoice: {
            offense: { games: 3, wins: 2, losses: 1, ties: 0, winPercentage: 2 / 3 },
            defense: { games: 1, wins: 1, losses: 0, ties: 0, winPercentage: 1 },
            side: { games: 2, wins: 0, losses: 0, ties: 2, winPercentage: null },
          },
        }}
      />,
    );
    await userEvent.press(screen.getByRole('button', { name: 'Flip details' }));
    expect(screen.getByText('We chose offense')).toBeVisible();
    expect(screen.getByText('67% wins')).toBeVisible();
    expect(screen.getByText('2W · 1L')).toBeVisible();
    expect(screen.getByText('We chose defense')).toBeVisible();
    expect(screen.getByText('100% wins')).toBeVisible();
    expect(screen.getByText('We chose side')).toBeVisible();
    expect(screen.getByText('0W · 0L · 2 ties')).toBeVisible();
  });

  it('does not render an empty card when no results are available', async () => {
    await renderScreen(
      <OpeningSetupStats
        initialPullWinStats={{
          receivingFirst: { games: 0, wins: 0, losses: 0, winPercentage: null },
          pullingFirst: { games: 0, wins: 0, losses: 0, winPercentage: null },
        }}
      />,
    );

    expect(screen.queryByTestId('advanced-opening-results-card')).not.toBeOnTheScreen();
  });
});
