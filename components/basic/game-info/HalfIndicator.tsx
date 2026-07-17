import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface HalfIndicatorProps {
  gameHalf: number;
}

export function HalfIndicator({ gameHalf }: HalfIndicatorProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const label = gameHalf === 1 ? '1ST HALF' : '2ND HALF';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
      ]}>
      <ThemedText style={[styles.text, { color: palette.textMuted }]}>{label}</ThemedText>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    badge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: scaleBySizeClass(10, sizeClass),
      paddingVertical: scaleBySizeClass(3, sizeClass),
    },
    text: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1.5,
    },
  });
}
