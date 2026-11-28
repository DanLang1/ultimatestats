const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// maestro-runner writes reports and screenshots under .maestro/ during a run. If Metro watched them,
// each write would push a hot update whose "Refreshing..." banner covers the top of the screen and
// takes the taps meant for the buttons under it.
config.resolver.blockList = [
  ...[config.resolver.blockList ?? []].flat(),
  /(^|[\\/])\.maestro[\\/]/,
];

module.exports = config;
