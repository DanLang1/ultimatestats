import { defineRule } from '@oxlint/plugins';

const BANNED_HOOKS = new Set(['useCallback', 'useMemo']);

export default defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow useCallback and useMemo (React Compiler handles memoization)',
      recommended: true,
    },
    schema: [],
    messages: {
      banned:
        "'{{name}}' is banned — the React Compiler handles memoization automatically. Remove it and use plain derived state or functions.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;

        if (callee.type === 'Identifier' && BANNED_HOOKS.has(callee.name)) {
          context.report({ node, messageId: 'banned', data: { name: callee.name } });
          return;
        }

        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'React' &&
          callee.property.type === 'Identifier' &&
          BANNED_HOOKS.has(callee.property.name)
        ) {
          context.report({
            node,
            messageId: 'banned',
            data: { name: callee.property.name },
          });
        }
      },
    };
  },
});
