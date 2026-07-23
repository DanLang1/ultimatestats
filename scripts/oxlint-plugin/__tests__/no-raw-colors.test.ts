import rule from '../no-raw-colors.ts';
import { createRuleTester } from './rule-tester.ts';

createRuleTester().run('no-raw-colors', rule, {
  valid: [
    `const styles = { backgroundColor: palette.surface };`,
    `const styles = { color: palette.textPrimary };`,
    `const styles = { borderColor: palette.border };`,
    `const styles = { backgroundColor: 'transparent' };`,
    `const styles = { borderColor: 'transparent' };`,
    `const styles = { fontFamily: 'Inter-Bold' };`,
    `const styles = { position: 'absolute' };`,
    `const styles = { shadowColor: someVariable };`,
    `const styles = { [backgroundColor]: '#fff' };`,
  ],
  invalid: [
    {
      code: `const styles = { backgroundColor: '#fff' };`,
      errors: [{ messageId: 'noRawColor', data: { value: '#fff' } }],
    },
    {
      code: `const styles = { backgroundColor: '#FFF' };`,
      errors: [{ messageId: 'noRawColor', data: { value: '#FFF' } }],
    },
    {
      code: `const styles = { backgroundColor: '#1a2b3c' };`,
      errors: [{ messageId: 'noRawColor', data: { value: '#1a2b3c' } }],
    },
    {
      code: `const styles = { backgroundColor: '#1a2b3cff' };`,
      errors: [{ messageId: 'noRawColor', data: { value: '#1a2b3cff' } }],
    },
    {
      code: `const styles = { shadowColor: 'rgba(0,0,0,0.88)' };`,
      errors: [{ messageId: 'noRawColor', data: { value: 'rgba(0,0,0,0.88)' } }],
    },
    {
      code: `const styles = { backgroundColor: 'rgb(255, 255, 255)' };`,
      errors: [{ messageId: 'noRawColor', data: { value: 'rgb(255, 255, 255)' } }],
    },
    {
      code: `const styles = { color: 'white' };`,
      errors: [{ messageId: 'noRawColor', data: { value: 'white' } }],
    },
    {
      code: `const styles = { color: 'black' };`,
      errors: [{ messageId: 'noRawColor', data: { value: 'black' } }],
    },
    {
      code: `const styles = { color: 'red' };`,
      errors: [{ messageId: 'noRawColor', data: { value: 'red' } }],
    },
    {
      code: `const styles = { borderColor: '#000' };`,
      errors: [{ messageId: 'noRawColor' }],
    },
    {
      code: `const styles = { borderTopColor: '#000' };`,
      errors: [{ messageId: 'noRawColor' }],
    },
    {
      code: `const styles = { shadowColor: '#000' };`,
      errors: [{ messageId: 'noRawColor' }],
    },
    {
      code: `const styles = { tintColor: '#000' };`,
      errors: [{ messageId: 'noRawColor' }],
    },
  ],
});
