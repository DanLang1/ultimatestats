const { RuleTester } = require('eslint');
const rule = require('../no-restricted-hooks');

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2020, parserOptions: { ecmaFeatures: { jsx: true } } },
});

tester.run('no-restricted-hooks', rule, {
  valid: [
    // useState and useEffect are not banned
    { code: `useState(0)` },
    { code: `useEffect(() => {})` },
    { code: `useRef(null)` },
    { code: `useContext(MyContext)` },
    // Unrelated functions with similar names are fine
    { code: `useCallbackSomething()` },
    { code: `useMemoized()` },
  ],

  invalid: [
    // Named import: useCallback
    {
      code: `useCallback(() => {}, [])`,
      errors: [{ messageId: 'banned', data: { name: 'useCallback' } }],
    },
    // Named import: useMemo
    {
      code: `useMemo(() => x * 2, [x])`,
      errors: [{ messageId: 'banned', data: { name: 'useMemo' } }],
    },
    // React.useCallback
    {
      code: `React.useCallback(() => {}, [])`,
      errors: [{ messageId: 'banned', data: { name: 'useCallback' } }],
    },
    // React.useMemo
    {
      code: `React.useMemo(() => x * 2, [x])`,
      errors: [{ messageId: 'banned', data: { name: 'useMemo' } }],
    },
    // Common real-world pattern: useFocusEffect(useCallback(...))
    {
      code: `useFocusEffect(useCallback(() => { doSomething(); }, [dep]))`,
      errors: [{ messageId: 'banned', data: { name: 'useCallback' } }],
    },
  ],
});
