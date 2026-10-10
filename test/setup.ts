import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { setUpTests } from 'react-native-reanimated';

import { requestUrl } from '@/test/fetch';

process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

// Keep the telemetry boundary observable without starting the SDK's background timers.
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  init: jest.fn(),
  wrap: (component: unknown) => component,
  wrapExpoRouterErrorBoundary: (component: unknown) => component,
}));

// Tests must stub the network with `jest.spyOn(global, 'fetch')`. Any other request is rejected and
// fails the test even when app code swallows the rejection.
const unstubbedRequests: string[] = [];
const blockUnstubbedFetch: typeof fetch = async (input) => {
  const url = requestUrl(input);
  unstubbedRequests.push(url);
  throw new Error(`Unstubbed network request: ${url}`);
};

beforeEach(() => {
  global.fetch = blockUnstubbedFetch;
});

afterEach(() => {
  const requests = unstubbedRequests.splice(0);
  if (requests.length > 0) {
    throw new Error(`Test made unstubbed network requests:\n${requests.join('\n')}`);
  }
});

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('@/lib/advancedTracking/storage', () =>
  jest.requireActual('@/test/mocks/advancedTrackingStorage'),
);
jest.mock('expo-router', () => jest.requireActual('@/test/mocks/expoRouter'));
jest.mock('expo-speech-recognition', () =>
  jest.requireActual('@/test/mocks/expoSpeechRecognition'),
);
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));

setUpTests();
