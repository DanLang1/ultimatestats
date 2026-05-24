const { RuleTester } = require('eslint');
const rule = require('../no-advanced-storage-boundary');

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('no-advanced-storage-boundary', rule, {
  valid: [
    {
      filename: '/repo/lib/advancedTracking/storage.ts',
      code: `import * as SQLite from 'expo-sqlite';`,
    },
    {
      filename: '/repo/store/advancedTracking/savedGamesStore.ts',
      code: `import { loadAdvancedGame } from '@/lib/advancedTracking/storage';`,
    },
  ],

  invalid: [
    {
      filename: '/repo/app/Import.tsx',
      code: `import * as SQLite from 'expo-sqlite';`,
      errors: [{ messageId: 'sqliteOnlyInStorage' }],
    },
    {
      filename: '/repo/store/advancedTracking/trackingStore.ts',
      code: `import { loadAdvancedGame } from '@/lib/advancedTracking/storage';`,
      errors: [{ messageId: 'storageOnlyViaRepository' }],
    },
    {
      filename: '/repo/store/advancedTracking/savedGamesStore.ts',
      code: `import { useQueryClient } from '@tanstack/react-query';`,
      errors: [{ messageId: 'noReactQueryInDomain' }],
    },
  ],
});
