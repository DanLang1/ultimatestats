module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow raw <Text> from react-native; use <ThemedText> instead',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noRawText:
        'Use <ThemedText> from @/components/ThemedText instead of <Text> from react-native.',
    },
  },
  create(context) {
    // Track Text identifiers imported from react-native
    const rnTextLocals = new Set();
    // Track the file path to allow ThemedText.tsx itself to use Text
    const filename = context.getFilename();

    return {
      ImportDeclaration(node) {
        if (node.source.value !== 'react-native') return;

        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportSpecifier' && specifier.imported.name === 'Text') {
            // Allow ThemedText.tsx to import Text from react-native
            if (filename.endsWith('ThemedText.tsx')) return;

            rnTextLocals.add(specifier.local.name);
          }
        }
      },
      JSXOpeningElement(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (name && rnTextLocals.has(name)) {
          context.report({ node, messageId: 'noRawText' });
        }
      },
    };
  },
};
