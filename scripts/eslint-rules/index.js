const noUnscaledSizes = require('./no-unscaled-sizes');
const noRawText = require('./no-raw-text');
const noFontWeight = require('./no-font-weight');
const noRawColors = require('./no-raw-colors');
const noRestrictedHooks = require('./no-restricted-hooks');

module.exports = {
  rules: {
    'no-unscaled-sizes': noUnscaledSizes,
    'no-raw-text': noRawText,
    'no-font-weight': noFontWeight,
    'no-raw-colors': noRawColors,
    'no-restricted-hooks': noRestrictedHooks,
  },
};
