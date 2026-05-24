const path = require('path');

function normalizePath(filename) {
  return filename.split(path.sep).join('/');
}

function isAdvancedStorageFile(filename) {
  return filename.endsWith('/lib/advancedTracking/storage.ts');
}

function isSavedAdvancedGamesStoreFile(filename) {
  return filename.endsWith('/store/advancedTracking/savedGamesStore.ts');
}

function isAdvancedLibOrStoreFile(filename) {
  return (
    filename.includes('/lib/advancedTracking/') || filename.includes('/store/advancedTracking/')
  );
}

function isTestFile(filename) {
  return (
    filename.includes('/__tests__/') ||
    filename.endsWith('.test.ts') ||
    filename.endsWith('.test.tsx')
  );
}

function isAdvancedStorageImport(source) {
  return (
    source === '@/lib/advancedTracking/storage' ||
    source.endsWith('/lib/advancedTracking/storage') ||
    source === './storage' ||
    source === '../storage'
  );
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce advanced tracking storage boundaries between SQLite and Zustand',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      sqliteOnlyInStorage:
        'expo-sqlite belongs in lib/advancedTracking/storage.ts. Keep SQLite access behind the saved advanced games store boundary.',
      storageOnlyViaRepository:
        'Import advanced tracking storage only from store/advancedTracking/savedGamesStore.ts. App, hook, and domain code should use the saved advanced games store instead.',
      noReactQueryInDomain:
        'Do not import TanStack Query in advanced tracking lib/store files. Keep React Query as a hook/component wrapper around the saved advanced games store.',
    },
  },
  create(context) {
    const filename = normalizePath(context.getFilename());

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') return;

        if (source === 'expo-sqlite' && !isAdvancedStorageFile(filename)) {
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

        if (
          source === '@tanstack/react-query' &&
          isAdvancedLibOrStoreFile(filename) &&
          !isTestFile(filename)
        ) {
          context.report({ node, messageId: 'noReactQueryInDomain' });
          return;
        }
      },
    };
  },
};
