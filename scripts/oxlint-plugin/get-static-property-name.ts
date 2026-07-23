import type { ESTree } from '@oxlint/plugins';

export function getStaticPropertyName(key: ESTree.ObjectProperty['key']) {
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'Literal') return String(key.value);
  return null;
}
