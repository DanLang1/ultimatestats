import LegacyGamesDevModal from '@/components/dashboard/LegacyGamesDevModal';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useDashboardSession } from '@/hooks/useDashboardSession';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useNewGame } from '@/hooks/useNewGame';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { useTutorialStore } from '@/store/tutorialStore';
import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

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
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const metrics = createMetrics(sizeClass);
  const [legacyGamesModalVisible, setLegacyGamesModalVisible] = useState(false);
  const { resetStatsTutorial } = useTutorialStore();
  const { confirmNewGame } = useNewGame({ onSuccess: () => router.navigate('/Scoreboard') });
  const { hasNewVersion } = useVersionCheck();
  const {
    currentTeam,
    statTrackingEnabled,
    team1Name,
    rosterCount,
    gamesCount,
    sessionStatus,
    hasInProgressGame,
    hasCompletedGame,
    completedGameSummary,
  } = useDashboardSession();

  const sections: MenuSection[] = [
    {
      title: 'GAME SETUP',
      items: [
        {
          icon: 'plus-circle-outline' as const,
          label: 'New Game',
          description:
            sessionStatus === 'finished'
              ? statTrackingEnabled
                ? 'Completed game is saved. Clear the scoreboard and start fresh'
                : 'Clear the completed scoreboard and start fresh'
              : hasInProgressGame
                ? 'Leave the current game and start a fresh one'
                : 'Open a fresh scoreboard and start tracking',
          onPress: confirmNewGame,
        },
        {
          icon: 'cog-outline' as const,
          label: 'Game Settings',
          description: 'Score limit, timer, timeouts',
          onPress: () => router.push('/Settings'),
        },
      ],
    },
    ...(hasInProgressGame
      ? [
          {
            title: 'IN PROGRESS',
            items: [
              {
                icon: 'scoreboard-outline' as const,
                label: 'Resume Game',
                description: 'Return to the live scoreboard',
                onPress: () => router.navigate('/Scoreboard'),
              },
              {
                icon: 'timeline-clock-outline' as const,
                label: 'Game Timeline',
                description: 'View play-by-play events',
                onPress: () => router.push('/GameTimeline'),
                disabled: !statTrackingEnabled,
              },
              {
                icon: 'chart-bar' as const,
                label: 'View Stats',
                description: 'Live player and team stats',
                onPress: () => router.push('/ViewStats'),
                disabled: !statTrackingEnabled,
              },
            ],
          },
        ]
      : []),
    ...(hasCompletedGame && statTrackingEnabled
      ? [
          {
            title: 'LAST COMPLETED GAME',
            items: [
              {
                icon: 'chart-bar' as const,
                label: 'View Stats',
                description: completedGameSummary,
                onPress: () => router.push('/ViewStats'),
              },
              {
                icon: 'timeline-clock-outline' as const,
                label: 'Game Timeline',
                description: 'Review the play-by-play from the finished game',
                onPress: () => router.push('/GameTimeline'),
              },
            ],
          },
        ]
      : []),
    {
      title: 'DATA',
      items: [
        {
          icon: 'history' as const,
          label: 'Saved Games',
          description: gamesCount > 0 ? `${gamesCount} games saved` : 'No games yet',
          onPress: () => router.push('/SavedGameStats'),
          disabled: gamesCount === 0,
        },
        {
          icon: 'chart-box-outline' as const,
          label: 'Aggregate Stats',
          description: gamesCount > 0 ? 'Combine stats across games' : 'No games yet',
          onPress: () => router.push('/AggregateStats'),
          disabled: gamesCount === 0,
        },
        {
          icon: 'account-group-outline' as const,
          label: 'Manage Team',
          description: `${team1Name}${rosterCount > 0 ? ` • ${rosterCount} players` : ''}`,
          onPress: () =>
            router.push({
              pathname: '/EditRoster',
              params: { teamName: team1Name },
            }),
        },
        ...(currentTeam && rosterCount > 0
          ? [
              {
                icon: 'account-group-outline' as const,
                label: 'Team Line Presets',
                description: 'Create and manage preset lines',
                onPress: () => router.push('/LinePresetEditor'),
              },
            ]
          : []),
      ],
    },
    {
      title: 'HELP',
      items: [
        {
          icon: 'help-circle-outline' as const,
          label: 'Help',
          description: 'Tutorials, legends, privacy',
          onPress: () => router.push('/Help'),
        },
        {
          icon: 'information-outline' as const,
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
      <LegacyGamesDevModal
        visible={legacyGamesModalVisible}
        onClose={() => setLegacyGamesModalVisible(false)}
      />

      <ScreenHeader
        title="DASHBOARD"
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent]}>
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
              {section.title}
            </ThemedText>
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
                      size={metrics.menuItemIconSize}
                      color={item.disabled ? palette.textMuted : palette.accent}
                    />
                  </View>
                  <View style={styles.menuItemText}>
                    <View style={styles.menuItemLabelRow}>
                      <ThemedText
                        style={[
                          styles.menuItemLabel,
                          { color: item.disabled ? palette.textMuted : palette.textInverse },
                        ]}>
                        {item.label}
                      </ThemedText>
                      {item.showBadge && (
                        <View style={[styles.newBadge, { backgroundColor: palette.accent }]}>
                          <ThemedText style={[styles.newBadgeText, { color: palette.primary }]}>
                            New!
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText style={[styles.menuItemDescription, { color: palette.textMuted }]}>
                      {item.disabled ? 'Enable stat tracking first' : item.description}
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={metrics.chevronIconSize}
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
          <MaterialIcons name="discord" size={metrics.bannerIconSize} color={palette.discordText} />
          <View style={styles.discordText}>
            <ThemedText style={[styles.discordTitle, { color: palette.discordText }]}>
              Join the Discord
            </ThemedText>
            <ThemedText style={[styles.discordSubtitle, { color: palette.discordTextMuted }]}>
              Share feedback and give me ideas for new features
            </ThemedText>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={metrics.chevronIconSize}
            color={palette.discordTextMuted}
          />
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
              <MaterialCommunityIcons name="bug" size={metrics.bannerIconSize} color="white" />
              <View style={styles.discordText}>
                <ThemedText style={[styles.discordTitle, { color: 'white' }]}>
                  Reset Version Check
                </ThemedText>
                <ThemedText style={[styles.discordSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
                  DEV ONLY - Reload app after tapping
                </ThemedText>
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
              <MaterialCommunityIcons
                name="gesture-tap-button"
                size={metrics.bannerIconSize}
                color="white"
              />
              <View style={styles.discordText}>
                <ThemedText style={[styles.discordTitle, { color: 'white' }]}>
                  Reset Stats Tutorial
                </ThemedText>
                <ThemedText style={[styles.discordSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
                  DEV ONLY - Reset the has seen flag
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                setLegacyGamesModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.discordBanner,
                { backgroundColor: palette.warning, marginTop: 12 },
                pressed && styles.menuItemPressed,
              ]}>
              <MaterialCommunityIcons
                name="database-import-outline"
                size={metrics.bannerIconSize}
                color={palette.textOnAccent}
              />
              <View style={styles.discordText}>
                <ThemedText style={[styles.discordTitle, { color: palette.textOnAccent }]}>
                  Import Legacy Game JSON
                </ThemedText>
                <ThemedText style={[styles.discordSubtitle, { color: palette.textOnAccent }]}>
                  DEV ONLY - Paste pre-migration saved-game data
                </ThemedText>
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
              <MaterialCommunityIcons name="link-off" size={metrics.bannerIconSize} color="white" />
              <View style={styles.discordText}>
                <ThemedText style={[styles.discordTitle, { color: 'white' }]}>
                  Test 404 Page
                </ThemedText>
                <ThemedText style={[styles.discordSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
                  DEV ONLY - Navigate to non-existent route
                </ThemedText>
              </View>
            </Pressable>
          </>
        )}
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
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: scaleBySizeClass(24, sizeClass),
    },
    section: {
      flex: 1,
      minWidth: scaleBySizeClass(280, sizeClass),
      gap: scaleBySizeClass(12, sizeClass),
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginLeft: scaleBySizeClass(4, sizeClass),
    },
    menuList: {
      gap: scaleBySizeClass(8, sizeClass),
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: scaleBySizeClass(14, sizeClass),
      borderRadius: scaleBySizeClass(14, sizeClass),
      gap: scaleBySizeClass(14, sizeClass),
    },
    menuItemPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    menuItemDisabled: {
      opacity: 0.5,
    },
    iconContainer: {
      width: scaleBySizeClass(42, sizeClass),
      height: scaleBySizeClass(42, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuItemText: {
      flex: 1,
      gap: scaleBySizeClass(2, sizeClass),
    },
    menuItemLabel: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    menuItemLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    newBadge: {
      paddingHorizontal: scaleBySizeClass(6, sizeClass),
      paddingVertical: scaleBySizeClass(2, sizeClass),
      borderRadius: scaleBySizeClass(4, sizeClass),
    },
    newBadgeText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
    },
    menuItemDescription: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
    discordBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: scaleBySizeClass(16, sizeClass),
      borderRadius: scaleBySizeClass(14, sizeClass),
      gap: scaleBySizeClass(14, sizeClass),
      width: '100%',
      marginTop: scaleBySizeClass(8, sizeClass),
    },
    discordText: {
      flex: 1,
      gap: scaleBySizeClass(2, sizeClass),
    },
    discordTitle: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    discordSubtitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    menuItemIconSize: scaleBySizeClass(22, sizeClass),
    chevronIconSize: scaleBySizeClass(22, sizeClass),
    bannerIconSize: scaleBySizeClass(24, sizeClass),
  };
}
