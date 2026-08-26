import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface AdvancedTurnoverCorrectionFieldProps {
  testID: string;
  label: string;
  value: string;
  expanded: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}

export function AdvancedTurnoverCorrectionField({
  testID,
  label,
  value,
  expanded,
  disabled = false,
  onPress,
  children,
}: AdvancedTurnoverCorrectionFieldProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.container}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        accessibilityHint={disabled ? undefined : `Choose ${label.toLowerCase()}`}
        accessibilityState={{ disabled, expanded }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: 'transparent',
            borderColor: expanded ? palette.accent : palette.overlay20,
          },
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}>
        <ThemedText style={[styles.label, { color: palette.modalTextMuted }]}>{label}</ThemedText>
        <ThemedText
          numberOfLines={1}
          style={[styles.value, { color: disabled ? palette.modalTextMuted : palette.modalText }]}>
          {value}
        </ThemedText>
        {!disabled && (
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={scaleBySizeClass(20, sizeClass)}
            color={expanded ? palette.accent : palette.modalTextMuted}
          />
        )}
      </Pressable>
      {expanded && <View style={styles.options}>{children}</View>}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: { gap: 8 },
    row: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    label: {
      width: scaleBySizeClass(104, sizeClass),
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    value: {
      flex: 1,
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    options: {
      paddingHorizontal: 4,
      paddingBottom: 4,
    },
    disabled: { opacity: 0.65 },
    pressed: { opacity: 0.8 },
  });
}
