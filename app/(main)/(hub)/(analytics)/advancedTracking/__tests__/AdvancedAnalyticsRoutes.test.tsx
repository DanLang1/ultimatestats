import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent, waitFor } from '@testing-library/react-native';

import AdvancedGameScreen from '@/app/(main)/(hub)/(analytics)/advancedTracking/analytics/[gameId]';
import AdvancedPlayerStatsScreen from '@/app/(main)/(hub)/(analytics)/advancedTracking/analytics/playerStats';
import AdvancedGameTimelineScreen from '@/app/(main)/(hub)/(analytics)/advancedTracking/analytics/timeline/[gameId]';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { arrangeAdvancedGame, cacheCurrentAdvancedGame } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

describe('advanced analytics routes', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('renders a dynamic advanced-game route from the real cached game store', async () => {
    arrangeAdvancedGame();
    const game = cacheCurrentAdvancedGame();
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameScreen />);

    expect(screen.getByText('ADVANCED GAME')).toBeVisible();
    expect(screen.getByText('PLAYED AT')).toBeVisible();
    expect(screen.getByText('Windchill')).toBeVisible();
    expect(screen.getByText('Rivals')).toBeVisible();
  });

  it('edits and persists a private note from a saved advanced game', async () => {
    const user = userEvent.setup();
    arrangeAdvancedGame();
    const game = cacheCurrentAdvancedGame();
    setMockSearchParams({ gameId: game.id });
    await renderScreen(<AdvancedGameScreen />);

    await user.press(screen.getByTestId('advanced-game-note-card'));
    await user.type(screen.getByTestId('advanced-game-note-input'), 'Review the red-zone offense.');
    await user.press(screen.getByTestId('advanced-game-note-save'));

    await waitFor(() => {
      expect(useSavedAdvancedGamesStore.getState().gamesById[game.id].metadata?.notes).toBe(
        'Review the red-zone offense.',
      );
    });
    expect(screen.getByText('Review the red-zone offense.')).toBeVisible();
  });

  it('renders the advanced timeline empty state from a real cached game', async () => {
    arrangeAdvancedGame();
    const game = cacheCurrentAdvancedGame();
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);

    expect(screen.getByText('GAME TIMELINE')).toBeVisible();
    expect(screen.getByText('Windchill vs Rivals')).toBeVisible();
    expect(screen.getByText('No points to display')).toBeVisible();
  });

  it('renders advanced player stats from a real cached game and participant', async () => {
    arrangeAdvancedGame();
    const game = cacheCurrentAdvancedGame();
    setMockSearchParams({
      gameId: game.id,
      participantId: 'player-alex',
      sideId: 'windchill',
    });

    await renderScreen(<AdvancedPlayerStatsScreen />);

    expect(screen.getByText('PLAYER STATS')).toBeVisible();
    expect(screen.getByText('Alex')).toBeVisible();
    expect(screen.getByText('Windchill stats')).toBeVisible();
  });
});
