import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useFocusEffect } from 'expo-router';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { CHANGELOG } from '@/lib/changelog';
import { Fonts } from '@/theme/theme';

export default function AboutScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const metrics = createMetrics(sizeClass);
  const { currentVersion, acknowledge } = useVersionCheck();

  useFocusEffect(() => {
    acknowledge();
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
        {/* App Info Card */}
        <View style={[styles.card, { backgroundColor: palette.overlay08 }]}>
          <View style={styles.appInfo}>
            <MaterialCommunityIcons name="disc" size={metrics.appIconSize} color={palette.accent} />
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

        {/* What's New Section */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            WHAT&apos;S NEW
          </ThemedText>

          {CHANGELOG.map((entry, index) => (
            <View
              key={entry.version}
              style={[
                styles.changelogEntry,
                { backgroundColor: palette.overlay08 },
                index === 0 && { borderColor: palette.accent, borderWidth: 1 },
              ]}>
              <View style={styles.changelogHeader}>
                <ThemedText style={[styles.changelogVersion, { color: palette.textInverse }]}>
                  v{entry.version}
                </ThemedText>
                {index === 0 && (
                  <View style={[styles.currentBadge, { backgroundColor: palette.accentOverlay10 }]}>
                    <ThemedText style={[styles.currentBadgeText, { color: palette.accent }]}>
                      Current
                    </ThemedText>
                  </View>
                )}
              </View>
              <ThemedText style={[styles.changelogDate, { color: palette.textMuted }]}>
                {entry.date}
              </ThemedText>
              <View style={styles.changesList}>
                {entry.changes.map((change, i) => (
                  <View key={i} style={styles.changeItem}>
                    <ThemedText style={[styles.changeBullet, { color: palette.accent }]}>
                      •
                    </ThemedText>
                    <ThemedText style={[styles.changeText, { color: palette.textMuted }]}>
                      {change}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Links Section */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            CONNECT
          </ThemedText>

          <Pressable
            onPress={() => Linking.openURL('https://discord.gg/AjsmqhZ2GH')}
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
    appDescription: {
      fontSize: scaleBySizeClass(14, sizeClass),
      lineHeight: scaleBySizeClass(20, sizeClass),
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
    changelogEntry: {
      borderRadius: scaleBySizeClass(14, sizeClass),
      padding: scaleBySizeClass(16, sizeClass),
      gap: scaleBySizeClass(8, sizeClass),
    },
    changelogHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(10, sizeClass),
    },
    changelogVersion: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },
    currentBadge: {
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      paddingVertical: scaleBySizeClass(3, sizeClass),
      borderRadius: scaleBySizeClass(6, sizeClass),
    },
    currentBadgeText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    changelogDate: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
    changesList: {
      gap: scaleBySizeClass(6, sizeClass),
      marginTop: scaleBySizeClass(4, sizeClass),
    },
    changeItem: {
      flexDirection: 'row',
      gap: scaleBySizeClass(8, sizeClass),
    },
    changeBullet: {
      fontSize: scaleBySizeClass(14, sizeClass),
    },
    changeText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      flex: 1,
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
