import type { MaterialDesignIconsIconName } from '@react-native-vector-icons/material-design-icons/static';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface SavedGamesFilterChipProps {
  testID: string;
  label: string;
  /** Marks what kind of filter this is, e.g. a trophy so a tournament named "Advanced" isn't read as the game type. */
  leadingIcon?: MaterialDesignIconsIconName;
  accessibilityLabel: string;
  onPress: () => void;
}

/** An active Saved Games filter's label; pressing it clears the filter. */
export default function SavedGamesFilterChip({
  testID,
  label,
  leadingIcon,
  accessibilityLabel,
  onPress,
}: SavedGamesFilterChipProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Pressable
      testID={testID}
      // Reaches the 44pt touch target; the chip is the list's only way to clear the filter.
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: palette.accentOverlay15 },
        pressed && styles.chipPressed,
      ]}>
      {leadingIcon != null && (
        <MaterialCommunityIcons
          name={leadingIcon}
          size={scaleBySizeClass(16, sizeClass)}
          color={palette.accent}
        />
      )}
      <ThemedText style={[styles.chipText, { color: palette.accent }]} numberOfLines={1}>
        {label}
      </ThemedText>
      <MaterialCommunityIcons
        name="close"
        size={scaleBySizeClass(16, sizeClass)}
        color={palette.accent}
      />
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: '100%',
      gap: scaleBySizeClass(6, sizeClass),
      minHeight: scaleBySizeClass(32, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      borderRadius: 999,
    },
    chipPressed: {
      opacity: 0.7,
    },
    chipText: {
      flexShrink: 1,
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
