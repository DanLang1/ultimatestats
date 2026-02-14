# Per-Screen Orientation Support

> The app supports both portrait and landscape orientations.

## How It Works

- `expo-screen-orientation` overrides the manifest at runtime — no native rebuild needed
- OTA deployable via EAS Update

### Orientation Lock Status

Orientation behavior is controlled centrally rather than per-screen lock/unlock calls.

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

1. Rely on root safe area (`app/_layout.tsx` edges include `top`/`bottom`) for vertical inset handling
2. Avoid per-screen/per-modal orientation lock calls unless explicitly needed
3. Use `useSafeAreaInsets()` only when you specifically need horizontal safe-area handling (`left`/`right`)
4. Test that content is scrollable and doesn't overflow in portrait
