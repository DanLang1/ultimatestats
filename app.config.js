const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  name: IS_DEV ? 'UStat (Dev)' : 'UStat',
  slug: 'ultimatestats',
  version: '1.2.0',
  orientation: 'landscape',
  icon: './assets/images/icon.png',
  scheme: IS_DEV ? 'ultimatestats-dev' : 'ultimatestats',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV ? 'com.langdk.ultimatestats.dev' : 'com.langdk.ultimatestats',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/icon.png',
      backgroundImage: './assets/images/icon.png',
      monochromeImage: './assets/images/icon.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: IS_DEV ? 'com.langdk.ultimatestats.dev' : 'com.langdk.ultimatestats',
  },
  web: {
    output: 'static',
    favicon: './assets/images/icon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
    [
      'expo-dev-client',
      {
        addGeneratedScheme: IS_DEV,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '517bb299-1b17-42ee-8700-02d701cd4b98',
    },
  },
  owner: 'langdk',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/517bb299-1b17-42ee-8700-02d701cd4b98',
  },
};
