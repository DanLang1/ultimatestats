const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier/flat');
const testingLibrary = require('eslint-plugin-testing-library');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

const localPlugin = require('./scripts/eslint-rules/index.js');

const testFiles = [
  '**/__tests__/**/*.ts',
  '**/__tests__/**/*.tsx',
  '**/*.test.ts',
  '**/*.test.tsx',
];

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    ignores: ['dist/*', 'expo-env.d.ts'],
  },
  {
    plugins: {
      local: localPlugin,
    },
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'local/no-unscaled-sizes': 'error',
      'local/no-raw-text': 'error',
      'local/no-font-weight': 'error',
      'local/no-raw-colors': 'error',
      'local/no-restricted-hooks': 'error',
      'local/no-sizeclass-prop': 'error',
      'local/no-advanced-storage-boundary': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='React'][property.name=/^use[A-Z]/]",
          message: 'Use named React hook imports (e.g. useState()) instead of React.useState().',
        },
      ],
      'react-hooks/immutability': 'error',
      'react-hooks/purity': 'error',
      'react-hooks/refs': 'error',
      'react-hooks/set-state-in-effect': 'error',
    },
  },
  {
    ...testingLibrary.configs['flat/react'],
    files: testFiles,
  },
  {
    files: testFiles,
    rules: {
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      'testing-library/prefer-explicit-assert': 'error',
      'testing-library/prefer-user-event': 'error',
      'testing-library/prefer-user-event-setup': 'error',
    },
  },
]);
