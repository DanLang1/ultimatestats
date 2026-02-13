## Portrait Conversion Checklist

When converting a screen to support portrait (adding `useOrientationLock`), ALWAYS also add safe area insets:

1. Import: `import { useSafeAreaInsets } from 'react-native-safe-area-context';`
2. Hook: `const insets = useSafeAreaInsets();`
3. Header top: `style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}`
4. ScrollView bottom: `contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(24, insets.bottom) }]}`

The root `_layout.tsx` only handles `edges={['left', 'right']}` — individual screens must handle top/bottom insets themselves. Landscape-only screens didn't need this, but portrait does.
