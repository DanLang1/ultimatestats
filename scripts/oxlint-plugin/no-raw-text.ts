import { defineRule } from '@oxlint/plugins';

export default defineRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow raw <Text> from react-native; use <ThemedText> instead',
      recommended: true,
    },
    schema: [],
    messages: {
      noRawText:
        'Use <ThemedText> from @/components/ThemedText instead of <Text> from react-native.',
    },
  },
  create(context) {
    const reactNativeTextLocals = new Set<string>();

    return {
      ImportDeclaration(node) {
        if (node.source.value !== 'react-native') return;
        if (context.filename.endsWith('ThemedText.tsx')) return;

        for (const specifier of node.specifiers) {
          if (
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.type === 'Identifier' &&
            specifier.imported.name === 'Text'
          ) {
            reactNativeTextLocals.add(specifier.local.name);
          }
        }
      },
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (!reactNativeTextLocals.has(node.name.name)) return;

        context.report({ node, messageId: 'noRawText' });
      },
    };
  },
});
