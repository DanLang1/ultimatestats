import { act } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

const WINDOWS = {
  portrait: { width: 390, height: 844 },
  landscape: { width: 844, height: 390 },
  tablet: { width: 900, height: 1200 },
  tabletLandscape: { width: 1200, height: 900 },
} as const;

export type TestWindow = keyof typeof WINDOWS;

const originalWindow = Dimensions.get('window');

// Importing this module guarantees the default window is restored after every test.
afterEach(async () => {
  await act(async () => Dimensions.set({ window: originalWindow }));
});

/** Resize the window the way a device rotation would; restored automatically after the test. */
export function setWindow(preset: TestWindow) {
  return act(async () =>
    Dimensions.set({ window: { ...WINDOWS[preset], scale: 1, fontScale: 1 } }),
  );
}
