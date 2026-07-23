import { defineRule } from '@oxlint/plugins';

import { getStaticPropertyName } from './get-static-property-name.ts';

export default defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow fontWeight in styles; use fontFamily with Fonts.* from theme/theme.ts instead',
      recommended: true,
    },
    schema: [],
    messages: {
      noFontWeight:
        'Use fontFamily (e.g. Fonts.bold, Fonts.semiBold) instead of fontWeight. ' +
        'The app uses Inter font files directly — weight must be set via the correct font file.',
    },
  },
  create(context) {
    return {
      Property(node) {
        if (node.computed) return;

        const propertyName = getStaticPropertyName(node.key);
        if (propertyName !== 'fontWeight') return;

        context.report({ node, messageId: 'noFontWeight' });
      },
    };
  },
});
