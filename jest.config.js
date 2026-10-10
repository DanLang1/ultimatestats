module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['<rootDir>/scripts/oxlint-plugin/'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  clearMocks: true,
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'context/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'plugins/**/*.{ts,tsx}',
    'store/**/*.{ts,tsx}',
    'theme/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    // These modules contain only types and emit no executable behavior.
    '!components/advancedTracking/types.ts',
    '!lib/timeOfPossessionTypes.ts',
    '!lib/advancedTracking/analyticsTypes.ts',
    '!lib/sharing/types.ts',
    '!lib/sharing/showcaseTypes.ts',
    '!store/basic/gameStore.types.ts',
    '!store/advancedTracking/trackingStore.types.ts',
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry|native-base|standard-navigation|immer))',
    // Avoid Reanimated's "Reentrant plugin detected" failure in multi-platform tests.
    '/node_modules/react-native-reanimated/plugin/',
    // This preset is part of Jest's transformer and must not itself be transformed.
    '/node_modules/@react-native/babel-preset/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
