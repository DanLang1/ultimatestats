import rule from '../no-sizeclass-prop.ts';
import { createRuleTester } from './rule-tester.ts';

createRuleTester().run('no-sizeclass-prop', rule, {
  valid: [
    `const { sizeClass } = useLayout();`,
    `createStyles(sizeClass);`,
    `<MyComponent label="hello" value={42} />;`,
    `<MyComponent sizeClasses={['sm']} />;`,
    `<MyComponent deviceSizeClass={sizeClass} />;`,
  ],
  invalid: [
    {
      code: `<StatPill sizeClass={sizeClass} />;`,
      errors: [{ messageId: 'noSizeClassProp' }],
    },
    {
      code: `<HalfIndicator sizeClass={sizeClass} label="1st" />;`,
      errors: [{ messageId: 'noSizeClassProp' }],
    },
    {
      code: `<TeamText sizeClass="small" />;`,
      errors: [{ messageId: 'noSizeClassProp' }],
    },
    {
      code: `<PlayingTimePill label="Goals" value="1.2" sizeClass={sizeClass} />;`,
      errors: [{ messageId: 'noSizeClassProp' }],
    },
  ],
});
