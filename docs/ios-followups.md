# iOS Follow-ups

## Snapshot

- Date: 2026-03-13
- Scope: quick scan of iOS-related config and runtime surfaces (Expo config, Info.plist, root layout)
- Status: all findings resolved

## Findings

1. ~~Universal links are not configured on iOS.~~ **Done** (2026-03-21) — `ios.associatedDomains` added to `app.config.js` and AASA file hosted on `u-stat.app`. Requires a new native build to take effect.

## fmt / Xcode 26 Build Fix

**Symptom:** `fmt` fails to compile with `call to consteval function ... is not a constant expression` errors in `format-inl.h`.

**Cause:** fmt 11.0.2 uses `consteval` on a code path that Xcode 26's clang rejects. `FMT_USE_CONSTEVAL` needs to be forced to `0` in `Pods/fmt/include/fmt/base.h`.

**Workaround (active):** `plugins/withFmtFix.js` patches the Podfile `post_install` hook to gsub `FMT_USE_CONSTEVAL 1` → `0` in `base.h` each time `pod install` runs.

If the build still fails after adding the plugin, `pod install` likely hasn't re-run yet. Fix:

```bash
cd ios && pod install
rm -rf ~/Library/Developer/Xcode/DerivedData
npm run ios
```

**Removing the workaround** (once Expo/fmt ships a fix):

1. Remove `'./plugins/withFmtFix'` from `plugins` in `app.config.js`
2. Delete `plugins/withFmtFix.js`
3. `npx expo prebuild --platform ios` to regenerate Podfile
4. `cd ios && pod install`

**Reference:** https://github.com/expo/expo/issues/44229#issuecomment-4125779703

## References

- `app.config.js`
- `docs/future-features/sharing.md`
