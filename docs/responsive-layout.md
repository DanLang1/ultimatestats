# Responsive Layout & Orientation

> Every screen in this app must work in both **portrait** and **landscape** orientation.

## Orientation Config

Orientation behavior is controlled centrally:

- `app.config.js` is set to `orientation: 'default'`.
- App-level locking (Settings -> App -> Orientation) is applied from `app/_layout.tsx` via `useOrientationLock()`.
- No per-screen lock/unlock calls.
- In settings may not apply to large screens because of Android 16 update

## Required Hook

Use `useLayout()` from `@/hooks/useLayout` to get layout info. Never call `useWindowDimensions` directly in components.

```tsx
import { useLayout, SizeClass, LayoutInfo } from '@/hooks/useLayout';

const layout = useLayout();
// layout.isLandscape, layout.sizeClass, layout.width, layout.height
```

### `sizeClass` (rotation-stable size classes)

Based on `smallestDimension` (the shorter screen edge), so the class stays constant across rotation. This differs from Material Design window size classes, which use current width and can change on rotation. We intentionally use `smallestDimension` so that text/spacing scaling doesn't jump when the device rotates.

Breakpoint constants are defined in `lib/constants.ts` (`SIZE_CLASS_MEDIUM_THRESHOLD`, `SIZE_CLASS_LARGE_THRESHOLD`).

| Value    | Threshold | Devices                                 |
| -------- | --------- | --------------------------------------- |
| `small`  | < 600dp   | Phones                                  |
| `medium` | >= 600dp  | Foldables (inner screen), small tablets |
| `large`  | >= 790dp  | Tablets, desktop                        |

**Note:** Because this uses `smallestDimension`, a 1280x800 tablet becomes `large` (smallest=800 >= 790). This is intentional for this project's current breakpoint tuning.

Use `sizeClass` to scale text, spacing, and component sizing for larger screens. Import the `SizeClass` type when accepting it as a prop, and `LayoutInfo` when passing the full layout object to `createStyles`.

Components that accept `sizeClass` should make it optional with a `'small'` default. This keeps them usable outside size-class-aware screens without forcing every caller to thread layout through, but be mindful that a missing prop silently degrades to phone sizing.

For Android-specific large-screen behavior, use `Platform.OS === 'android' && sizeClass !== 'small'` inline at the call site — `isAndroidLargeScreen` has been removed from the hook.

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

- `LineEditor.tsx` — renders gender ratio info inline in the header row (landscape) vs a separate row below the header (portrait)

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

## Tablet / Size Class Support

`useLayout()` returns a `sizeClass` field that components can use to scale sizing for larger screens. The scoreboard (`index.tsx`, `TeamScoreSection`, `ScoreDisplay`, `TeamText`) is the first set of components adapted for tablet sizing.

### Pattern: shared size-class helpers (preferred)

Avoid repeated inline ternaries for size class values. Prefer helpers from `hooks/useLayout.ts`:

- `scaleBySizeClass(base, sizeClass, options?)` for values that scale linearly.
- `getSizeClassValue({ small, medium, large }, sizeClass)` for explicit, non-linear mappings (especially touch target sizing).

`SIZE_CLASS_SCALE` is centralized as:

- `small: 1`
- `medium: 1.1`
- `large: 1.2`

Example:

```tsx
import { getSizeClassValue, scaleBySizeClass, SizeClass } from '@/hooks/useLayout';

function createMetrics(sizeClass: SizeClass) {
  return {
    iconSize: scaleBySizeClass(30, sizeClass),
    hitSlop: getSizeClassValue({ small: 16, medium: 18, large: 20 }, sizeClass),
  };
}
```

Use explicit mappings when precision matters (for example: hit slop, minimum touch targets, and hard size caps). Use scaling when a value should follow the global size-class ratio.

### Pattern: passing `sizeClass` to child components

```tsx
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';

interface MyComponentProps {
  sizeClass?: SizeClass;
}

export default function MyComponent({ sizeClass = 'small' }: MyComponentProps) {
  const styles = createStyles(sizeClass);
  // ...
}

function createStyles(sizeClass: SizeClass) {
  const fontSize = scaleBySizeClass(16, sizeClass);
  return StyleSheet.create({
    text: { fontSize },
  });
}
```

### Pattern: passing full layout to `createStyles`

When a component needs both orientation and size class info:

```tsx
import { LayoutInfo, getSizeClassValue, useLayout } from '@/hooks/useLayout';

export default function MyScreen() {
  const layout = useLayout();
  const styles = createStyles(layout);
  // ...
}

function createStyles(layout: LayoutInfo) {
  return StyleSheet.create({
    content: {
      padding: getSizeClassValue({ small: 16, medium: 24, large: 32 }, layout.sizeClass),
      flexDirection: layout.isLandscape ? 'row' : 'column',
    },
  });
}
```
