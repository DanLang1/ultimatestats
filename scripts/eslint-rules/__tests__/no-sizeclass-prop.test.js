const { RuleTester } = require('eslint');
const rule = require('../no-sizeclass-prop');

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2020, parserOptions: { ecmaFeatures: { jsx: true } } },
});

tester.run('no-sizeclass-prop', rule, {
  valid: [
    // sizeClass used as a local variable, not a JSX prop
    { code: `const { sizeClass } = useLayout();` },
    // sizeClass passed to a plain function (not JSX)
    { code: `createStyles(sizeClass);` },
    // Unrelated JSX props are fine
    { code: `<MyComponent label="hello" value={42} />` },
    // Other similarly-named props don't trigger
    { code: `<MyComponent sizeClasses={['sm']} />` },
    { code: `<MyComponent deviceSizeClass={x} />` },
  ],

  invalid: [
    // Basic prop drilling
    {
      code: `<StatPill sizeClass={sizeClass} />`,
      errors: [{ messageId: 'noSizeClassProp' }],
    },
    // Optional prop
    {
      code: `<HalfIndicator sizeClass={sizeClass} label="1st" />`,
      errors: [{ messageId: 'noSizeClassProp' }],
    },
    // String literal value
    {
      code: `<TeamText sizeClass="small" />`,
      errors: [{ messageId: 'noSizeClassProp' }],
    },
    // Multi-prop element — only the sizeClass attr is flagged
    {
      code: `<PlayingTimePill label="Goals" value="1.2" sizeClass={sizeClass} />`,
      errors: [{ messageId: 'noSizeClassProp' }],
    },
  ],
});
