# Preview Build

Use a preview build to test a release-mode app before publishing to an app store. Preview builds are
distributed internally, run without the Metro development server, and can be installed alongside the
development and production variants.

The `preview` profile uses `APP_VARIANT=preview`, which configures the "U-Stat Preview" app identity
and reports Sentry events under the `preview` environment.

## Pre-Build Checklist

1. Commit the changes intended for testing.

2. Run the full checks:

   ```bash
   npm run check:all
   ```

## Build

For a remotely hosted Android build:

```bash
eas build --platform android --profile preview
```

For iOS:

```bash
eas build --platform ios --profile preview
```

Add `--local` to either command to build locally. For a local build, ensure
`SENTRY_AUTH_TOKEN` is available in the build process's environment.

## Source Maps

The Sentry Expo integration automatically uploads source maps during an EAS Build when
`SENTRY_AUTH_TOKEN` is available. Check the build logs for a successful Sentry upload before relying
on preview crash stack traces.

See Expo's [Sentry guide](https://docs.expo.dev/guides/using-sentry/) for the current EAS Build
behavior.

## Install and Verify

1. Install the build from the link or QR code produced by EAS Build.
2. Confirm the installed app is named "U-Stat Preview".
3. Confirm it launches without Metro running.
4. If testing Sentry, confirm the event has the `preview` environment and a symbolicated stack trace.

Use a [production build](production-build.md) only when the binary is ready for app-store submission.
