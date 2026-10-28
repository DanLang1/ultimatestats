import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

export default function CombineGamesButton() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Pressable
      testID="saved-games-combine"
      accessibilityRole="button"
      accessibilityLabel="Combine games"
      onPress={() => router.push('/aggregate-stats')}
      style={({ pressed }) => [
        styles.button,
        { borderColor: palette.accentOverlay30 },
        pressed && styles.pressed,
      ]}>
      <MaterialCommunityIcons
        name="chart-box-outline"
        size={scaleBySizeClass(20, sizeClass)}
        color={palette.accent}
      />
      <ThemedText style={[styles.label, { color: palette.accent }]}>Combine games</ThemedText>
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    button: {
      minHeight: scaleBySizeClass(44, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(8, sizeClass),
      paddingHorizontal: scaleBySizeClass(16, sizeClass),
      paddingVertical: scaleBySizeClass(10, sizeClass),
      borderRadius: scaleBySizeClass(12, sizeClass),
      borderWidth: 1,
    },
    pressed: {
      opacity: 0.7,
    },
    label: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
