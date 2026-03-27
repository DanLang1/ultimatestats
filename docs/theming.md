# Light Theme Implementation

## Overview

Toggle between Light and Dark themes via Settings > Display.

## Theme System

### Files

- `theme/theme.ts` - Color palettes (`darkPalette`, `lightPalette`)
- `context/ThemeContext.tsx` - `ThemeProvider`, `useTheme()` hook, AsyncStorage persistence

### Key Colors

| Key           | Dark Mode       | Light Mode      |
| ------------- | --------------- | --------------- |
| `primary`     | Navy `#0F172A`  | White `#FFFFFF` |
| `modalBg`     | Navy `#0F172A`  | White `#FFFFFF` |
| `modalText`   | White `#FFFFFF` | Navy `#0F172A`  |
| `textPrimary` | White           | Light           |
| `textMuted`   | Slate 400       | Slate 500       |

### Overlay Colors

Used for buttons with semantic meaning:

- `successOverlay15` - Green-tinted (25% opacity) for positive actions
- `dangerOverlay15` - Red-tinted (25% opacity) for negative actions
- `accentOverlay15` - Blue-tinted for accent elements

## Components

### ThemedView / AnimatedThemedView

Provides theme-aware background color (`modalBg`).

```tsx
import { ThemedView, AnimatedThemedView } from '@/components/ThemedView';

// Static view
<ThemedView style={styles.container}>...</ThemedView>

// Animated modal
<AnimatedThemedView
  entering={SlideInDown.duration(400)}
  style={styles.sheet}>
  ...
</AnimatedThemedView>
```

### Usage Pattern

```tsx
const { palette, themeMode, setThemeMode } = useTheme();

// Dynamic styling - always use ThemedText, never raw Text
<ThemedText style={{ color: palette.modalText }}>Hello</ThemedText>;

// Toggle theme
setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
```

### Fonts

The app uses the Inter font family, loaded via the `expo-font` config plugin. All text must use `<ThemedText>` (not `<Text>` from react-native) to ensure Inter is applied.

For font weight variations, use `fontFamily` from `Fonts` in `theme/theme.ts` — never use `fontWeight` in styles:

| Weight            | Use                                                                        |
| ----------------- | -------------------------------------------------------------------------- |
| Regular (default) | No `fontFamily` needed — `ThemedText` default type applies `Fonts.regular` |
| Semi-bold         | `fontFamily: Fonts.semiBold`                                               |
| Bold              | `fontFamily: Fonts.bold`                                                   |
| Extra-bold        | `fontFamily: Fonts.extraBold`                                              |
| Black             | `fontFamily: Fonts.black`                                                  |

```tsx
import { Fonts } from '@/theme/theme';

// Correct
<ThemedText style={{ fontFamily: Fonts.bold, fontSize: 18 }}>Bold text</ThemedText>

// Wrong — fontWeight causes synthetic bolding on top of Inter-Regular
<ThemedText style={{ fontWeight: '700', fontSize: 18 }}>Bold text</ThemedText>
```

## Badge Styling

- **GOAL badge** (StatEntryHeader): Blue accent colors
- **EVENT badge** (TurnoverEntryInner): Green success colors

## SettingsBar

Always uses dark background (`palette.surface`) for high contrast in both themes.
