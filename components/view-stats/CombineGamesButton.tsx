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
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <MaterialCommunityIcons
        name="chart-box-outline"
        size={scaleBySizeClass(18, sizeClass)}
        color={palette.accent}
      />
      <ThemedText style={[styles.label, { color: palette.accent }]}>Combine</ThemedText>
      <MaterialCommunityIcons
        name="chevron-right"
        size={scaleBySizeClass(18, sizeClass)}
        color={palette.accent}
      />
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    link: {
      minHeight: scaleBySizeClass(44, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(4, sizeClass),
    },
    pressed: {
      opacity: 0.6,
    },
    label: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
