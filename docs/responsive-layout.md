# Responsive Layout & Orientation

> Every screen in this app must work in both **portrait** and **landscape** orientation.

## Orientation Config

Orientation behavior is controlled centrally via `app.config.js` (set to `default`). No per-screen lock/unlock calls.

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

### Rules

- **Do NOT** use conditional style arrays for orientation: `style={[styles.foo, !isLandscape && styles.fooPortrait]}`. Instead, bake the orientation logic into `createStyles`.
- **Do NOT** create separate `*Portrait` / `*Landscape` style variants. Each style key should resolve to the correct values for the current orientation. **Exception:** When the rendering approach itself differs between orientations (e.g., flex-based layout vs fixed-width horizontally-scrollable layout), separate style sets and render paths are acceptable. See `StatsTable.tsx` for an example — landscape uses flex columns in a `View`, portrait uses fixed-width columns in a horizontal `ScrollView`. For complex screens where the right approach isn't obvious, discuss with the engineer before implementing.
- Conditional style arrays are still fine for **non-orientation** concerns (e.g. `!hasStats && styles.compact`, pressed states).
- Place `createStyles` **below** the component, matching the existing styles-at-bottom convention.
- Styles that don't vary by orientation still go inside `createStyles` — keep one stylesheet per file.

## Three Tiers of Orientation Support

### 1. No special handling needed

Simple single-column screens with scrollable content adapt naturally. No `useLayout()` or `createStyles()` required.

**Examples:** `Dashboard.tsx`, `About.tsx`, `Help.tsx`, `Import.tsx`, `ImportTeam.tsx`

These screens use vertical `ScrollView` or centered card layouts with `maxWidth` constraints that look fine in both orientations without intervention.

### 2. Standard `createStyles(isLandscape)` pattern

Screens with multi-column layouts, flex-direction switches, or orientation-dependent spacing use `useLayout()` and bake orientation into `createStyles()`. This is the standard approach for most screens.

**Examples:** `Settings.tsx`, `EditRoster.tsx`, `GameInfo.tsx`, `PlayerStats.tsx`, `ViewStats.tsx`, `index.tsx` (Scoreboard), `NumberPickerModal.tsx`, `TimeoutModal.tsx`, `PreGameConfirm.tsx`

### 3. Inline `isLandscape` for conditional rendering

Some screens need `isLandscape` beyond styling — to conditionally render different UI sections per orientation (e.g., showing info inline in landscape vs in a separate row in portrait). These use `useLayout()` directly in JSX for rendering decisions.

**Examples:**

- `PointTransition.tsx` — renders gender ratio info inline in the header row (landscape) vs a separate row below the header (portrait)
- `LinePromptModal.tsx` — adjusts overlay padding based on orientation and safe area insets

## Gotchas

### `transform: undefined` crash

React Native internally calls `.forEach` on the transform array and crashes on `undefined`/`null`. Use conditional spread instead:

```tsx
// BAD - crashes on rotation
transform: isLandscape ? undefined : [{ translateY: -25 }],

// GOOD - property is absent when not needed
...(isLandscape ? {} : { transform: [{ translateY: -25 }] }),
```

### Flex layout caching on rotation

React Native does not always re-layout flex containers correctly when toggling flex properties via conditional styles.

**How many flex properties differ between orientations?**

1. **Only `flexDirection`** — Use key-based remount (Approach 1)
2. **Multiple flex properties** (`flex`, `flexBasis`, `flexWrap`, etc.) — Minimize property differences (Approach 2). Do NOT use keys — they will not reliably fix complex flex changes.

#### Approach 1: Key-based remount (simple `flexDirection` switches)

For containers that only toggle `flexDirection` (e.g. `row` to `column`), a `key` that changes with orientation forces a full remount:

```tsx
<View
  key={isLandscape ? 'landscape' : 'portrait'}
  style={[
    styles.columnsContainer,
    !isLandscape && { flexDirection: 'column', alignItems: 'stretch' },
  ]}>
```

See `Settings.tsx` for a working example.

#### Approach 2: Minimize property differences (complex flex changes)

When toggling multiple flex properties (`flexWrap`, `flexBasis`, `flex`) the key-based approach **will not work** — React Native's layout engine doesn't reliably recalculate these even after a remount.

**The goal is to minimize the number of properties that differ between orientations.** Use a single shared base style and control wrapping behavior with one property (e.g. `minWidth`) rather than toggling `flex`, `flexBasis`, and `flexWrap` together.

```tsx
const styles = StyleSheet.create({
  // Single shared container — no orientation variants needed
  multiColumn: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    rowGap: 12,
  },
  // Only minWidth differs between orientations
  columnLandscape: {
    flex: 1,
    gap: 5,
  },
  columnPortrait: {
    flex: 1,
    minWidth: '45%',
    gap: 5,
  },
});

const columnStyle = isLandscape ? styles.columnLandscape : styles.columnPortrait;
```

No `key` or remount needed. See `ModalPlayerGrid.tsx` for a working example.

#### Common mistake

Do NOT reach for key-based remount when you see a rotation layout bug. Check which flex properties differ between orientations first. If more than one differs, simplify the styles instead — reduce the differences to a single property.

## Portrait Considerations for Modals

When a modal supports portrait, ensure:

1. Rely on root safe area (`app/_layout.tsx` edges include `top`/`bottom`) for vertical inset handling
2. Avoid per-screen/per-modal orientation lock calls unless explicitly needed
3. Use `useSafeAreaInsets()` only when you specifically need horizontal safe-area handling (`left`/`right`)
4. Test that content is scrollable and doesn't overflow in portrait

## Extending for Tablet / New Breakpoints

When tablet support is needed, extend `useLayout` and `createStyles`:

```tsx
// hooks/useLayout.ts
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
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
