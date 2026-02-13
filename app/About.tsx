import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { useOrientationLock } from '@/hooks/useOrientationLock';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { CHANGELOG } from '@/lib/changelog';
import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AboutScreen() {
  useOrientationLock();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { currentVersion, acknowledge } = useVersionCheck();

  // Acknowledge version when user views this page
  useFocusEffect(
    useCallback(() => {
      acknowledge();
    }, [acknowledge]),
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
          hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>ABOUT</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(24, insets.bottom) },
        ]}>
        {/* App Info Card */}
        <View style={[styles.card, { backgroundColor: palette.overlay08 }]}>
          <View style={styles.appInfo}>
            <MaterialCommunityIcons name="disc" size={48} color={palette.accent} />
            <View style={styles.appInfoText}>
              <Text style={[styles.appName, { color: palette.textInverse }]}>U-Stat</Text>
              <Text style={[styles.appVersion, { color: palette.textMuted }]}>
                Version {currentVersion}
              </Text>
            </View>
          </View>
        </View>

        {/* What's New Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>WHAT&apos;S NEW</Text>

          {CHANGELOG.map((entry, index) => (
            <View
              key={entry.version}
              style={[
                styles.changelogEntry,
                { backgroundColor: palette.overlay08 },
                index === 0 && { borderColor: palette.accent, borderWidth: 1 },
              ]}>
              <View style={styles.changelogHeader}>
                <Text style={[styles.changelogVersion, { color: palette.textInverse }]}>
                  v{entry.version}
                </Text>
                {index === 0 && (
                  <View style={[styles.currentBadge, { backgroundColor: palette.accentOverlay10 }]}>
                    <Text style={[styles.currentBadgeText, { color: palette.accent }]}>
                      Current
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.changelogDate, { color: palette.textMuted }]}>{entry.date}</Text>
              <View style={styles.changesList}>
                {entry.changes.map((change, i) => (
                  <View key={i} style={styles.changeItem}>
                    <Text style={[styles.changeBullet, { color: palette.accent }]}>•</Text>
                    <Text style={[styles.changeText, { color: palette.textMuted }]}>{change}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Links Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>CONNECT</Text>

          <Pressable
            onPress={() => Linking.openURL('https://discord.gg/AjsmqhZ2GH')}
            style={({ pressed }) => [
              styles.linkItem,
              { backgroundColor: palette.overlay08 },
              pressed && styles.linkPressed,
            ]}>
            <MaterialIcons name="discord" size={24} color={palette.accent} />
            <View style={styles.linkText}>
              <Text style={[styles.linkTitle, { color: palette.textInverse }]}>
                Join the Discord
              </Text>
              <Text style={[styles.linkSubtitle, { color: palette.textMuted }]}>
                Share feedback and suggest features
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={palette.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 8,
    gap: 24,
  },
  card: {
    borderRadius: 14,
    padding: 20,
    gap: 12,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  appInfoText: {
    gap: 2,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
  },
  appVersion: {
    fontSize: 14,
  },
  appDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  changelogEntry: {
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  changelogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  changelogVersion: {
    fontSize: 16,
    fontWeight: '700',
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  changelogDate: {
    fontSize: 12,
  },
  changesList: {
    gap: 6,
    marginTop: 4,
  },
  changeItem: {
    flexDirection: 'row',
    gap: 8,
  },
  changeBullet: {
    fontSize: 14,
  },
  changeText: {
    fontSize: 13,
    flex: 1,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 14,
  },
  linkPressed: {
    opacity: 0.8,
  },
  linkText: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  linkSubtitle: {
    fontSize: 12,
  },
});
