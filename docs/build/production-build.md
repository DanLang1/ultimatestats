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

6. **Run the EAS build:**

iOS:

```bash
eas build --platform ios --profile production --local
```

Android:

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

8. **Submit the build:**

iOS:

```bash
eas submit --platform ios \
  --profile production \
  --path <path-to-ipa>
```

A standalone `eas submit` does not inherit `build.production.env`, so `app.config.js` defaults an
unset `APP_VARIANT` to `production`. Development and preview commands must continue setting their
variant explicitly. The IPA itself is not changed during submission.

To prevent EAS from creating or selecting an App Store Connect record from a mistakenly resolved app
variant, configure the production app explicitly in `eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "6760956387"
      }
    }
  }
}
```

Android:

```bash
eas submit --platform android \
  --profile production \
  --path <path-to-aab>
```

Or manually upload the IPA/AAB from the EAS dashboard.

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
