import { defineRule } from '@oxlint/plugins';

import { getStaticPropertyName } from './get-static-property-name.ts';

const COLOR_PROPS = new Set([
  'color',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderRightColor',
  'borderStartColor',
  'borderEndColor',
  'shadowColor',
  'tintColor',
  'overlayColor',
  'outlineColor',
  'textDecorationColor',
  'textShadowColor',
]);

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
const COLOR_FN_RE = /^(rgb|rgba|hsl|hsla)\s*\(/i;
const NAMED_COLORS = new Set([
  'black',
  'white',
  'red',
  'green',
  'blue',
  'yellow',
  'orange',
  'purple',
  'pink',
  'cyan',
  'magenta',
  'gray',
  'grey',
  'brown',
  'transparent',
  'lime',
  'indigo',
  'violet',
  'gold',
  'silver',
  'navy',
  'teal',
  'coral',
  'salmon',
  'turquoise',
  'khaki',
  'crimson',
  'maroon',
  'olive',
  'aqua',
  'fuchsia',
]);

function isRawColor(value: string) {
  const normalizedValue = value.trim();
  if (normalizedValue.toLowerCase() === 'transparent') return false;

  return (
    HEX_RE.test(normalizedValue) ||
    COLOR_FN_RE.test(normalizedValue) ||
    NAMED_COLORS.has(normalizedValue.toLowerCase())
  );
}

export default defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow raw color values in styles; use palette tokens from theme/theme.ts instead',
      recommended: true,
    },
    schema: [],
    messages: {
      noRawColor:
        'Raw color "{{value}}" is not allowed. Use a palette token from theme/theme.ts ' +
        '(e.g. palette.accent, palette.surface) via useTheme().',
    },
  },
  create(context) {
    return {
      Property(node) {
        if (node.computed) return;

        const keyName = getStaticPropertyName(node.key);

        if (!keyName || !COLOR_PROPS.has(keyName)) return;
        if (node.value.type !== 'Literal' || typeof node.value.value !== 'string') return;
        if (!isRawColor(node.value.value)) return;

        context.report({
          node: node.value,
          messageId: 'noRawColor',
          data: { value: node.value.value },
        });
      },
    };
  },
});
