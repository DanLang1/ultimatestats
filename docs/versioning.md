# Versioning

This document describes how app versioning and updates work.

## Version Types

There are two types of updates:

### 1. OTA Updates (eas update)

**When to use:** Most code changes that don't require native modules.

**Process:**

1. Make your code changes
2. Run: `eas update --branch production --message "Description of changes"`
3. Updates are automatically downloaded by users on next app launch

**What happens:**

- No version number change needed
- Users get the update automatically (background download)
- No App Store review required

### 2. Native Builds (App Store release)

**When to use:**

- Adding new native modules (e.g., `expo-camera`, `expo-print`)
- Updating Expo SDK version
- Changing app permissions
- Modifying native configuration

**Process:**

1. Increment `version` in `app.config.js` (e.g., `1.0.1` → `1.0.2`)
2. Update the `CHANGELOG` array in `app/About.tsx` with the new version's changes
3. Build: `eas build --platform android --profile production`
4. Submit to App Store / Play Store
5. Users must manually update from the store

## Version Notification System

The app tracks whether users have seen the current version:

1. **On app launch:** Compare `Constants.expoConfig.version` with `lastSeenVersion` in AsyncStorage
2. **If different:** Show "New!" badge on the About menu item in Dashboard
3. **When user visits About page:** Mark current version as seen, badge disappears

### Key Files

- `lib/versionUtils.ts` - Version checking utilities
- `hooks/useVersionCheck.ts` - React hook for version state
- `app/About.tsx` - About page with changelog (update `CHANGELOG` array for new versions)
- `app/Dashboard.tsx` - Shows "New!" badge when update is available

## Adding a New Version

When releasing a native build:

1. **Update version in `app.config.js`:**

   ```js
   version: '1.0.2', // was '1.0.1'
   ```

2. **Add changelog entry in `lib/changelog.ts`:**

   ```typescript
   export const CHANGELOG: ChangelogEntry[] = [
     {
       version: '1.0.2', // New entry at the top
       date: 'February 2026',
       changes: ['New feature description', 'Bug fix description'],
     },
     // ... existing entries
   ];
   ```

3. Build and submit to app stores.

## Notes

- OTA updates don't trigger the version notification (no version change)
- The "New!" badge only appears after a native build update
- Users on old native builds can't receive OTA updates for features requiring native code
- First-time installs will see "New!" until they view the About page
