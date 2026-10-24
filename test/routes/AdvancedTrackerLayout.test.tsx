import { screen, within } from '@testing-library/react-native';

import TrackerScreen from '@/app/(main)/advanced-tracking/tracker';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { participantRef } from '@/test/fixtures/advancedGameBuilder';
import { arrangeAdvancedPickupGame } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';
import { setWindow } from '@/test/window';

beforeEach(() => {
  resetAllStores();
  resetMockRouter();
  arrangeAdvancedPickupGame({ startedAt: Date.now() });
});

describe('tracker tablet landscape layout', () => {
  it('puts the scorecard and last-action card side by side in one header row', async () => {
    await setWindow('tabletLandscape');
    await renderScreen(<TrackerScreen />);

    const header = screen.getByTestId('tracker-landscape-header');
    expect(within(header).getByTestId('tracker-scorecard')).toBeVisible();
    expect(within(header).getByTestId('tracker-last-action-card')).toBeVisible();
  });

  it('stacks the scorecard and last-action card in tablet portrait', async () => {
    await setWindow('tablet');
    await renderScreen(<TrackerScreen />);

    expect(screen.queryByTestId('tracker-landscape-header')).not.toBeOnTheScreen();
    expect(screen.getByTestId('tracker-scorecard')).toBeVisible();
    expect(screen.getByTestId('tracker-last-action-card')).toBeVisible();
  });

  it('drops the header row when a timeout hides the last-action card', async () => {
    const result = useAdvancedTrackingStore
      .getState()
      .recordCaptureIntent({ kind: 'goal', scorer: participantRef('blair') });
    if (!result.ok) throw new Error(`Could not arrange completed point: ${result.reason}`);
    useAdvancedTrackingStore.getState().recordBetweenPointTimeout({ sideId: 'focus' });
    await setWindow('tabletLandscape');
    await renderScreen(<TrackerScreen />);

    expect(screen.getByText('TIMEOUT')).toBeVisible();
    expect(screen.queryByTestId('tracker-landscape-header')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('tracker-last-action-card')).not.toBeOnTheScreen();
    expect(screen.getByTestId('tracker-scorecard')).toBeVisible();
  });
});
