import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ChangelogCard } from '@/components/about/ChangelogCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { CHANGELOG } from '@/lib/changelog';
import { DISCORD_URL, GITHUB_URL } from '@/lib/constants';
import { reportError } from '@/lib/sentry';
import { Fonts } from '@/theme/theme';

export default function AboutScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const metrics = createMetrics(sizeClass);
  const { currentVersion, acknowledge } = useVersionCheck();
  const [showOlderVersions, setShowOlderVersions] = useState(false);
  const [currentEntry, ...olderEntries] = CHANGELOG;

  useFocusEffect(() => {
    acknowledge().catch((error: unknown) => {
      reportError('version-acknowledge', error);
    });
  });

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="ABOUT"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent]}>
        <View style={[styles.card, { backgroundColor: palette.overlay08 }]}>
          <View style={styles.appInfo}>
            <Image
              source={require('@/assets/images/logo-mark.png')}
              style={{ width: metrics.appIconSize, height: metrics.appIconSize }}
              contentFit="contain"
              tintColor={palette.accent}
              accessibilityLabel="U-Stat logo"
            />
            <View style={styles.appInfoText}>
              <ThemedText style={[styles.appName, { color: palette.textInverse }]}>
                U-Stat
              </ThemedText>
              <ThemedText style={[styles.appVersion, { color: palette.textMuted }]}>
                Version {currentVersion}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            WHAT&apos;S NEW
          </ThemedText>

          <ChangelogCard entry={currentEntry} isCurrent />

          {olderEntries.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showOlderVersions }}
              onPress={() => setShowOlderVersions((shown) => !shown)}
              style={({ pressed }) => [
                styles.olderToggle,
                { borderColor: palette.overlay10 },
                pressed && styles.linkPressed,
              ]}>
              <ThemedText style={[styles.olderToggleText, { color: palette.textMuted }]}>
                {showOlderVersions
                  ? 'Hide older versions'
                  : `Show older versions (${olderEntries.length})`}
              </ThemedText>
              <MaterialCommunityIcons
                name={showOlderVersions ? 'chevron-up' : 'chevron-down'}
                size={metrics.linkChevronSize}
                color={palette.textMuted}
              />
            </Pressable>
          )}

          {showOlderVersions &&
            olderEntries.map((entry) => <ChangelogCard key={entry.version} entry={entry} />)}
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            CONNECT
          </ThemedText>

          <Pressable
            onPress={() => Linking.openURL(DISCORD_URL)}
            style={({ pressed }) => [
              styles.linkItem,
              { backgroundColor: palette.overlay08 },
              pressed && styles.linkPressed,
            ]}>
            <MaterialIcons name="discord" size={metrics.linkIconSize} color={palette.accent} />
            <View style={styles.linkText}>
              <ThemedText style={[styles.linkTitle, { color: palette.textInverse }]}>
                Join the Discord
              </ThemedText>
              <ThemedText style={[styles.linkSubtitle, { color: palette.textMuted }]}>
                Share feedback and suggest features
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={metrics.linkChevronSize}
              color={palette.textMuted}
            />
          </Pressable>

          <Pressable
            onPress={() => Linking.openURL(GITHUB_URL)}
            style={({ pressed }) => [
              styles.linkItem,
              { backgroundColor: palette.overlay08 },
              pressed && styles.linkPressed,
            ]}>
            <MaterialCommunityIcons
              name="github"
              size={metrics.linkIconSize}
              color={palette.accent}
            />
            <View style={styles.linkText}>
              <ThemedText style={[styles.linkTitle, { color: palette.textInverse }]}>
                View on GitHub
              </ThemedText>
              <ThemedText style={[styles.linkSubtitle, { color: palette.textMuted }]}>
                Open source: browse the code / contribute
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={metrics.linkChevronSize}
              color={palette.textMuted}
            />
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: scaleBySizeClass(24, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
      gap: scaleBySizeClass(24, sizeClass),
    },
    card: {
      borderRadius: scaleBySizeClass(14, sizeClass),
      padding: scaleBySizeClass(20, sizeClass),
      gap: scaleBySizeClass(12, sizeClass),
    },
    appInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(16, sizeClass),
    },
    appInfoText: {
      gap: scaleBySizeClass(2, sizeClass),
    },
    appName: {
      fontSize: scaleBySizeClass(24, sizeClass),
      fontFamily: Fonts.bold,
    },
    appVersion: {
      fontSize: scaleBySizeClass(14, sizeClass),
    },
    section: {
      gap: scaleBySizeClass(12, sizeClass),
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginLeft: scaleBySizeClass(4, sizeClass),
    },
    linkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: scaleBySizeClass(16, sizeClass),
      borderRadius: scaleBySizeClass(14, sizeClass),
      gap: scaleBySizeClass(14, sizeClass),
    },
    linkPressed: {
      opacity: 0.8,
    },
    olderToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(6, sizeClass),
      paddingVertical: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(14, sizeClass),
      borderWidth: 1,
    },
    olderToggleText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    linkText: {
      flex: 1,
      gap: scaleBySizeClass(2, sizeClass),
    },
    linkTitle: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    linkSubtitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    appIconSize: scaleBySizeClass(48, sizeClass),
    linkIconSize: scaleBySizeClass(24, sizeClass),
    linkChevronSize: scaleBySizeClass(22, sizeClass),
  };
}
