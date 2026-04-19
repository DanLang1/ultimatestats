const BANNED = new Set(['useCallback', 'useMemo']);

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow useCallback and useMemo (React Compiler handles memoization)',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      banned:
        "'{{name}}' is banned — the React Compiler handles memoization automatically. Remove it and use plain derived state or functions.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        let name = null;
        if (callee.type === 'Identifier' && BANNED.has(callee.name)) {
          name = callee.name;
        } else if (
          callee.type === 'MemberExpression' &&
          callee.object.name === 'React' &&
          BANNED.has(callee.property.name)
        ) {
          name = callee.property.name;
        }
        if (name) {
          context.report({ node, messageId: 'banned', data: { name } });
        }
      },
    };
  },
};
