import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';

import TutorialAdvancedLineSelection from '@/components/tutorial/TutorialAdvancedLineSelection';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { renderScreen } from '@/test/render';

describe('tutorial and production line-selection parity', () => {
  beforeEach(async () => {
    resetAllStores();
    await AsyncStorage.clear();
  });

  it('keeps the scripted selection unchanged after an early player tap', async () => {
    const user = userEvent.setup();
    await renderScreen(<TutorialAdvancedLineSelection onBack={() => {}} onComplete={() => {}} />);

    await user.press(screen.getByTestId('player-chip-Kelly'));

    expect(screen.getByText('Start by loading the D-Line preset.')).toBeOnTheScreen();
    expect(screen.getByText('0/7')).toBeOnTheScreen();
  });

  it('keeps the preset selected without exceeding seven players', async () => {
    const user = userEvent.setup();
    await renderScreen(<TutorialAdvancedLineSelection onBack={() => {}} onComplete={() => {}} />);

    await user.press(await screen.findByTestId('line-select-quick-preset-tutorial-d-line'));
    await user.press(screen.getByTestId('line-select-show-all-players'));
    await user.press(screen.getByTestId('player-chip-Frank'));

    expect(screen.getByTestId('line-select-quick-preset-tutorial-d-line')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByText('7/7')).toBeOnTheScreen();
    expect(screen.getByTestId('player-chip-Frank')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: false }),
    );
  });
});
