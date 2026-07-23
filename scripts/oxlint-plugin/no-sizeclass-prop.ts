import { defineRule } from '@oxlint/plugins';

export default defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'disallow passing sizeClass as a JSX prop — components should call useLayout() themselves',
      recommended: true,
    },
    schema: [],
    messages: {
      noSizeClassProp:
        "Don't pass 'sizeClass' as a prop. The receiving component should call useLayout() directly to get sizeClass.",
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'sizeClass') return;

        context.report({ node, messageId: 'noSizeClassProp' });
      },
    };
  },
});
