# Deploy OTA Update to Production

This workflow pushes a JavaScript/asset update to the production Android app. Use this for bug fixes and UI changes that don't require native code changes.

## Prerequisites

- All changes committed to git
- The Expo project's `production` environment defines `APP_VARIANT=production` with Plain text
  visibility
- The Expo project's `production` environment defines `SENTRY_AUTH_TOKEN` with Sensitive
  visibility

## Steps

1. Run the full checks:

```bash
npm run check:all
```

2. Push the update to production:

```bash
eas update --channel production --environment production --platform android --message "<describe your changes>"
```

Replace `<describe your changes>` with a brief description (like a git commit message).

3. Upload the generated source maps to Sentry:

```bash
eas env:exec --environment production 'npx sentry-expo-upload-sourcemaps dist'
```

Unlike a native EAS Build, `eas update` does not automatically upload source maps. Treat a failed
upload as a failed deployment so production stack traces remain symbolicated.

4. Verify the update and source-map upload succeeded using the EAS output and Sentry release.

## Notes

- **When users get the update**: Users get updates on app launch. Typically takes 2 app restarts (first downloads, second applies).
- **OTA vs Native Build**: OTA updates only work for JS/asset changes. If you add native dependencies or change `app.config.js` native settings, you need a full `eas build` instead.
- **Channels**: Use `--channel production` for prod, `--channel development` for dev builds.
- **Environment**: Always pair the channel with its matching `--environment` value so
  `APP_VARIANT` and Sentry metadata are resolved correctly.
- **Source maps**: See Expo's [Sentry guide](https://docs.expo.dev/guides/using-sentry/) for the
  current EAS Update upload workflow.
