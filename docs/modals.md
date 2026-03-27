# Expo Router Modals

This project uses **Expo Router transparent modals** for overlay-style UI elements (stat entry, turnover entry, pull prompt). These behave like traditional React Native `Modal` components but work correctly with Android edge-to-edge mode.

## Modal Theming (IMPORTANT)

**All modals must use these palette tokens for proper dark/light mode support:**

| Token                    | Usage                            |
| ------------------------ | -------------------------------- |
| `palette.overlayDark40`  | Backdrop overlay                 |
| `palette.modalBg`        | Modal content background         |
| `palette.modalText`      | Primary text color               |
| `palette.modalTextMuted` | Secondary/muted text color       |
| `palette.overlay15`      | Border color                     |
| `palette.overlay05`      | Input background                 |
| `palette.accent`         | Primary action button background |
| `palette.textOnAccent`   | Primary action button text       |

**DO NOT USE these tokens in modals - they invert between modes and cause visibility issues:**

- `palette.surface`
- `palette.textPrimary`
- `palette.textInverse`
- `palette.textMuted` (use `palette.modalTextMuted` instead)

## Creating a New Modal

### 1. Create the Route File

Create a new file in `app/(modals)/` with `Modal` suffix (e.g., `app/(modals)/MyFeatureModal.tsx`):

```tsx
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function MyFeatureModal() {
  const { palette } = useTheme();

  // Early return if conditions not met (user shouldn't be here)
  // Don't navigate here - just return null
  if (!someCondition) {
    return null;
  }

  const handleDismiss = () => {
    // Do any cleanup
    router.dismissTo('/'); // Always use dismissTo, not back()
  };

  const handleComplete = () => {
    // Save data, update state, etc.
    router.dismissTo('/');
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayDark40 }]}
        onPress={handleDismiss}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: palette.modalBg, borderColor: palette.overlay15 },
          ]}>
          <ThemedText style={{ color: palette.modalText }}>Modal Content</ThemedText>
          <ThemedText style={{ color: palette.modalTextMuted }}>Secondary text</ThemedText>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center', // or 'flex-end' for bottom sheet
    alignItems: 'center',
  },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
});
```

### 2. Register in Layout

All modals live under `app/(modals)/`. The `(modals)` group is registered in the root `app/_layout.tsx` with `presentation: 'transparentModal'` applied globally, so most modals require no additional registration.

If your modal needs a non-default animation (e.g., `'fade'` instead of `'none'`), add a `Stack.Screen` entry to `app/(modals)/_layout.tsx`:

```tsx
<Stack.Screen name="MyFeatureModal" options={{ animation: 'fade' }} />
```

### 3. Navigate to Modal

**Option A: Declarative (preferred)** - Call navigation directly in handler:

```tsx
const handleSomeAction = () => {
  doSomething();
  router.push('/MyFeatureModal');
};
```

**Option B: Reactive** - Use a hook with useEffect (only if needed):

```tsx
// hooks/useMyFeatureNavigation.ts
export function useMyFeatureNavigation() {
  const { someCondition } = useGameStore();

  useEffect(() => {
    if (someCondition) {
      router.push('/MyFeatureModal');
    }
  }, [someCondition]);
}
```

## Key Points

| Rule                                                   | Reason                                                                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Use `router.dismissTo('/')` not `router.back()`        | Prevents "action not handled" errors when no history                                                                   |
| Add `Modal` suffix to filename                         | Makes modal routes clearly identifiable                                                                                |
| Use `StyleSheet.absoluteFill`                          | Ensures full-screen overlay                                                                                            |
| Set `gestureEnabled: false`                            | Prevents swipe-to-dismiss (handle dismissal explicitly)                                                                |
| Set `contentStyle: { backgroundColor: 'transparent' }` | Shows your overlay background correctly                                                                                |
| Prefer declarative navigation                          | Avoids useEffect complexity and timing issues                                                                          |
| Use `palette.modalBg` and `palette.modalText`          | Correct colors in both dark and light mode                                                                             |
| Bottom sheets must use `useSafeAreaInsets()`           | Modals render outside `SafeAreaView`; bottom inset must be applied manually or content clips under the Android nav bar |

### Modal Navigation from Non-Root Screens

When a modal is opened from a screen other than the root (`/`), **always use `router.dismissTo('/SpecificScreen')` with the explicit parent screen path** instead of `router.back()` or `router.dismissTo('/')`.

```tsx
// ❌ BAD: Can cause "failed to insert view into parent" errors
router.back();
router.dismissTo('/'); // Dismisses multiple screens at once

// ✅ GOOD: Explicit destination prevents view hierarchy issues
router.dismissTo('/GameInfo'); // Return to the screen that opened this modal
```

**Why:** Using `router.back()` or dismissing to root when the modal was opened from an intermediate screen (e.g., `/` → `/GameInfo` → `/EditPlayerModal`) can cause React Native view hierarchy errors during simultaneous screen transitions.

## Conditional Redirects (When Data Becomes Unavailable)

