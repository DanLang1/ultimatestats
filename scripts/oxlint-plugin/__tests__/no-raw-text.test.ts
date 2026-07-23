import rule from '../no-raw-text.ts';
import { createRuleTester } from './rule-tester.ts';

createRuleTester().run('no-raw-text', rule, {
  valid: [
    {
      filename: '/repo/components/Card.tsx',
      code: `import { View } from 'react-native'; <View />;`,
    },
    {
      filename: '/repo/components/Card.tsx',
      code: `import { Text } from './Text'; <Text />;`,
    },
    {
      filename: '/repo/components/ThemedText.tsx',
      code: `import { Text } from 'react-native'; <Text />;`,
    },
  ],
  invalid: [
    {
      filename: '/repo/components/Card.tsx',
      code: `import { Text } from 'react-native'; <Text>Hello</Text>;`,
      errors: [{ messageId: 'noRawText' }],
    },
    {
      filename: '/repo/components/Card.tsx',
      code: `import { Text as NativeText } from 'react-native'; <NativeText>Hello</NativeText>;`,
      errors: [{ messageId: 'noRawText' }],
    },
  ],
});
