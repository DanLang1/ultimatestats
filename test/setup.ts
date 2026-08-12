import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { setUpTests } from 'react-native-reanimated';

process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

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
