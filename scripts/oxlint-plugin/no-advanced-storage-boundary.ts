import path from 'node:path';

import { defineRule } from '@oxlint/plugins';

function normalizePath(filename: string) {
  return filename.split(path.sep).join('/');
}

function isAdvancedStorageFile(filename: string) {
  return filename.endsWith('/lib/advancedTracking/storage.ts');
}

function isBasicSavedGameStorageFile(filename: string) {
  return filename.endsWith('/lib/basic/savedGameStorage.ts');
}

// The stand-in tests use for expo-sqlite; it imports the real types so it cannot drift from them.
function isExpoSqliteTestAdapterFile(filename: string) {
  return filename.endsWith('/test/mocks/expoSqlite.ts');
}

function isSavedAdvancedGamesStoreFile(filename: string) {
  return filename.endsWith('/store/advancedTracking/savedGamesStore.ts');
}

function isAdvancedLibOrStoreFile(filename: string) {
  return (
    filename.includes('/lib/advancedTracking/') || filename.includes('/store/advancedTracking/')
  );
}

function isTestFile(filename: string) {
  return (
    filename.includes('/__tests__/') ||
    filename.endsWith('.test.ts') ||
    filename.endsWith('.test.tsx')
  );
}

function isAdvancedStorageImport(source: string) {
  return (
    source === '@/lib/advancedTracking/storage' ||
    source.endsWith('/lib/advancedTracking/storage') ||
    source === './storage' ||
    source === '../storage'
  );
}

function isBasicSavedGameStorageImport(source: string) {
  return (
    source === '@/lib/basic/savedGameStorage' ||
    source.endsWith('/lib/basic/savedGameStorage') ||
    source === './savedGameStorage' ||
    source === '../savedGameStorage'
  );
}

function isBasicStoreFile(filename: string) {
  return filename.includes('/store/basic/');
}

export default defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'keep expo-sqlite inside the storage modules, advanced tracking storage behind its saved games store, and basic saved game storage behind the basic game store',
      recommended: true,
    },
    schema: [],
    messages: {
      sqliteOnlyInStorage:
        'expo-sqlite belongs in the storage modules: lib/advancedTracking/storage.ts and lib/basic/savedGameStorage.ts. Keep SQLite access behind them. Tests run SQL through test/mocks/expoSqlite.ts.',
      storageOnlyViaRepository:
        'Import advanced tracking storage only from store/advancedTracking/savedGamesStore.ts. App, hook, and domain code should use the saved advanced games store instead.',
      basicStorageOnlyViaStore:
        'Import basic saved game storage only from store/basic/. App, hook, and domain code should use the basic game store instead.',
      noReactQueryInDomain:
        'Do not import TanStack Query in advanced tracking lib/store files. Keep React Query as a hook/component wrapper around the saved advanced games store.',
    },
  },
  create(context) {
    const filename = normalizePath(context.filename);

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') return;

        const mayImportExpoSqlite =
          isAdvancedStorageFile(filename) ||
          isBasicSavedGameStorageFile(filename) ||
          isExpoSqliteTestAdapterFile(filename);
        if (source === 'expo-sqlite' && !mayImportExpoSqlite) {
          context.report({ node, messageId: 'sqliteOnlyInStorage' });
          return;
        }

        if (
          isAdvancedStorageImport(source) &&
          !isSavedAdvancedGamesStoreFile(filename) &&
          !isAdvancedStorageFile(filename) &&
          !isTestFile(filename)
        ) {
          context.report({ node, messageId: 'storageOnlyViaRepository' });
          return;
        }

        const mayImportBasicSavedGameStorage = isBasicStoreFile(filename) || isTestFile(filename);
        if (isBasicSavedGameStorageImport(source) && !mayImportBasicSavedGameStorage) {
          context.report({ node, messageId: 'basicStorageOnlyViaStore' });
          return;
        }

        if (
          source === '@tanstack/react-query' &&
          isAdvancedLibOrStoreFile(filename) &&
          !isTestFile(filename)
        ) {
          context.report({ node, messageId: 'noReactQueryInDomain' });
        }
      },
    };
  },
});
