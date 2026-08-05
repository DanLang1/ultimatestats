# Production Build Checklist

## Pre-Build Checklist

1. **Bump the version in `app.config.js`:**

   ```js
   version: '<next-version>',
   ```

2. **Add changelog entry in `lib/changelog.ts`:**

   ```typescript
   {
     version: '<next-version>',
     date: 'Month DD, YYYY',
     changes: [
       'Feature 1 description',
       'Bug fix description',
     ],
   },
   ```

3. **Run the full checks:**

   ```bash
   npm run check:all
   ```

4. **Commit changes:**

   ```bash
   git add .
   git commit -m "Release v<next-version>"
   ```

## Build

6. **Run EAS build:**

```bash
eas build --platform android --profile production --local
```

If a local Android production build fails during `lintVitalAnalyzeRelease`, check for Gradle JVM
metaspace errors first. This repo builds React Native from source for production/Hermes V1, so
release builds are materially heavier than dev builds.

### Source maps

The Sentry Expo integration uploads source maps automatically during an EAS Build when
`SENTRY_AUTH_TOKEN` is available. Check the build logs for a successful Sentry upload before
submitting the binary; otherwise production stack traces may remain minified.

See Expo's [Sentry guide](https://docs.expo.dev/guides/using-sentry/) for the current EAS Build
behavior.

7. Wait for the build to complete (check https://expo.dev/accounts/langdk/projects/ultimatestats/builds)

## Post-Build

8. **Submit to Play Store:**

   ```bash
   eas submit --platform android --path <path>
   ```

   Or manually upload the APK/AAB from the EAS dashboard.

9. **Tag the release:**

   ```bash
   git tag v<next-version>
   git push origin v<next-version>
   ```

## When to Use This vs OTA Update

| Scenario                | Use                         |
| ----------------------- | --------------------------- |
| JS-only changes         | [EAS update](eas-update.md) |
| New native module added | This workflow               |
| Expo SDK upgrade        | This workflow               |
| Permission changes      | This workflow               |
| First-time release      | This workflow               |
