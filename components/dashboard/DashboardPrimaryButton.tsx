import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface DashboardPrimaryButtonProps {
  label: string;
  onPress: () => void;
  testID: string;
}

/** The dashboard hero's one filled action, shared so Start and Resume always match. */
export default function DashboardPrimaryButton({
  label,
  onPress,
  testID,
}: DashboardPrimaryButtonProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.accent },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={[styles.label, { color: palette.textOnAccent }]}>{label}</ThemedText>
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    button: {
      height: scaleBySizeClass(50, sizeClass),
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: scaleBySizeClass(17, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    pressed: {
      opacity: 0.8,
    },
  });
}
