import { screen, userEvent } from '@testing-library/react-native';

import LiveScoreboard from '@/components/basic/scoreboard/LiveScoreboard';
import { useGameStore } from '@/store/basic/gameStore';
import { arrangeBasicGame } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { renderScreen } from '@/test/render';

describe('LiveScoreboard', () => {
  beforeEach(() => {
    resetAllStores();
    arrangeBasicGame({ statTrackingEnabled: true });
  });

  it('keeps the scoreboard mounted behind action entry', async () => {
    const user = userEvent.setup();
    await renderScreen(<LiveScoreboard />);

    await user.press(screen.getByText('DROP'));

    expect(screen.getByTestId('turnover-entry-overlay')).toBeVisible();
    expect(screen.getByTestId('turnover-entry-overlay')).toHaveStyle({
      position: 'absolute',
      bottom: 0,
    });
    expect(screen.getByTestId('turnover-entry-overlay-gesture-root')).toHaveStyle({ flex: 1 });
    expect(screen.getByText('Who dropped it?')).toBeVisible();
    expect(screen.getByText('Rivals')).toBeVisible();
    await user.press(screen.getByText('Cancel'));

    expect(screen.queryByTestId('turnover-entry-overlay')).not.toBeOnTheScreen();
    expect(useGameStore.getState().pendingTurnoverEntry).toBeNull();
  });

  it('records an action-bar turnover when a player is selected', async () => {
    const user = userEvent.setup();
    await renderScreen(<LiveScoreboard />);

    await user.press(screen.getByText('DROP'));
    await user.press(screen.getByTestId('player-chip-Alex'));

    expect(screen.queryByTestId('turnover-entry-overlay')).not.toBeOnTheScreen();
    expect(useGameStore.getState().events.at(-1)).toMatchObject({
      type: 'turnover',
      team: 'team1',
      subtype: 'drop',
      playerId: 'player-alex',
    });
  });

  it('keeps the scoreboard mounted behind score attribution', async () => {
    const user = userEvent.setup();
    await renderScreen(<LiveScoreboard />);

    await user.press(screen.getByLabelText('Score for Windchill'));

    expect(screen.getByTestId('stat-entry-overlay')).toBeVisible();
    expect(screen.getByTestId('stat-entry-overlay')).toHaveStyle({
      position: 'absolute',
      bottom: 0,
    });
    expect(screen.getByTestId('stat-entry-overlay-gesture-root')).toHaveStyle({ flex: 1 });
    expect(screen.getByText('Who scored?')).toBeVisible();
    await user.press(screen.getByTestId('player-chip-Alex'));
    await user.press(screen.getByTestId('player-chip-Blair'));

    expect(screen.queryByTestId('stat-entry-overlay')).not.toBeOnTheScreen();
    expect(useGameStore.getState().events.at(-1)).toMatchObject({
      type: 'goal',
      team: 'team1',
      goalPlayerId: 'player-alex',
      assistPlayerId: 'player-blair',
    });
  });
});
