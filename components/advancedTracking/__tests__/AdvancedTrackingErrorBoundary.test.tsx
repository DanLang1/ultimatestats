import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { AdvancedTrackingErrorBoundary } from '@/components/advancedTracking/AdvancedTrackingErrorBoundary';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

const originalDev = __DEV__;
beforeEach(() => {
  resetAllStores();
  resetMockRouter();
});
afterEach(() => {
  Reflect.set(global, '__DEV__', originalDev);
});

it.each([true, false])(
  'offers dashboard recovery and exposes diagnostics only in development=%s',
  async (development) => {
    Reflect.set(global, '__DEV__', development);
    const error = new Error('Invalid capture state: participant private-id');
    await renderScreen(<AdvancedTrackingErrorBoundary error={error} retry={jest.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeVisible();
    if (development) expect(screen.getByText(error.message)).toBeVisible();
    else expect(screen.queryByText(error.message)).not.toBeOnTheScreen();
    await userEvent.setup().press(screen.getByText('Go to Dashboard'));
    expect(router.dismissTo).toHaveBeenCalledWith('/Dashboard');
  },
);
