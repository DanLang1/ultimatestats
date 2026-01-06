---
description: Push OTA update to production Android app via EAS
---

# Deploy OTA Update to Production

This workflow pushes a JavaScript/asset update to the production Android app. Use this for bug fixes and UI changes that don't require native code changes.

## Prerequisites

- All changes committed to git
- TypeScript compiles without errors (`npx tsc --noEmit`)

## Steps

1. Run the TypeScript check to ensure no errors:

```bash
npx tsc --noEmit
```

2. Push the update to production:
   // turbo

```bash
eas update --channel production --platform android --message "<describe your changes>"
```

Replace `<describe your changes>` with a brief description (like a git commit message).

3. Verify the update was published by checking the EAS Dashboard link in the output.

## Notes

- **When users get the update**: Users get updates on app launch. Typically takes 2 app restarts (first downloads, second applies).
- **OTA vs Native Build**: OTA updates only work for JS/asset changes. If you add native dependencies or change `app.config.js` native settings, you need a full `eas build` instead.
- **Channels**: Use `--channel production` for prod, `--channel development` for dev builds.
