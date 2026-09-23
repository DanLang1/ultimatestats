# Deploy an OTA Update to Production

Use EAS Update for JavaScript, asset, and UI changes that do not require native code changes.
Committing first is recommended for traceability, but EAS Update bundles the current working tree.

## Commands

1. Verify the changes:

```bash
npm run check:all
```

2. Publish iOS, then upload its source maps:

```bash
eas update --channel production --environment production --platform ios --message "<describe your changes>"
eas env:exec production 'npx sentry-expo-upload-sourcemaps dist'
```

3. Publish Android, then upload its source maps:

```bash
eas update --channel production --environment production --platform android --message "<describe your changes>"
eas env:exec production 'npx sentry-expo-upload-sourcemaps dist'
```

4. Confirm the updates appear on the production branch:

```bash
eas update:list --branch production
```

## Notes

- Publish iOS and Android separately. This is a native-only project; do not use `--platform all`.
- Upload source maps immediately after each platform update because the next export replaces
  `dist`.
- `eas update` uses `--environment production`; `eas env:exec` uses the positional form
  `eas env:exec production '<command>'`.
- EAS Update does not automatically upload Sentry source maps. Treat a failed source-map upload as
  a failed deployment.
- Users generally receive an update across two launches: one to download and another to apply it.
- Native dependency or native `app.config.js` changes require a new `eas build`, not an OTA update.
