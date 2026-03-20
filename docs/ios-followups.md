# iOS Follow-ups

## Snapshot

- Date: 2026-03-13
- Scope: quick scan of iOS-related config and runtime surfaces (Expo config, Info.plist, root layout)
- Status: findings documented only (no code changes yet)

## Findings

1. Universal links are not configured on iOS.
If the app should open `https://u-stat.app/s/...` links on iOS, add `ios.associatedDomains` in `app.config.js` and host an Apple App Site Association file at `https://u-stat.app/.well-known/apple-app-site-association`. There is already a future note in `docs/future-features/sharing.md` but no active config.

2. Status bar is hidden globally.
`app/_layout.tsx` renders `<StatusBar hidden />`, which removes time/battery entirely on iOS. If that is not intended, remove `hidden` or make it conditional.

3. Status bar appearance is globally controlled.
`UIViewControllerBasedStatusBarAppearance` is `false` in `ios/UStat/Info.plist`. If you want per-screen status bar styling, set it to `true` and manage it in screens or navigation options.

## References

- `app.config.js`
- `app/_layout.tsx`
- `ios/UStat/Info.plist`
- `docs/future-features/sharing.md`
