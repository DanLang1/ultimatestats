import { defineRule } from '@oxlint/plugins';

import { getStaticPropertyName } from './get-static-property-name.ts';

const ICON_NAMES = new Set(['Ionicons', 'Entypo', 'Feather', 'AntDesign']);

function isIconName(name: string) {
  return (
    name.endsWith('Icon') ||
    name.endsWith('Icons') ||
    name.startsWith('FontAwesome') ||
    ICON_NAMES.has(name)
  );
}

export default defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow hardcoded fontSize and lineHeight in favor of useLayout scaling',
      recommended: true,
    },
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
        if (node.computed) return;

        const propertyName = getStaticPropertyName(node.key);
        if (propertyName !== 'fontSize' && propertyName !== 'lineHeight') return;
        if (node.value.type !== 'Literal' || typeof node.value.value !== 'number') return;

        context.report({ node, messageId: 'unscaledFont' });
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'size') return;
        if (node.value?.type !== 'JSXExpressionContainer') return;
        if (
          node.value.expression.type !== 'Literal' ||
          typeof node.value.expression.value !== 'number'
        ) {
          return;
        }

        const parentName =
          node.parent.type === 'JSXOpeningElement' && node.parent.name.type === 'JSXIdentifier'
            ? node.parent.name.name
            : null;

        if (!parentName || !isIconName(parentName)) return;

        context.report({ node, messageId: 'unscaledIconSize' });
      },
    };
  },
});
