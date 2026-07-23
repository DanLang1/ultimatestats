import { describe, it } from 'node:test';

import { RuleTester } from 'oxlint/plugins-dev';

RuleTester.describe = describe;
RuleTester.it = it;

export function createRuleTester() {
  return new RuleTester({
    languageOptions: {
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });
}
