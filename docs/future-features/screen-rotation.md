# Per-Screen Orientation Support

> Allow specific screens to support portrait mode while the app defaults to landscape.

## Current State

- App is locked to landscape via `app.config.js` (`orientation: 'landscape'`)
- `expo-screen-orientation` (v9.0.8) is installed
- Android-only — `lockAsync()` overrides the manifest at runtime, so no native rebuild needed

## Implementation

### Hook: `hooks/useOrientationLock.ts`

Reusable hook using `useFocusEffect`:

- **On focus:** `lockAsync(OrientationLock.DEFAULT)` — allows all orientations
- **On blur:** `lockAsync(OrientationLock.LANDSCAPE)` — re-locks to landscape

Usage: call `useOrientationLock()` at the top of any screen component.

### Screens Enabled

| Screen                   | Status         | Notes                                                       |
| ------------------------ | -------------- | ----------------------------------------------------------- |
| Dashboard                | ✅ Done        | Layout already uses `flexWrap`/`minWidth`, adapts naturally |
| Scoreboard (`index.tsx`) | ❌ Not started | Needs `flexDirection` switch from `row` → `column`          |
| Settings                 | ❌ Not started | Needs layout assessment                                     |
| ViewStats                | ❌ Not started | Needs layout assessment                                     |
| Modals                   | ❌ Not started | May need width/height adjustments                           |

## Screen-Specific Notes

### Dashboard

Already responsive — `flexWrap: 'wrap'` with `minWidth: 280` on sections means cards reflow naturally in portrait.

### Scoreboard

Uses `flexDirection: 'row'` for the two `TeamScoreSection` components side-by-side. Portrait would need:

- Switch to `flexDirection: 'column'` (stack teams vertically)
- `ScoreboardActionBar` clamp logic needs to account for different screen dimensions
- `SettingsBar` uses absolute positioning, should adapt without changes

### Modals

Transparent modals may need width constraints adjusted. Currently many use percentage-based or `maxWidth` sizing which should work, but each needs testing.

## Key Decisions

- **No `app.config.js` change needed** — Android's `lockAsync` overrides manifest at runtime
- **OTA deployable** — can ship via EAS Update, no new native build required
- **Per-screen opt-in** — screens stay landscape by default; only screens with `useOrientationLock()` get portrait support

## Status

**Status:** Dashboard implemented, other screens pending  
**Priority:** Low — expand as screens are adapted for portrait
