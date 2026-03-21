module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow fontWeight in styles; use fontFamily with Fonts.* from theme/theme.ts instead',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noFontWeight:
        'Use fontFamily (e.g. Fonts.bold, Fonts.semiBold) instead of fontWeight. ' +
        'The app uses Inter font files directly — weight must be set via the correct font file.',
    },
  },
  create(context) {
    return {
      // Catches fontWeight in style objects: { fontWeight: '700' }
      Property(node) {
        if (node.key && node.key.type === 'Identifier' && node.key.name === 'fontWeight') {
          context.report({ node, messageId: 'noFontWeight' });
        }
      },
    };
  },
};
