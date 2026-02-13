# Per-Screen Orientation Support

> The app supports both portrait and landscape orientations. Screens opt in to portrait via `useOrientationLock()`.

## How It Works

- `expo-screen-orientation` overrides the manifest at runtime — no native rebuild needed
- Screens without `useOrientationLock()` remain landscape-only
- OTA deployable via EAS Update

### Hook: `hooks/useOrientationLock.ts`

Reusable hook using `useFocusEffect`:

- **On focus:** `lockAsync(OrientationLock.DEFAULT)` — allows all orientations
- **On blur:** `lockAsync(OrientationLock.LANDSCAPE)` — re-locks to landscape

Usage: call `useOrientationLock()` at the top of any screen component.

### Screens Enabled

| Screen                   | Status  | Notes                                                      |
| ------------------------ | ------- | ---------------------------------------------------------- |
| Dashboard                | Done    | Layout uses `flexWrap`/`minWidth`, adapts naturally        |
| GameTimeline             | Done    | Full-screen scroll view, works in both orientations        |
| EditEventModal           | Done    | Bottom sheet with safe area insets                         |
| Scoreboard (`index.tsx`) | Pending | Needs `flexDirection` switch from `row` → `column`         |
| Settings                 | Done    | Two-column ↔ single-column layout, uses key-based remount |
| ViewStats                | Pending | Needs layout assessment                                    |

## Gotcha: Flex Layout Caching on Rotation

React Native does not always re-layout flex containers correctly when toggling `flexDirection` between `row` and `column` via conditional styles. Symptoms include columns retaining portrait-mode widths after rotating to landscape.

**Fix:** Add a `key` that changes with orientation to force a full remount of the container:

```tsx
<View
  key={isLandscape ? 'landscape' : 'portrait'}
  style={[
    styles.columnsContainer,
    !isLandscape && { flexDirection: 'column', alignItems: 'stretch' },
  ]}>
```

Apply this pattern to any container that switches `flexDirection` based on orientation. See `Settings.tsx` for a working example.

## Portrait Considerations for Modals

When a modal supports portrait, ensure:

1. Add `useOrientationLock()` at the top of the component
2. Use `useSafeAreaInsets()` and apply `insets.bottom` as padding on the sheet container
3. Test that content is scrollable and doesn't overflow in portrait
