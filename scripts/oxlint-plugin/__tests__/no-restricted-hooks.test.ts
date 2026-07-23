import rule from '../no-restricted-hooks.ts';
import { createRuleTester } from './rule-tester.ts';

createRuleTester().run('no-restricted-hooks', rule, {
  valid: [
    `useState(0);`,
    `useEffect(() => {});`,
    `useRef(null);`,
    `useContext(MyContext);`,
    `useCallbackSomething();`,
    `useMemoized();`,
  ],
  invalid: [
    {
      code: `useCallback(() => {}, []);`,
      errors: [{ messageId: 'banned', data: { name: 'useCallback' } }],
    },
    {
      code: `useMemo(() => x * 2, [x]);`,
      errors: [{ messageId: 'banned', data: { name: 'useMemo' } }],
    },
    {
      code: `React.useCallback(() => {}, []);`,
      errors: [{ messageId: 'banned', data: { name: 'useCallback' } }],
    },
    {
      code: `React.useMemo(() => x * 2, [x]);`,
      errors: [{ messageId: 'banned', data: { name: 'useMemo' } }],
    },
    {
      code: `useFocusEffect(useCallback(() => { doSomething(); }, [dependency]));`,
      errors: [{ messageId: 'banned', data: { name: 'useCallback' } }],
    },
  ],
});
