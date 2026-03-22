# iOS Follow-ups

## Snapshot

- Date: 2026-03-13
- Scope: quick scan of iOS-related config and runtime surfaces (Expo config, Info.plist, root layout)
- Status: all findings resolved

## Findings

1. ~~Universal links are not configured on iOS.~~ **Done** (2026-03-21) — `ios.associatedDomains` added to `app.config.js` and AASA file hosted on `u-stat.app`. Requires a new native build to take effect.

## References

- `app.config.js`
- `docs/future-features/sharing.md`
