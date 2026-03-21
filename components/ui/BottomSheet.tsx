import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomSheetProps {
  onDismiss: () => void;
  /** Defaults to palette.overlayDark60. Override only for non-standard backdrops. */
  overlayColor?: string;
  sheetStyle?: StyleProp<ViewStyle>;
  /**
   * Minimum bottom padding applied to the sheet. Use this to match the sheet's
   * existing internal padding so it never shrinks on devices with no system inset.
   * The actual paddingBottom is Math.max(minBottomPadding, bottomInset). Defaults to 12.
   */
  minBottomPadding?: number;
  children: React.ReactNode;
}

/**
 * Standard bottom sheet wrapper for transparent modals.
 *
 * Handles the full-screen overlay, backdrop dismiss, sheet border radius,
 * and bottom safe-area inset — so individual modals never have to remember
 * to call useSafeAreaInsets().
 */
export function BottomSheet({
  onDismiss,
  overlayColor,
  sheetStyle,
  minBottomPadding = 12,
  children,
}: BottomSheetProps) {
  const { palette } = useTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const resolvedOverlayColor = overlayColor ?? palette.overlayDark60;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: resolvedOverlayColor }]}
        onPress={onDismiss}>
        <View
          style={[
            styles.sheet,
            sheetStyle,
            { paddingBottom: Math.max(minBottomPadding, bottomInset) },
          ]}
          onStartShouldSetResponder={() => true}>
          {children}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});
