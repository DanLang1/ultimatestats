const APP_VARIANT = process.env.APP_VARIANT;
const IS_DEV = APP_VARIANT === 'development';
const IS_PREVIEW = APP_VARIANT === 'preview';

function getAppName() {
  if (IS_DEV) {
    return 'U-Stat (Dev)';
  }

  if (IS_PREVIEW) {
    return 'U-Stat Preview';
  }

  return 'U-Stat';
}

function getAppScheme() {
  if (IS_DEV) {
    return 'ultimatestats-dev';
  }

  if (IS_PREVIEW) {
    return 'ultimatestats-preview';
  }

  return 'ultimatestats';
}

function getAppId() {
  if (IS_DEV) {
    return 'com.langdk.ultimatestats.dev';
  }

  if (IS_PREVIEW) {
    return 'com.langdk.ultimatestats.preview';
  }

  return 'com.langdk.ultimatestats';
}

const APP_NAME = getAppName();
const APP_SCHEME = getAppScheme();
const APP_ID = getAppId();

export default {
  name: APP_NAME,
  slug: 'ultimatestats',
  version: '2.0.0',
  orientation: 'default',
  icon: './assets/images/icon.png',
  scheme: APP_SCHEME,
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: APP_ID,
    associatedDomains: ['applinks:u-stat.app'],
    infoPlist: {
      NSMicrophoneUsageDescription:
        'Allow $(PRODUCT_NAME) to use the microphone for voice stat entry.',
      NSPhotoLibraryUsageDescription:
        'Allow $(PRODUCT_NAME) to access your photo library when you choose content to share.',
      NSSpeechRecognitionUsageDescription:
        'Allow $(PRODUCT_NAME) to use speech recognition for voice stat entry.',
    },
    config: {
      usesNonExemptEncryption: false,
    },
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
    package: APP_ID,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'u-stat.app',
            pathPrefix: '/s/game/',
          },
          {
            scheme: 'https',
            host: 'u-stat.app',
            pathPrefix: '/s/advanced-game/',
          },
          {
            scheme: 'https',
            host: 'u-stat.app',
            pathPrefix: '/s/advanced-games/',
          },
          {
            scheme: 'https',
            host: 'u-stat.app',
            pathPrefix: '/s/team/',
          },
          {
            scheme: 'https',
            host: 'u-stat.app',
            pathPrefix: '/s/games/',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
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
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/Inter-Regular.ttf',
          './assets/fonts/Inter-SemiBold.ttf',
          './assets/fonts/Inter-Bold.ttf',
          './assets/fonts/Inter-ExtraBold.ttf',
          './assets/fonts/Inter-Black.ttf',
        ],
      },
    ],
    'expo-image',
    'expo-sharing',
    'expo-web-browser',
    [
      'expo-speech-recognition',
      {
        microphonePermission: 'Allow $(PRODUCT_NAME) to use the microphone for voice stat entry.',
        speechRecognitionPermission:
          'Allow $(PRODUCT_NAME) to use speech recognition for voice stat entry.',
        androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
      },
    ],
    [
      'expo-build-properties',
      {
        buildReactNativeFromSource: true,
        useHermesV1: true,
      },
    ],
    './plugins/withAndroidGradleMemory',
    './plugins/withFmtFix',
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
