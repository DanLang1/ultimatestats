import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

import { FOOTER_ACTION_HEIGHT } from './constants';

interface OffenseActionButtonProps {
  testID: string;
  label: string;
  accessibilityLabel: string;
  enabled: boolean;
  fillColor: string;
  onPress: () => void;
}

export const OffenseActionButton = ({
  testID,
  label,
  accessibilityLabel,
  enabled,
  fillColor,
  onPress,
}: OffenseActionButtonProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: fillColor, borderColor: fillColor },
        !enabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <ThemedText numberOfLines={1} style={[styles.btnText, { color: palette.textOnAccent }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    btn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: scaleBySizeClass(FOOTER_ACTION_HEIGHT, sizeClass),
      borderRadius: 16,
      borderCurve: 'continuous',
      borderWidth: 1,
      paddingHorizontal: scaleBySizeClass(4, sizeClass),
    },
    disabled: {
      opacity: 0.4,
    },
    pressed: {
      opacity: 0.7,
    },
    btnText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(14, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  });
}