When a modal's required data becomes unavailable (e.g., after deleting the item being edited), use the `<Redirect>` component for declarative navigation:

```tsx
import { Redirect, router } from 'expo-router';

export default function EditPlayerModal() {
  const player = roster.find((p) => p.id === playerId);

  // ✅ CORRECT: Declarative redirect
  if (!player) {
    return <Redirect href="/EditRoster" />;
  }

  // ❌ WRONG: Imperative navigation during render
  // This causes "cannot update a component while rendering a different component"
  if (!player) {
    router.dismissTo('/EditRoster'); // DON'T DO THIS
    return null;
  }

  // ... rest of component
}
```

**Why this matters:** Calling `router.navigate()` or `router.dismissTo()` during render is a side effect that triggers React's warning. The `<Redirect>` component is the React-way to handle this declaratively.

## Safe Area Handling in Modals

Modals under `app/(modals)/` are rendered **outside** the `SafeAreaView` in `app/(main)/_layout.tsx`. They cover the full screen including safe area zones. Each modal is responsible for its own inset handling via `useSafeAreaInsets()`.

### Bottom sheets (`justifyContent: 'flex-end'`)

Use the `BottomSheet` component from `@/components/ui/BottomSheet`. It handles the full-screen overlay, backdrop dismiss, sheet border radius, and bottom safe-area inset automatically — do **not** call `useSafeAreaInsets()` manually in bottom sheet modals.

Pass `minBottomPadding` to match the sheet's internal padding so the bottom padding never shrinks below that value on devices with no system inset.

```tsx
import { BottomSheet } from '@/components/ui/BottomSheet';

export default function MyModal() {
  return (
    <BottomSheet
      onDismiss={handleDismiss}
      overlayColor={palette.overlayDark40}
      sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}
      minBottomPadding={20}>
      {/* content */}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: 20, maxHeight: '70%' },
});
```

> **Note:** `StatEntryInner` and `TurnoverEntryInner` manage their own sheet rendering and insets (including left/right for landscape). Do not use `BottomSheet` as a wrapper for those modals.

### Centered modals (`justifyContent: 'center'`)

Centered modals don't sit at the screen edge, so bottom/top insets are generally not needed. Horizontal insets may matter in landscape on notched devices:

```tsx
const { left: leftInset } = useSafeAreaInsets();
// paddingHorizontal: Math.max(leftInset, 24)
```

### Orientation

Use [responsive-layout.md](responsive-layout.md) as the source of truth for `useLayout()` / `createStyles()` patterns. Ensure content is scrollable when portrait reduces horizontal space.

## Existing Modal Routes

All modals live under `app/(modals)/`:

| File                      | Description                          |
| ------------------------- | ------------------------------------ |
| `StatEntryModal.tsx`      | Goal/assist entry after scoring      |
| `TurnoverEntryModal.tsx`  | Turnover type selection              |
| `HalftimeModal.tsx`       | Halftime break screen                |
| `TimeoutModal.tsx`        | Timeout timer UI                     |
| `PointSummaryModal.tsx`   | Point outcome summary                |
| `GameSelectorModal.tsx`   | Game picker sheet (from PlayerStats) |
| `EditEventModal.tsx`      | Edit a timeline event                |
| `EditPlayerModal.tsx`     | Edit player details                  |
| `EditDurationModal.tsx`   | Edit game/period duration            |
| `NumberPickerModal.tsx`   | Generic number picker                |
| `TeamManagementModal.tsx` | Team management sheet                |

---

## Inline Modals (Simple Dialogs)

For simple confirmation dialogs, input prompts, or settings that don't need a full-screen modal, use inline modals. There are two approaches:

### Approach 1: AlertModal Component (Preferred)

Use `AlertModal` from `@/components/ui/AlertModal` for simple dialogs with a few input fields or controls. It provides consistent AlertProvider-style theming automatically.

```tsx
import { AlertModal } from '@/components/ui/AlertModal';

<AlertModal visible={isVisible} title="Rename Team" onClose={() => setIsVisible(false)}>
  {/* Custom content: inputs, switches, buttons */}
  <TextInput
    style={[styles.input, { backgroundColor: palette.overlay05, color: palette.modalText }]}
    value={value}
    onChangeText={setValue}
    placeholderTextColor={palette.modalTextMuted}
  />
  <View style={styles.buttonRow}>
    <Pressable onPress={handleCancel}>
      <ThemedText style={{ color: palette.modalText }}>Cancel</ThemedText>
    </Pressable>
    <Pressable onPress={handleSave}>
      <ThemedText style={{ color: palette.textOnAccent }}>Save</ThemedText>
    </Pressable>
  </View>
</AlertModal>;
```

**Use AlertModal when:**

- You need 1-3 input fields or toggles
- Simple confirmation with custom content
- Consistent styling matching AlertProvider is desired

**Examples:** Rename Team, New Team modals in `EditRoster.tsx`

### Approach 2: Raw `<Modal>` (Custom Styling)

For modals needing completely custom styling, use React Native's `<Modal>` directly. Apply the same theming tokens as Expo Router modals (see "Modal Theming" section above).
