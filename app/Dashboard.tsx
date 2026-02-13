import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { useNewGame } from '@/hooks/useNewGame';
import { useOrientationLock } from '@/hooks/useOrientationLock';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { useGameStore } from '@/store/gameStore';
import { useTutorialStore } from '@/store/tutorialStore';
import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MenuItem {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  showBadge?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function DashboardScreen() {
  useOrientationLock();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { statTrackingEnabled, currentTeam, savedGames } = useGameStore();
  const { resetStatsTutorial } = useTutorialStore();
  const { confirmNewGame } = useNewGame({ onSuccess: () => router.push('/') });
  const { hasNewVersion } = useVersionCheck();

  const team1Name = currentTeam?.name ?? 'Team 1';
  const rosterCount = currentTeam?.roster?.length ?? 0;
  const gamesCount = savedGames?.length ?? 0;

  const sections: MenuSection[] = [
    {
      title: 'CURRENT GAME',
      items: [
        {
          icon: 'plus-circle-outline',
          label: 'New Game',
          description: 'Reset score and start fresh',
          onPress: confirmNewGame,
        },
        {
          icon: 'scoreboard-outline',
          label: 'Back to Scoreboard',
          description: 'Return to live game',
          onPress: () => router.back(),
        },
        {
          icon: 'cog-outline',
          label: 'Game Settings',
          description: 'Score limit, timer, timeouts',
          onPress: () => router.push('/Settings'),
        },
        {
          icon: 'timeline-clock-outline',
          label: 'Game Timeline',
          description: 'View play-by-play events',
          onPress: () => router.push('/GameTimeline'),
          disabled: !statTrackingEnabled,
        },
        {
          icon: 'chart-bar',
          label: 'View Stats',
          description: 'Player stats & game history',
          onPress: () => router.push('/ViewStats'),
          disabled: !statTrackingEnabled,
        },
      ],
    },
    {
      title: 'DATA',
      items: [
        {
          icon: 'history',
          label: 'Saved Games',
          description: gamesCount > 0 ? `${gamesCount} games saved` : 'No games yet',
          onPress: () => router.push({ pathname: '/ViewStats', params: { tab: 'saved' } }),
          disabled: gamesCount === 0,
        },
        {
          icon: 'chart-box-outline',
          label: 'Aggregate Stats',
          description: gamesCount > 0 ? 'Combine stats across games' : 'No games yet',
          onPress: () => router.push({ pathname: '/ViewStats', params: { tab: 'aggregate' } }),
          disabled: gamesCount === 0,
        },
        {
          icon: 'account-group-outline',
          label: 'Manage Team',
          description: `${team1Name}${rosterCount > 0 ? ` • ${rosterCount} players` : ''}`,
          onPress: () =>
            router.push({
              pathname: '/EditRoster',
              params: { teamName: team1Name },
            }),
        },
      ],
    },
    {
      title: 'HELP',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Help',
          description: 'Tutorials, legends, privacy',
          onPress: () => router.push('/Help'),
        },
        {
          icon: 'information-outline',
          label: 'About',
          description: 'Version info & changelog',
          onPress: () => router.push('/About'),
          showBadge: hasNewVersion,
        },
      ],
    },
  ];

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
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>DASHBOARD</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(24, insets.bottom) },
        ]}>
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>{section.title}</Text>
            <View style={styles.menuList}>
              {section.items.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={item.onPress}
                  disabled={item.disabled}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { backgroundColor: palette.overlay08 },
                    pressed && styles.menuItemPressed,
                    item.disabled && styles.menuItemDisabled,
                  ]}>
                  <View
                    style={[styles.iconContainer, { backgroundColor: palette.accentOverlay10 }]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={22}
                      color={item.disabled ? palette.textMuted : palette.accent}
                    />
                  </View>
                  <View style={styles.menuItemText}>
                    <View style={styles.menuItemLabelRow}>
                      <Text
                        style={[
                          styles.menuItemLabel,
                          { color: item.disabled ? palette.textMuted : palette.textInverse },
                        ]}>
                        {item.label}
                      </Text>
                      {item.showBadge && (
                        <View style={[styles.newBadge, { backgroundColor: palette.accent }]}>
                          <Text style={[styles.newBadgeText, { color: palette.primary }]}>
                            New!
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.menuItemDescription, { color: palette.textMuted }]}>
                      {item.disabled ? 'Enable stat tracking first' : item.description}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={item.disabled ? palette.overlay20 : palette.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Discord Banner */}
        <Pressable
          onPress={() => Linking.openURL('https://discord.gg/AjsmqhZ2GH')}
          style={({ pressed }) => [
            styles.discordBanner,
            { backgroundColor: palette.discordBg },
            pressed && styles.menuItemPressed,
          ]}>
          <MaterialIcons name="discord" size={24} color={palette.discordText} />
          <View style={styles.discordText}>
            <Text style={[styles.discordTitle, { color: palette.discordText }]}>
              Join the Discord
            </Text>
            <Text style={[styles.discordSubtitle, { color: palette.discordTextMuted }]}>
              Share feedback and give me ideas for new features
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={palette.discordTextMuted} />
        </Pressable>

        {/* Dev tools - only visible in development */}
        {__DEV__ && (
          <>
            <Pressable
              onPress={() => {
                AsyncStorage.removeItem('ultimatestats_last_seen_version').then(() => {
                  console.log('Version check reset - reload app to see badge');
                });
              }}
              style={({ pressed }) => [
                styles.discordBanner,
                { backgroundColor: palette.danger },
                pressed && styles.menuItemPressed,
              ]}>
              <MaterialCommunityIcons name="bug" size={24} color="white" />
              <View style={styles.discordText}>
                <Text style={[styles.discordTitle, { color: 'white' }]}>Reset Version Check</Text>
                <Text style={[styles.discordSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
                  DEV ONLY - Reload app after tapping
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                resetStatsTutorial();
              }}
              style={({ pressed }) => [
                styles.discordBanner,
                { backgroundColor: palette.danger, marginTop: 12 },
                pressed && styles.menuItemPressed,
              ]}>
              <MaterialCommunityIcons name="gesture-tap-button" size={24} color="white" />
              <View style={styles.discordText}>
                <Text style={[styles.discordTitle, { color: 'white' }]}>Reset Stats Tutorial</Text>
                <Text style={[styles.discordSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
                  DEV ONLY - Reset the has seen flag
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                router.push('/this-route-does-not-exist' as never);
              }}
              style={({ pressed }) => [
                styles.discordBanner,
                { backgroundColor: palette.warning, marginTop: 12 },
                pressed && styles.menuItemPressed,
              ]}>
              <MaterialCommunityIcons name="link-off" size={24} color="white" />
              <View style={styles.discordText}>
                <Text style={[styles.discordTitle, { color: 'white' }]}>Test 404 Page</Text>
                <Text style={[styles.discordSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
                  DEV ONLY - Navigate to non-existent route
                </Text>
              </View>
            </Pressable>
          </>
        )}
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  section: {
    flex: 1,
    minWidth: 280,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  menuList: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 14,
  },
  menuItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    gap: 2,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuItemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  menuItemDescription: {
    fontSize: 12,
  },
  discordBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 14,
    width: '100%',
    marginTop: 8,
  },
  discordText: {
    flex: 1,
    gap: 2,
  },
  discordTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  discordSubtitle: {
    fontSize: 12,
  },
});
