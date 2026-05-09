module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'disallow passing sizeClass as a JSX prop — components should call useLayout() themselves',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noSizeClassProp:
        "Don't pass 'sizeClass' as a prop. The receiving component should call useLayout() directly to get sizeClass.",
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : node.name.name?.name; // JSXNamespacedName fallback

        if (name === 'sizeClass') {
          context.report({ node, messageId: 'noSizeClassProp' });
        }
      },
    };
  },
};
