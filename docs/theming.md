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

// Dynamic styling
<Text style={{ color: palette.modalText }}>Hello</Text>;

// Toggle theme
setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
```

## Badge Styling

- **GOAL badge** (StatEntryHeader): Blue accent colors
- **EVENT badge** (TurnoverEntryInner): Green success colors

## SettingsBar

Always uses dark background (`palette.surface`) for high contrast in both themes.
