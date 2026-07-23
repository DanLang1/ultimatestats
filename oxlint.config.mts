import testingLibrary from 'eslint-plugin-testing-library';
import { defineConfig } from 'oxlint';

const TYPESCRIPT_FILES = ['**/*.ts', '**/*.tsx'];
const TEST_FILES = ['**/__tests__/**/*.{js,jsx,ts,tsx}', '**/*.test.{js,jsx,ts,tsx}'];
const TOOLING_FILES = [
  'scripts/**/*.{js,jsx,ts,tsx}',
  'plugins/**/*.{js,jsx,ts,tsx}',
  'test/**/*.{js,jsx,ts,tsx}',
  ...TEST_FILES,
  '*.config.{js,cjs,mjs,ts,cts,mts}',
  '**/*.config.{js,cjs,mjs,ts,cts,mts}',
];

export default defineConfig({
  plugins: ['eslint', 'import', 'oxc', 'react', 'typescript', 'unicorn'],
  jsPlugins: [
    'eslint-plugin-expo',
    'eslint-plugin-testing-library',
    './scripts/oxlint-plugin/index.ts',
  ],
  categories: {
    correctness: 'error',
    perf: 'error',
    suspicious: 'error',
  },
  options: {
    typeAware: true,
    denyWarnings: true,
    reportUnusedDisableDirectives: 'error',
  },
  env: {
    builtin: true,
    browser: true,
  },
  globals: {
    __DEV__: 'readonly',
    process: 'readonly',
  },
  settings: {
    'import/ignore': ['node_modules[\\\\/]+@?react-native'],
    react: {
      version: '19.2.3',
    },
  },
  ignorePatterns: ['android/app/build', '.expo/**', 'dist/*', 'expo-env.d.ts'],
  rules: {
    eqeqeq: ['error', 'smart'],
    'import/export': 'error',
    'import/first': 'error',
    'import/named': 'error',
    'import/namespace': 'error',
    'import/no-duplicates': 'error',
    'import/no-named-as-default': 'error',
    'import/no-named-as-default-member': 'error',
    'import/no-unassigned-import': [
      'error',
      {
        allow: ['react-native-reanimated', 'react-native-gesture-handler/jestSetup'],
      },
    ],
    'no-await-in-loop': 'off',
    'no-extend-native': 'error',
    'no-unused-expressions': [
      'error',
      {
        allowShortCircuit: true,
        enforceForJSX: true,
      },
    ],
    'no-unused-vars': [
      'error',
      {
        vars: 'all',
        args: 'none',
        ignoreRestSiblings: true,
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'no-var': 'error',
    'oxc/no-map-spread': 'off',
    'react/exhaustive-deps': 'error',
    'react/jsx-no-constructed-context-values': 'off',
    'react/no-array-index-key': 'off',
    'react/no-unstable-nested-components': ['error', { allowAsProps: true }],
    'react/no-unknown-property': 'error',
    'react/react-compiler': 'error',
    'react/react-in-jsx-scope': 'off',
    'react/rules-of-hooks': 'error',
    'react/style-prop-object': 'off',
    'unicode-bom': ['error', 'never'],
    'unicorn/consistent-function-scoping': 'off',
    'unicorn/no-array-reverse': 'off',
    'unicorn/no-array-sort': 'off',
    'expo/no-dynamic-env-var': 'error',
    'expo/no-env-var-destructuring': 'error',
    'expo/use-dom-exports': 'error',
  },
  overrides: [
    {
      files: ['**/metro.config.js'],
      env: {
        browser: false,
        node: true,
      },
    },
    {
      files: TYPESCRIPT_FILES,
      rules: {
        'no-array-constructor': 'error',
        'no-nested-ternary': 'error',
        'no-undef': 'off',
        'no-unneeded-ternary': 'error',
        'no-unused-expressions': [
          'error',
          {
            allowShortCircuit: false,
            allowTaggedTemplates: false,
            allowTernary: false,
          },
        ],
        'typescript/array-type': ['error', { default: 'array' }],
        'typescript/ban-ts-comment': 'error',
        'typescript/consistent-type-assertions': [
          'error',
          {
            assertionStyle: 'as',
            objectLiteralTypeAssertions: 'allow',
          },
        ],
        'typescript/no-duplicate-enum-values': 'error',
        'typescript/no-empty-object-type': 'error',
        'typescript/no-explicit-any': 'error',
        'typescript/no-extra-non-null-assertion': 'error',
        'typescript/no-misused-new': 'error',
        'typescript/no-namespace': 'error',
        'typescript/no-non-null-asserted-optional-chain': 'error',
        'typescript/no-unnecessary-boolean-literal-compare': 'off',
        'typescript/no-require-imports': [
          'error',
          {
            allow: [
              '\\.(aac|aiff|avif|bmp|caf|db|gif|heic|html|jpeg|jpg|json|m4a|m4v|mov|mp3|mp4|mpeg|mpg|otf|pdf|png|psd|svg|ttf|wav|webm|webp|xml|yaml|yml|zip)$',
            ],
          },
        ],
        'typescript/no-this-alias': 'error',
        'typescript/no-unnecessary-type-constraint': 'error',
        'typescript/no-unsafe-declaration-merging': 'error',
        'typescript/no-unsafe-function-type': 'error',
        'typescript/no-unsafe-type-assertion': 'error',
        'typescript/no-wrapper-object-types': 'error',
        'typescript/prefer-as-const': 'error',
        'typescript/prefer-namespace-keyword': 'error',
        'typescript/triple-slash-reference': 'error',
        'local/no-advanced-storage-boundary': 'error',
        'local/no-font-weight': 'error',
        'local/no-raw-colors': 'error',
        'local/no-raw-text': 'error',
        'local/no-react-namespace-hooks': 'error',
        'local/no-restricted-hooks': 'error',
        'local/no-sizeclass-prop': 'error',
        'local/no-unscaled-sizes': 'error',
      },
    },
    {
      files: TEST_FILES,
      env: {
        jest: true,
        node: true,
      },
      rules: {
        ...testingLibrary.configs['flat/react'].rules,
        'no-underscore-dangle': 'off',
        'testing-library/no-debugging-utils': 'error',
        'testing-library/prefer-explicit-assert': 'error',
        'testing-library/prefer-user-event': 'error',
        'testing-library/prefer-user-event-setup': 'error',
        'typescript/no-unsafe-type-assertion': 'off',
      },
    },
    {
      files: TOOLING_FILES,
      env: {
        node: true,
      },
      rules: {
        'expo/no-dynamic-env-var': 'off',
        'expo/no-env-var-destructuring': 'off',
        'expo/use-dom-exports': 'off',
      },
    },
  ],
});
