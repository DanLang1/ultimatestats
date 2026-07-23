import rule from '../no-unscaled-sizes.ts';
import { createRuleTester } from './rule-tester.ts';

createRuleTester().run('no-unscaled-sizes', rule, {
  valid: [
    `const styles = { fontSize: scaleBySizeClass(16) };`,
    `const styles = { lineHeight: typography.body.lineHeight };`,
    `<Image size={24} />;`,
    `<Ionicons size={scaleBySizeClass(24)} />;`,
    `const styles = { [fontSize]: 16 };`,
  ],
  invalid: [
    {
      code: `const styles = { fontSize: 16 };`,
      errors: [{ messageId: 'unscaledFont' }],
    },
    {
      code: `const styles = { lineHeight: 24 };`,
      errors: [{ messageId: 'unscaledFont' }],
    },
    {
      code: `const styles = { 'fontSize': 16 };`,
      errors: [{ messageId: 'unscaledFont' }],
    },
    {
      code: `<Ionicons size={24} />;`,
      errors: [{ messageId: 'unscaledIconSize' }],
    },
    {
      code: `<PrimaryIcon size={20} />;`,
      errors: [{ messageId: 'unscaledIconSize' }],
    },
  ],
});
