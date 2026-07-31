# U-Stat

U-Stat is a mobile app for tracking Ultimate Frisbee stats. I used Ultianalytics in the past but it's a little outdated, and it wasn't cross-platform. This started as a project to learn React Native and mess around with agents for coding. Has been pretty interesting seeing their strengths and weaknesses.

Tech stack is React Native/Expo. Can check package.json for deps list.

### Prerequisites

- Node.js 25.8.1 (see [`.nvmrc`](.nvmrc))
- An iOS Simulator, Android emulator, or physical device for native development

### Local Setup

```bash
npm ci
cp .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

### Build and Run Locally

These commands compile a native development build, install it on a simulator/emulator or connected
device, and start the Expo development server:

```bash
# iOS (macOS only)
npm run ios

# Android
npm run android
```

Local native builds require more than Node.js:

- **iOS:** macOS with Xcode, Xcode Command Line Tools, and an iOS Simulator installed. Running on a
  physical iPhone also requires Apple code-signing setup and Developer Mode on the device.
- **Android:** Android Studio, a compatible JDK and Android SDK, `ANDROID_HOME`/`PATH` configured,
  and either a running Android emulator or a USB-connected device with USB debugging enabled.

Expo's official setup guides cover [local app compilation](https://docs.expo.dev/guides/local-app-development/),
[the iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/), and
[the Android Studio emulator](https://docs.expo.dev/workflow/android-studio-emulator/).

You normally only need to rebuild after the first install when native dependencies or native app
configuration change. For JavaScript or TypeScript-only changes, use `npm run dev` and open the
already-installed development app.

## Common Commands

| Command               | Description                                                               |
| --------------------- | ------------------------------------------------------------------------- |
| `npm run dev`         | Start the Expo development server with the development app variant.       |
| `npm run ios`         | Build and run the development app locally on iOS (macOS only).            |
| `npm run android`     | Build and run the development app locally on Android.                     |
| `npm run check`       | Run formatting checks, linting, and TypeScript checks.                    |
| `npm test`            | Run Jest unit/domain and React Native Testing Library screen tests.       |
| `npm run check:all`   | Run static checks and all Jest tests.                                     |
| `npm run maestro`     | Run the core advanced-tracker Maestro end-to-end suite.                   |
| `npm run maestro:all` | Run core and extended advanced-tracker Maestro tests on an installed app. |

## Documentation

The [project documentation](docs/README.md) covers the app structure, game
tracking model, responsive layout, theming, testing, and build workflows.

## License

U-Stat is available under the [MIT License](LICENSE).
