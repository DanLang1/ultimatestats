import rule from '../no-advanced-storage-boundary.ts';
import { createRuleTester } from './rule-tester.ts';

createRuleTester().run('no-advanced-storage-boundary', rule, {
  valid: [
    {
      filename: '/repo/lib/advancedTracking/storage.ts',
      code: `import * as SQLite from 'expo-sqlite';`,
    },
    {
      filename: '/repo/lib/basic/savedGameStorage.ts',
      code: `import * as SQLite from 'expo-sqlite';`,
    },
    {
      filename: '/repo/test/mocks/expoSqlite.ts',
      code: `import type { SQLiteDatabase } from 'expo-sqlite';`,
    },
    {
      filename: '/repo/store/advancedTracking/savedGamesStore.ts',
      code: `import { loadAdvancedGame } from '@/lib/advancedTracking/storage';`,
    },
    {
      filename: '/repo/store/advancedTracking/__tests__/savedGamesStore.test.ts',
      code: `import { loadAdvancedGame } from '@/lib/advancedTracking/storage';`,
    },
    {
      filename: '/repo/store/advancedTracking/trackingStore.test.ts',
      code: `import { useQueryClient } from '@tanstack/react-query';`,
    },
    {
      filename: '/repo/store/basic/slices/savedGamesSlice.ts',
      code: `import { upsertBasicGames } from '@/lib/basic/savedGameStorage';`,
    },
    {
      filename: '/repo/lib/basic/__tests__/savedGameStorage.test.ts',
      code: `import { upsertBasicGames } from '../savedGameStorage';`,
    },
  ],
  invalid: [
    {
      filename: '/repo/lib/advancedTracking/__tests__/storage.test.ts',
      code: `import * as SQLite from 'expo-sqlite';`,
      errors: [{ messageId: 'sqliteOnlyInStorage' }],
    },
    {
      filename: '/repo/lib/basic/statsUtils.ts',
      code: `import * as SQLite from 'expo-sqlite';`,
      errors: [{ messageId: 'sqliteOnlyInStorage' }],
    },
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
      filename: '/repo/hooks/basic/useSavedBasicGames.ts',
      code: `import { loadAllBasicGames } from '@/lib/basic/savedGameStorage';`,
      errors: [{ messageId: 'basicStorageOnlyViaStore' }],
    },
    {
      filename: '/repo/lib/basic/statsUtils.ts',
      code: `import { loadAllBasicGames } from './savedGameStorage';`,
      errors: [{ messageId: 'basicStorageOnlyViaStore' }],
    },
    {
      filename: '/repo/store/advancedTracking/savedGamesStore.ts',
      code: `import { useQueryClient } from '@tanstack/react-query';`,
      errors: [{ messageId: 'noReactQueryInDomain' }],
    },
  ],
});
