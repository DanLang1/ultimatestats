import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';

import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import { TUTORIAL_ADVANCED_LINE_PLAYERS } from '@/components/tutorial/tutorialAdvancedLineData';
import TutorialAdvancedLineSelection from '@/components/tutorial/TutorialAdvancedLineSelection';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { renderScreen } from '@/test/render';

describe('tutorial and production line-selection parity', () => {
  beforeEach(async () => {
    resetAllStores();
    await AsyncStorage.clear();
  });

  it('defines the production side of the shared visible contract', async () => {
    await renderScreen(
      <TrackerLineScreen
        participants={TUTORIAL_ADVANCED_LINE_PLAYERS}
        title="O-Point · 0-0"
        expectedRatio="more-women"
        initialSelectedIds={[
          'line-kelly',
          'line-rachel',
          'line-jules',
          'line-harper',
          'line-erin',
          'line-mark',
          'line-jerry',
        ]}
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByTestId('line-select-title')).toBeOnTheScreen();
    expect(screen.getByTestId('line-select-load-line')).toBeOnTheScreen();
    expect(screen.getByTestId('player-chip-Kelly')).toBeOnTheScreen();
    expect(screen.getByText('7/7')).toBeOnTheScreen();
    expect(screen.getByTestId('line-select-confirm')).toBeOnTheScreen();
  });

  it('defines the tutorial side of the shared visible contract', async () => {
    const user = userEvent.setup();
    await renderScreen(<TutorialAdvancedLineSelection onBack={() => {}} onComplete={() => {}} />);

    await user.press(screen.getByTestId('line-select-load-line'));
    await user.press(screen.getByText('D-Line'));

    expect(screen.getByTestId('line-select-title')).toBeOnTheScreen();
    expect(screen.getByTestId('line-select-load-line')).toBeOnTheScreen();
    expect(screen.getByTestId('player-chip-Kelly')).toBeOnTheScreen();
    expect(screen.getByText('7/7')).toBeOnTheScreen();
    expect(screen.getByTestId('line-select-confirm')).toBeOnTheScreen();
  });

  it('keeps the scripted selection unchanged after an early player tap', async () => {
    const user = userEvent.setup();
    await renderScreen(<TutorialAdvancedLineSelection onBack={() => {}} onComplete={() => {}} />);

    await user.press(screen.getByTestId('player-chip-Kelly'));

    expect(screen.getByText('Start by loading the D-Line preset.')).toBeOnTheScreen();
    expect(screen.getByText('0/7')).toBeOnTheScreen();
  });
});
