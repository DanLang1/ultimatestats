import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts, Palette } from '@/theme/theme';

export function LandscapeUnsupported() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(palette, sizeClass);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="cellphone"
          size={scaleBySizeClass(48, sizeClass)}
          color={palette.textMuted}
          style={styles.phoneIcon}
        />
        <MaterialCommunityIcons
          name="rotate-right-variant"
          size={scaleBySizeClass(28, sizeClass)}
          color={palette.accent}
          style={styles.rotateIcon}
        />
        <ThemedText style={styles.title}>Landscape not supported</ThemedText>
        <ThemedText style={styles.subtitle}>
          Rotate your device to portrait to use this screen
        </ThemedText>
      </View>
    </ThemedView>
  );
}

function createStyles(palette: Palette, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 48,
    },
    phoneIcon: {
      marginBottom: scaleBySizeClass(4, sizeClass),
    },
    rotateIcon: {
      marginBottom: scaleBySizeClass(20, sizeClass),
    },
    title: {
      color: palette.textPrimary,
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.bold,
      textAlign: 'center',
      marginBottom: scaleBySizeClass(8, sizeClass),
    },
    subtitle: {
      color: palette.textMuted,
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.regular,
      textAlign: 'center',
      lineHeight: scaleBySizeClass(20, sizeClass),
    },
  });
}
