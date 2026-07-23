import { definePlugin } from '@oxlint/plugins';

import noAdvancedStorageBoundary from './no-advanced-storage-boundary.ts';
import noFontWeight from './no-font-weight.ts';
import noRawColors from './no-raw-colors.ts';
import noRawText from './no-raw-text.ts';
import noReactNamespaceHooks from './no-react-namespace-hooks.ts';
import noRestrictedHooks from './no-restricted-hooks.ts';
import noSizeClassProp from './no-sizeclass-prop.ts';
import noUnscaledSizes from './no-unscaled-sizes.ts';

export default definePlugin({
  meta: {
    name: 'local',
  },
  rules: {
    'no-advanced-storage-boundary': noAdvancedStorageBoundary,
    'no-font-weight': noFontWeight,
    'no-raw-colors': noRawColors,
    'no-raw-text': noRawText,
    'no-react-namespace-hooks': noReactNamespaceHooks,
    'no-restricted-hooks': noRestrictedHooks,
    'no-sizeclass-prop': noSizeClassProp,
    'no-unscaled-sizes': noUnscaledSizes,
  },
});
