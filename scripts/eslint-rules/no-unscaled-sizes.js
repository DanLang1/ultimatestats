module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow hardcoded fontSize and lineHeight in favor of useLayout scaling',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      unscaledFont:
        'Use scaleBySizeClass from useLayout instead of hardcoded fontSize or lineHeight.',
      unscaledIconSize: 'Use scaleBySizeClass from useLayout instead of hardcoded icon size.',
    },
  },
  create(context) {
    return {
      Property(node) {
        if (
          node.key &&
          (node.key.name === 'fontSize' || node.key.name === 'lineHeight') &&
          node.value &&
          node.value.type === 'Literal' &&
          typeof node.value.value === 'number'
        ) {
          context.report({
            node,
            messageId: 'unscaledFont',
          });
        }
      },
      JSXAttribute(node) {
        if (
          node.name &&
          node.name.name === 'size' &&
          node.value &&
          node.value.type === 'JSXExpressionContainer' &&
          node.value.expression &&
          node.value.expression.type === 'Literal' &&
          typeof node.value.expression.value === 'number'
        ) {
          const parentName = node.parent?.name?.name;
          if (
            parentName &&
            (parentName.endsWith('Icon') ||
              parentName.endsWith('Icons') ||
              parentName.startsWith('FontAwesome') ||
              parentName === 'Ionicons' ||
              parentName === 'Entypo' ||
              parentName === 'Feather' ||
              parentName === 'AntDesign')
          ) {
            context.report({
              node,
              messageId: 'unscaledIconSize',
            });
          }
        }
      },
    };
  },
};
