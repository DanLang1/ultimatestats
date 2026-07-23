import rule from '../no-react-namespace-hooks.ts';
import { createRuleTester } from './rule-tester.ts';

createRuleTester().run('no-react-namespace-hooks', rule, {
  valid: [
    `useState(0);`,
    `React.createElement(Component);`,
    `other.useState(0);`,
    `React.usecustom();`,
  ],
  invalid: [
    {
      code: `React.useState(0);`,
      errors: [{ messageId: 'namedImport' }],
    },
    {
      code: `React.useEffect(() => {});`,
      errors: [{ messageId: 'namedImport' }],
    },
  ],
});
