const { RuleTester } = require('eslint');
const rule = require('../no-raw-colors');

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2020, parserOptions: { ecmaFeatures: { jsx: true } } },
});

tester.run('no-raw-colors', rule, {
  valid: [
    // Palette token via variable — not a string literal
    { code: `const s = { backgroundColor: palette.surface }` },
    { code: `const s = { color: palette.textPrimary }` },
    { code: `const s = { borderColor: palette.border }` },
    // transparent is explicitly allowed
    { code: `const s = { backgroundColor: 'transparent' }` },
    { code: `const s = { borderColor: 'transparent' }` },
    // Non-color properties with string values are fine
    { code: `const s = { fontFamily: 'Inter-Bold' }` },
    { code: `const s = { position: 'absolute' }` },
    // Numbers (not strings) on color props are fine (unusual but not our concern)
    { code: `const s = { shadowColor: someVar }` },
  ],

  invalid: [
    // Hex colors
    {
      code: `const s = { backgroundColor: '#fff' }`,
      errors: [{ messageId: 'noRawColor', data: { value: '#fff' } }],
    },
    {
      code: `const s = { backgroundColor: '#FFF' }`,
      errors: [{ messageId: 'noRawColor', data: { value: '#FFF' } }],
    },
    {
      code: `const s = { backgroundColor: '#1a2b3c' }`,
      errors: [{ messageId: 'noRawColor', data: { value: '#1a2b3c' } }],
    },
    {
      code: `const s = { backgroundColor: '#1a2b3cff' }`,
      errors: [{ messageId: 'noRawColor', data: { value: '#1a2b3cff' } }],
    },
    // rgba / rgb
    {
      code: `const s = { shadowColor: 'rgba(0,0,0,0.88)' }`,
      errors: [{ messageId: 'noRawColor', data: { value: 'rgba(0,0,0,0.88)' } }],
    },
    {
      code: `const s = { backgroundColor: 'rgb(255, 255, 255)' }`,
      errors: [{ messageId: 'noRawColor', data: { value: 'rgb(255, 255, 255)' } }],
    },
    // Named colors
    {
      code: `const s = { color: 'white' }`,
      errors: [{ messageId: 'noRawColor', data: { value: 'white' } }],
    },
    {
      code: `const s = { color: 'black' }`,
      errors: [{ messageId: 'noRawColor', data: { value: 'black' } }],
    },
    {
      code: `const s = { color: 'red' }`,
      errors: [{ messageId: 'noRawColor', data: { value: 'red' } }],
    },
    // All flagged color properties
    {
      code: `const s = { borderColor: '#000' }`,
      errors: [{ messageId: 'noRawColor' }],
    },
    {
      code: `const s = { borderTopColor: '#000' }`,
      errors: [{ messageId: 'noRawColor' }],
    },
    {
      code: `const s = { shadowColor: '#000' }`,
      errors: [{ messageId: 'noRawColor' }],
    },
    {
      code: `const s = { tintColor: '#000' }`,
      errors: [{ messageId: 'noRawColor' }],
    },
  ],
});
