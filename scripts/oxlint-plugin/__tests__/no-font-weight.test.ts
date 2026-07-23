import rule from '../no-font-weight.ts';
import { createRuleTester } from './rule-tester.ts';

createRuleTester().run('no-font-weight', rule, {
  valid: [
    `const styles = { fontFamily: Fonts.bold };`,
    `const fontWeight = getFontWeight();`,
    `const styles = { [fontWeight]: value };`,
  ],
  invalid: [
    {
      code: `const styles = { fontWeight: '700' };`,
      errors: [{ messageId: 'noFontWeight' }],
    },
    {
      code: `const styles = { 'fontWeight': '700' };`,
      errors: [{ messageId: 'noFontWeight' }],
    },
  ],
});
