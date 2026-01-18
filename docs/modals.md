# Expo Router Modals

This project uses **Expo Router transparent modals** for overlay-style UI elements (stat entry, turnover entry, pull prompt). These behave like traditional React Native `Modal` components but work correctly with Android edge-to-edge mode.

## Creating a New Modal

### 1. Create the Route File

Create a new file in `app/` with `Modal` suffix (e.g., `app/MyFeatureModal.tsx`):

```tsx
import { useGameStore } from '@/store/gameStore';
import { palette } from '@/theme/theme';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function MyFeatureModal() {
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
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        {/* Your modal content here */}
        <View style={styles.sheet}>
          <Text>Modal Content</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: palette.overlayDark40, // Semi-transparent background
    justifyContent: 'center', // or 'flex-end' for bottom sheet
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 24,
  },
});
```

### 2. Register in Layout

Add to `app/_layout.tsx`:

```tsx
<Stack.Screen
  name="MyFeatureModal"
  options={{
    presentation: 'transparentModal',
    animation: 'fade',
    gestureEnabled: false,
    contentStyle: { backgroundColor: 'transparent' },
  }}
/>
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

| Rule                                                   | Reason                                                  |
| ------------------------------------------------------ | ------------------------------------------------------- |
| Use `router.dismissTo('/')` not `router.back()`        | Prevents "action not handled" errors when no history    |
| Add `Modal` suffix to filename                         | Makes modal routes clearly identifiable                 |
| Use `StyleSheet.absoluteFill`                          | Ensures full-screen overlay                             |
| Set `gestureEnabled: false`                            | Prevents swipe-to-dismiss (handle dismissal explicitly) |
| Set `contentStyle: { backgroundColor: 'transparent' }` | Shows your overlay background correctly                 |
| Prefer declarative navigation                          | Avoids useEffect complexity and timing issues           |

## Existing Modal Routes

- `app/StatEntryModal.tsx` - Goal/assist entry after scoring
- `app/TurnoverEntryModal.tsx` - Turnover type selection
- `app/PullPromptModal.tsx` - Initial possession selection

---

## Inline Modals (Simple Dialogs)

For simple confirmation dialogs, input prompts, or settings that don't need a full-screen modal, use inline modals. There are two approaches:

### Approach 1: AlertModal Component (Preferred)

Use `AlertModal` from `@/components/ui/AlertModal` for simple dialogs with a few input fields or controls. It provides consistent AlertProvider-style theming automatically.

```tsx
import { AlertModal } from '@/components/ui/AlertModal';

<AlertModal visible={isVisible} title="Edit Player" onClose={() => setIsVisible(false)}>
  {/* Custom content: inputs, switches, buttons */}
  <TextInput
    style={[styles.input, { backgroundColor: palette.overlay05, color: palette.textInverse }]}
    value={value}
    onChangeText={setValue}
  />
  <View style={styles.buttonRow}>
    <Pressable onPress={handleCancel}>
      <Text>Cancel</Text>
    </Pressable>
    <Pressable onPress={handleSave}>
      <Text>Save</Text>
    </Pressable>
  </View>
</AlertModal>;
```

**Use AlertModal when:**

- You need 1-3 input fields or toggles
- Simple confirmation with custom content
- Consistent styling matching AlertProvider is desired

**Examples:** Edit Player, Rename Team, New Team modals in `EditRoster.tsx`

### Approach 2: Raw `<Modal>` (Custom Styling)

For modals needing completely custom styling, use React Native's `<Modal>` directly with these theming tokens:

| Token                  | Usage                                   |
| ---------------------- | --------------------------------------- |
| `palette.overlayModal` | Backdrop (semi-transparent)             |
| `palette.modalBg`      | Modal content background                |
| `palette.modalText`    | Primary text color inside modal         |
| `palette.overlay15`    | Modal border color                      |
| `palette.accent`       | Cancel button text (outline style)      |
| `palette.textOnAccent` | Save/confirm button text (filled style) |

**⚠️ Do NOT use:** `palette.surface` or `palette.textPrimary` for modals - they invert between dark/light mode and will cause visibility issues.
