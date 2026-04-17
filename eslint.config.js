const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const tseslint = require('@typescript-eslint/eslint-plugin');

const localPlugin = require('./scripts/eslint-rules/index.js');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', 'expo-env.d.ts'],
  },
  {
    plugins: {
      local: localPlugin,
    },
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      ...tseslint.configs.recommended.rules,
      'local/no-unscaled-sizes': 'error',
      'local/no-raw-text': 'error',
      'local/no-font-weight': 'error',
      'local/no-raw-colors': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='React'][property.name=/^use[A-Z]/]",
          message: 'Use named React hook imports (e.g. useState()) instead of React.useState().',
        },
      ],
    },
  },
]);
