import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';

import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import type { Participant } from '@/lib/advancedTracking/types';
import { useGameStore } from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { renderScreen } from '@/test/render';

const makeParticipant = (id: string, name: string): Participant => ({
  id,
  name,
});

describe('TrackerLineScreen scrimmage filtering', () => {
  beforeEach(async () => {
    resetAllStores();
    await AsyncStorage.clear();
  });

  it('shows the expanded roster on demand and labels an opposite-side player', async () => {
    const user = userEvent.setup();
    const lightPlayer = makeParticipant('light-player', 'Light Player');
    const darkPlayer = makeParticipant('dark-player', 'Dark Player');

    await renderScreen(
      <TrackerLineScreen
        participants={[lightPlayer]}
        allParticipants={[lightPlayer, darkPlayer]}
        rosterParticipants={[lightPlayer, darkPlayer]}
        playerStatusLabels={new Map([[darkPlayer.id, 'Dark']])}
        title="Light Line"
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByText('Light Player')).toBeVisible();
    expect(screen.queryByText('Dark Player')).not.toBeOnTheScreen();

    await user.press(screen.getByTestId('line-select-show-all-players'));

    expect(screen.getByText('Dark Player')).toBeVisible();
    expect(screen.getByText('Dark')).toBeVisible();
  });

  it('resolves history names from the full roster and drops unavailable players when loaded', async () => {
    const user = userEvent.setup();
    const joe = makeParticipant('joe', 'Joe Crossover');
    const available = Array.from({ length: 6 }, (_, index) =>
      makeParticipant(`available-${index + 1}`, `Available ${index + 1}`),
    );

    await renderScreen(
      <TrackerLineScreen
        participants={available}
        allParticipants={available}
        rosterParticipants={[joe, ...available]}
        title="Dark Line"
        recentLines={[
          {
            pointNumber: 1,
            playerIds: [joe.id, ...available.map((participant) => participant.id)],
          },
        ]}
        onConfirm={() => {}}
      />,
    );

    await user.press(screen.getByTestId('line-select-load-line'));

    expect(screen.getByText(/Joe/)).toBeVisible();
    expect(screen.queryByText(/\?/)).not.toBeOnTheScreen();

    await user.press(screen.getByText('Pt 1'));

    expect(screen.getByText('6/7')).toBeVisible();
    expect(screen.getByTestId('line-select-confirm')).toBeDisabled();
  });

  it('keeps all players visible when a recent line loads a crossover player', async () => {
    const user = userEvent.setup();
    const crossover = makeParticipant('crossover', 'Dark Crossover');
    const defaults = Array.from({ length: 6 }, (_, index) =>
      makeParticipant(`default-${index + 1}`, `Default ${index + 1}`),
    );

    await renderScreen(
      <TrackerLineScreen
        participants={defaults}
        allParticipants={[...defaults, crossover]}
        rosterParticipants={[...defaults, crossover]}
        title="Light Line"
        recentLines={[
          {
            pointNumber: 2,
            playerIds: [...defaults.map((participant) => participant.id), crossover.id],
          },
        ]}
        onConfirm={() => {}}
      />,
    );

    await user.press(screen.getByTestId('line-select-load-line'));
    await user.press(screen.getByText('Pt 2'));

    expect(screen.getByTestId('line-select-show-all-players')).toHaveProp('accessibilityState', {
      checked: true,
    });
    await user.press(screen.getByText(crossover.name));
    expect(screen.getByText(crossover.name)).toBeVisible();
  });

  it('keeps all players visible when a preset loads a crossover player', async () => {
    const user = userEvent.setup();
    const crossover = makeParticipant('preset-crossover', 'Preset Crossover');
    const defaults = Array.from({ length: 6 }, (_, index) =>
      makeParticipant(`preset-default-${index + 1}`, `Preset Default ${index + 1}`),
    );
    useLinePresetsStore.setState({
      presets: [
        {
          id: 'crossover-preset',
          name: 'Crossover Preset',
          playerIds: [...defaults.map((participant) => participant.id), crossover.id],
          teamId: useGameStore.getState().currentTeam.id,
        },
      ],
    });

    await renderScreen(
      <TrackerLineScreen
        participants={defaults}
        allParticipants={[...defaults, crossover]}
        rosterParticipants={[...defaults, crossover]}
        title="Light Line"
        onConfirm={() => {}}
      />,
    );

    await user.press(screen.getByText('Crossover Preset'));

    expect(screen.getByTestId('line-select-show-all-players')).toHaveProp('accessibilityState', {
      checked: true,
    });
    await user.press(screen.getByText(crossover.name));
    expect(screen.getByText(crossover.name)).toBeVisible();
  });
});
