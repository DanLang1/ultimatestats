import { defineRule } from '@oxlint/plugins';

export default defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require named React hook imports instead of React.useHook()',
      recommended: true,
    },
    schema: [],
    messages: {
      namedImport: 'Use named React hook imports (e.g. useState()) instead of React.useState().',
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (node.object.type !== 'Identifier' || node.object.name !== 'React') return;
        if (node.property.type !== 'Identifier') return;
        if (!/^use[A-Z]/.test(node.property.name)) return;

        context.report({ node, messageId: 'namedImport' });
      },
    };
  },
});
