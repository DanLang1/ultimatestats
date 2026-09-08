import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';

import { AppearanceSettingsSection } from './AppearanceSettingsSection';
import { ColorSettingsSection } from './ColorSettingsSection';
import { StatPreferencesSection } from './StatPreferencesSection';

export function SettingsContent() {
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { palette } = useTheme();
  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="SETTINGS"
        onBack={() => router.back()}
        backHitSlop={24}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        titleOverlayPaddingPortrait={96}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View key={isLandscape ? 'landscape' : 'portrait'} style={styles.columnsContainer}>
          <View style={styles.column}>
            <AppearanceSettingsSection />
            {isLandscape && <ColorSettingsSection />}
          </View>
          <View style={styles.column}>
            <StatPreferencesSection />
          </View>
        </View>
        {!isLandscape && <ColorSettingsSection />}
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: scaleBySizeClass(24, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
    },
    columnsContainer: {
      flexDirection: isLandscape ? 'row' : 'column',
      gap: scaleBySizeClass(24, sizeClass),
      alignItems: isLandscape ? 'flex-start' : 'stretch',
    },
    column: {
      flex: isLandscape ? 1 : 0,
      width: isLandscape ? undefined : '100%',
      gap: scaleBySizeClass(12, sizeClass),
    },
  });
}
