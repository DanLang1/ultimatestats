import HelpContent from '@/components/HelpContent';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { router, Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

export default function HelpScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="HELP"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent]}>
        <HelpContent showActionBarLegend={true} sizeClass={sizeClass} />
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(sizeClass: 'small' | 'medium' | 'large') {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: scaleBySizeClass(24, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
    },
  });
}
