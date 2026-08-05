module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['<rootDir>/scripts/oxlint-plugin/'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  clearMocks: true,
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
