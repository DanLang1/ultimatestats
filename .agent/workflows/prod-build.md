---
description: Build and release a production native app to app stores
---

# Production Build Checklist

## Pre-Build Checklist

1. **Bump version in `app.config.js`:**

   ```js
   version: '1.0.X', // increment from current version
   ```

2. **Add changelog entry in `lib/changelog.ts`:**

   ```typescript
   {
     version: '1.0.X',
     date: 'Month DD, YYYY',
     changes: [
       'Feature 1 description',
       'Bug fix description',
     ],
   },
   ```

3. **Commit changes:**
   ```bash
   git add .
   git commit -m "Release v1.0.X"
   ```

## Build

// turbo 4. **Run EAS build:**

```bash
eas build --platform android --profile production
```

5. Wait for build to complete (check https://expo.dev/accounts/langdk/projects/ultimatestats/builds)

## Post-Build

6. **Submit to Play Store:**

   ```bash
   eas submit --platform android
   ```

   Or manually upload the APK/AAB from the EAS dashboard.

7. **Tag the release:**
   ```bash
   git tag v1.0.X
   git push origin v1.0.X
   ```

## When to Use This vs OTA Update

| Scenario                | Use                 |
| ----------------------- | ------------------- |
| JS-only changes         | `/eas-update` (OTA) |
| New native module added | This workflow       |
| Expo SDK upgrade        | This workflow       |
| Permission changes      | This workflow       |
| First-time release      | This workflow       |
