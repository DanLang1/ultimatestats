import { Platform, Switch as RNSwitch, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface SwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function Switch({ label, value, onValueChange }: SwitchProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const switchScale =
    Platform.OS === 'ios'
      ? getSizeClassValue({ small: 0.8, medium: 0.9, large: 1.0 }, sizeClass)
      : getSizeClassValue({ small: 1, medium: 1.12, large: 1.2 }, sizeClass);

  const thumbColor = value ? palette.textOnAccent : palette.textMuted;

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: palette.textMuted }]}>{label}</ThemedText>
      <View style={styles.switchWrapper}>
        <RNSwitch
          style={{ transform: [{ scale: switchScale }] }}
          trackColor={{
            false: palette.overlay20,
            true: palette.accent,
          }}
          thumbColor={thumbColor}
          onValueChange={onValueChange}
          value={value}
        />
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: getSizeClassValue({ small: 12, medium: 14, large: 16 }, sizeClass),
      height: getSizeClassValue({ small: 48, medium: 54, large: 58 }, sizeClass),
      paddingHorizontal: getSizeClassValue({ small: 4, medium: 6, large: 8 }, sizeClass), // Align with input text visually
    },
    label: {
      fontSize: getSizeClassValue({ small: 10, medium: 11, large: 12 }, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: getSizeClassValue({ small: 1, medium: 1.05, large: 1.1 }, sizeClass),
      textTransform: 'uppercase',
    },
    switchWrapper: {
      // No extra wrapper styling needed for horizontal layout
    },
  });
}
