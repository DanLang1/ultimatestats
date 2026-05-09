import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useTutorialStore } from '@/store/tutorialStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function ShowcaseHintBanner() {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const dismissShowcaseHint = useTutorialStore((s) => s.dismissShowcaseHint);
  const styles = createStyles(sizeClass);

  const handlePress = () => {
    dismissShowcaseHint();
    router.push('/Showcase');
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
        pressed && styles.pressed,
      ]}>
      <MaterialCommunityIcons
        name="trophy-outline"
        size={scaleBySizeClass(22, sizeClass)}
        color={palette.accent}
      />
      <View style={styles.textContainer}>
        <ThemedText style={[styles.title, { color: palette.textInverse }]}>
          See what full game stats look like
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: palette.textMuted }]}>
          Download a real showcase game with advanced stat tracking
        </ThemedText>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={scaleBySizeClass(20, sizeClass)}
        color={palette.textMuted}
      />
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: scaleBySizeClass(14, sizeClass),
      borderRadius: scaleBySizeClass(12, sizeClass),
      borderWidth: 1,
      gap: scaleBySizeClass(12, sizeClass),
    },
    pressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    textContainer: {
      flex: 1,
      gap: scaleBySizeClass(2, sizeClass),
    },
    title: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    subtitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.regular,
    },
  });
}
