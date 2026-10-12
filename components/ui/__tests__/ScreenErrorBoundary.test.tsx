import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import { ScreenErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockPathname } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

const originalDev = __DEV__;
beforeEach(() => {
  resetAllStores();
  resetMockRouter();
});
afterEach(() => {
  Reflect.set(global, '__DEV__', originalDev);
  jest.restoreAllMocks();
});

it.each([true, false])(
  'offers dashboard recovery and exposes diagnostics only in development=%s',
  async (development) => {
    Reflect.set(global, '__DEV__', development);
    const error = new Error('Invalid capture state: participant private-id');
    await renderScreen(<ScreenErrorBoundary error={error} retry={jest.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeVisible();
    if (development) expect(screen.getByText(error.message)).toBeVisible();
    else expect(screen.queryByText(error.message)).not.toBeOnTheScreen();
    await userEvent.setup().press(screen.getByText('Go to Dashboard'));
    expect(router.dismissTo).toHaveBeenCalledWith('/Dashboard');
  },
);

it('retries in place when Dashboard itself fails', async () => {
  setMockPathname('/Dashboard');
  const retry = jest.fn().mockResolvedValue(undefined);
  await renderScreen(<ScreenErrorBoundary error={new Error('dashboard failed')} retry={retry} />);
  await userEvent.setup().press(screen.getByText('Try Again'));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(router.dismissTo).not.toHaveBeenCalled();
});

it('links to Discord for troubleshooting', async () => {
  const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await renderScreen(<ScreenErrorBoundary error={new Error('failed')} retry={jest.fn()} />);
  expect(screen.getByText(/reach out on Discord for troubleshooting/)).toBeVisible();
  await userEvent.setup().press(screen.getByText('Report on Discord'));
  expect(openUrl).toHaveBeenCalledWith('https://discord.gg/AjsmqhZ2GH');
});
