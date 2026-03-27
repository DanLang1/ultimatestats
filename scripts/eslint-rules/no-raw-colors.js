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

// #rgb, #rrggbb, #rgba, #rrggbbaa
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
// rgb(...), rgba(...), hsl(...), hsla(...)
const COLOR_FN_RE = /^(rgb|rgba|hsl|hsla)\s*\(/i;
// Common named CSS colors
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

function isRawColor(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (v.toLowerCase() === 'transparent') return false;
  return HEX_RE.test(v) || COLOR_FN_RE.test(v) || NAMED_COLORS.has(v.toLowerCase());
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow raw color values in styles; use palette tokens from theme/theme.ts instead',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
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
        const keyName =
          node.key.type === 'Identifier'
            ? node.key.name
            : node.key.type === 'Literal'
              ? String(node.key.value)
              : null;

        if (!keyName || !COLOR_PROPS.has(keyName)) return;

        if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
          if (isRawColor(node.value.value)) {
            context.report({
              node: node.value,
              messageId: 'noRawColor',
              data: { value: node.value.value },
            });
          }
        }
      },
    };
  },
};
