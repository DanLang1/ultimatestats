# Responsive Layout Pattern

Every screen in this app must work in both **portrait** and **landscape** orientation.

## Required Hook

Use `useLayout()` from `@/hooks/useLayout` to get layout info. Never call `useWindowDimensions` directly in components.

```tsx
import { useLayout } from '@/hooks/useLayout';

const { isLandscape, isNarrow, width, height } = useLayout();
```

Add new breakpoint flags to this hook as needed (e.g. `isTablet`). This keeps layout logic centralized.

## Style Factory Pattern

Use a `createStyles` function that takes layout params and returns a complete `StyleSheet`. This eliminates conditional style arrays in JSX.

```tsx
export default function MyScreen() {
  const { isLandscape } = useLayout();
  const styles = createStyles(isLandscape);

  return (
    <View style={styles.container}>
      <View style={styles.content}>...</View>
    </View>
  );
}

// Styles go below the component (matches existing convention)
function createStyles(isLandscape: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flexDirection: isLandscape ? 'row' : 'column',
      padding: isLandscape ? 24 : 16,
    },
  });
}
```

### Gotchas

- **Never set `transform: undefined`** — React Native internally calls `.forEach` on the transform array and crashes on `undefined`/`null`. Use conditional spread instead:
  ```tsx
  // BAD - crashes on rotation
  transform: isLandscape ? undefined : [{ translateY: -25 }],

  // GOOD - property is absent when not needed
  ...(isLandscape ? {} : { transform: [{ translateY: -25 }] }),
  ```

### Rules

- **Do NOT** use conditional style arrays for orientation: `style={[styles.foo, !isLandscape && styles.fooPortrait]}`. Instead, bake the orientation logic into `createStyles`.
- **Do NOT** create separate `*Portrait` / `*Landscape` style variants. Each style key should resolve to the correct values for the current orientation.
- Conditional style arrays are still fine for **non-orientation** concerns (e.g. `!hasStats && styles.compact`, pressed states).
- Place `createStyles` **below** the component, matching the existing styles-at-bottom convention.
- Styles that don't vary by orientation still go inside `createStyles` — keep one stylesheet per file.

## Extending for Tablet / New Breakpoints

When tablet support is needed, extend `useLayout` and `createStyles`:

```tsx
// hooks/useLayout.ts
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return {
    width, height,
    isLandscape: width > height,
    isNarrow: width < 380,
    isTablet: Math.min(width, height) >= 600,
  };
}

// In a component
function createStyles(layout: { isLandscape: boolean; isTablet: boolean }) {
  return StyleSheet.create({
    content: {
      padding: layout.isTablet ? 32 : 16,
      flexDirection: layout.isLandscape ? 'row' : 'column',
    },
  });
}
```

## Reference Implementation

See `app/HalftimeModal.tsx` for the canonical example of this pattern.

## Migration

Existing screens still use the old pattern (`useWindowDimensions` + conditional style arrays). Migrate them to this pattern when touching those files. The old files to migrate:

- `app/LinePromptModal.tsx`
- `app/EditRoster.tsx`
- `app/Settings.tsx`
- `app/ViewStats.tsx`
- `app/PullPromptModal.tsx`
- `app/GameInfo.tsx`
- `app/PlayerStats.tsx`
- `app/NumberPickerModal.tsx`
- `app/PointTransition.tsx`
- `components/stat-entry/StatEntryInner.tsx`
- `components/turnover-entry/TurnoverEntryInner.tsx`
- `components/view-stats/StatsTable.tsx`
- `components/view-stats/TeamStatsSection.tsx`
- `components/view-stats/StatsContent.tsx`
- `components/view-stats/SavedGamesList.tsx`
- `components/lines/ModalPlayerGrid.tsx`
- `components/tutorial/StatsTrackingTutorial.tsx`
- `components/tutorial/TutorialOverlay.tsx`
