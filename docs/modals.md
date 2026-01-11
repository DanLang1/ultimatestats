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

## Popup Modals (Inline `<Modal>`)

For simple confirmation dialogs or quick input modals, you can use React Native's `<Modal>` component directly. These are distinct from screen modals above.

### Theming Tokens

Always use these palette tokens for proper dark/light mode support:

| Token                  | Usage                                   |
| ---------------------- | --------------------------------------- |
| `palette.overlayModal` | Backdrop (semi-transparent)             |
| `palette.modalBg`      | Modal content background                |
| `palette.modalText`    | Primary text color inside modal         |
| `palette.overlay15`    | Modal border color                      |
| `palette.accent`       | Cancel button text (outline style)      |
| `palette.textOnAccent` | Save/confirm button text (filled style) |

**⚠️ Do NOT use:** `palette.surface` or `palette.textPrimary` for modals - they invert between dark/light mode and will cause visibility issues.

### Example

```tsx
<Modal visible={visible} transparent animationType="fade">
  <Pressable
    style={[styles.overlay, { backgroundColor: palette.overlayModal }]}
    onPress={onDismiss}>
    <View
      style={[styles.content, { backgroundColor: palette.modalBg, borderColor: palette.overlay15 }]}
      onStartShouldSetResponder={() => true}>
      <Text style={{ color: palette.modalText }}>Modal Title</Text>
      {/* Cancel button: outline style */}
      <Pressable style={{ borderColor: palette.accent, borderWidth: 1 }}>
        <Text style={{ color: palette.accent }}>Cancel</Text>
      </Pressable>
      {/* Save button: filled style */}
      <Pressable style={{ backgroundColor: palette.accent }}>
        <Text style={{ color: palette.textOnAccent }}>Save</Text>
      </Pressable>
    </View>
  </Pressable>
</Modal>
```

### Existing Popup Modals

- `app/EditRoster.tsx` - Rename Team, New Team, Edit Player modals
