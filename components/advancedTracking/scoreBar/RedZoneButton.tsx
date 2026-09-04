import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface RedZoneButtonProps {
  activeSideName: string;
  selected: boolean;
  onPress: () => void;
}

export function RedZoneButton({ activeSideName, selected, onPress }: RedZoneButtonProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Pressable
      testID="tracker-red-zone-button"
      accessibilityRole="button"
      accessibilityLabel={`Toggle ${activeSideName} Red Zone`}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: selected ? palette.dangerOverlay15 : 'transparent',
          borderColor: selected ? palette.danger : palette.overlay10,
        },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.sideDot, { backgroundColor: palette.danger }]} />
      <ThemedText style={[styles.label, { color: selected ? palette.danger : palette.textMuted }]}>
        RZ
      </ThemedText>
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    button: {
      minWidth: scaleBySizeClass(70, sizeClass),
      minHeight: scaleBySizeClass(32, sizeClass),
      paddingHorizontal: scaleBySizeClass(10, sizeClass),
      borderWidth: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      borderRadius: scaleBySizeClass(10, sizeClass),
      borderCurve: 'continuous',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(6, sizeClass),
    },
    sideDot: {
      width: scaleBySizeClass(7, sizeClass),
      height: scaleBySizeClass(7, sizeClass),
      borderRadius: scaleBySizeClass(4, sizeClass),
    },
    label: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 0.8,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
