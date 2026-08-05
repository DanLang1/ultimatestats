import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureException } from '@sentry/react-native';
import { router, Stack } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { NewGameSheet } from '@/components/new-game/NewGameSheet';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useActiveGameSession } from '@/hooks/useActiveGameSession';
import { useDashboardSession } from '@/hooks/useDashboardSession';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useNewGameLauncher } from '@/hooks/useNewGameLauncher';
import { useRemoteVersionCheck } from '@/hooks/useRemoteVersionCheck';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/constants';
import { seedTestTeam } from '@/lib/maestroUtils';
import { LAST_DISMISSED_REMOTE_VERSION_KEY } from '@/lib/remoteVersionUtils';
import { LAST_SEEN_VERSION_KEY } from '@/lib/versionUtils';
import { useTutorialStore } from '@/store/tutorialStore';
import { Fonts } from '@/theme/theme';

interface MenuItem {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  showBadge?: boolean;
  testID?: string;
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
  const { resetStatsTutorial } = useTutorialStore();
  const {
    isNewGameSheetVisible,
    activeGameKind,
    openNewGameSheet,
    closeNewGameSheet,
    startBasicGame,
    startAdvancedGame,
    startScrimmage,
  } = useNewGameLauncher();
  const activeSession = useActiveGameSession();
  const { hasNewVersion } = useVersionCheck();
  const { hasUpdate: hasRemoteUpdate, dismiss: dismissRemoteUpdate } = useRemoteVersionCheck();
  const {
    currentTeam,
    statTrackingEnabled,
    team1Name,
    rosterCount,
    gamesCount,
    sessionStatus,
    hasCompletedGame,
    completedGameSummary,
  } = useDashboardSession();
  const hasActiveAdvancedGame = activeSession.kind === 'advanced';
  const hasActiveBasicGame = activeSession.kind === 'basic';
  const hasLiveGame = activeSession.kind !== 'none';

  const handleRemoteUpdatePress = async () => {
    const updateUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
    const [dismissResult, openResult] = await Promise.allSettled([
      dismissRemoteUpdate(),
      Linking.openURL(updateUrl),
    ]);

    if (dismissResult.status === 'rejected') {
      console.error('Failed to dismiss app update', dismissResult.reason);
    }
    if (openResult.status === 'rejected') {
      console.error('Failed to open app update', openResult.reason);
    }
  };

  const handleResetVersionCheck = async () => {
    try {
      await AsyncStorage.removeItem(LAST_SEEN_VERSION_KEY);
      console.log('Version check reset - reload app to see badge');
    } catch (error) {
      console.error('Failed to reset version check', error);
    }
  };

  const handleResetRemoteVersionCheck = async () => {
    try {
      await AsyncStorage.removeItem(LAST_DISMISSED_REMOTE_VERSION_KEY);
    } catch (error) {
      console.error('Failed to reset remote version check', error);
    }
  };

  const sections: MenuSection[] = [
    {
      title: 'GAME SETUP',
      items: [
        {
          icon: 'plus-circle-outline' as const,
          label: 'New Game',
          description: (() => {
            if (hasLiveGame) {
              return 'Leave the current game and start a fresh one';
            }
            if (sessionStatus === 'finished') {
              return statTrackingEnabled
                ? 'Completed game is saved. Clear the scoreboard and start fresh'
                : 'Clear the completed scoreboard and start fresh';
            }
            return 'Open a fresh scoreboard and start tracking';
          })(),
          onPress: openNewGameSheet,
          testID: 'dashboard-new-game-button',
        },
        {
          icon: 'cog-outline' as const,
          label: 'App Settings',
          description: 'Teams, colors, display, player preferences',
          onPress: () => router.push('/Settings'),
        },
      ],
    },
    ...(hasLiveGame
      ? [
          {
            title: 'IN PROGRESS',
            items: [
              {
                icon: 'scoreboard-outline' as const,
                label: 'Resume Game',
                description: hasActiveAdvancedGame
                  ? 'Return to the advanced tracker'
                  : 'Return to the live scoreboard',
                onPress: () => router.navigate(activeSession.route),
                testID: 'dashboard-resume-game-button',
              },
              ...(hasActiveAdvancedGame
                ? []
                : [
                    {
                      icon: 'timeline-clock-outline' as const,
                      label: 'Game Timeline',
                      description: 'View play-by-play events',
                      onPress: () => router.push('/GameTimeline'),
                      disabled: !hasActiveBasicGame || !statTrackingEnabled,
                    },
                    {
                      icon: 'chart-bar' as const,
                      label: 'View Stats',
                      description: 'Live player and team stats',
                      onPress: () => router.push('/ViewStats'),
                      disabled: !hasActiveBasicGame || !statTrackingEnabled,
                    },
                  ]),
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
      title: 'EXPLORE',
      items: [
        {
          icon: 'trophy-outline' as const,
          label: 'Showcase (Beta)',
          description: 'Browse and import popular games',
          onPress: () => router.push('/Showcase'),
        },
        {
          icon: 'tshirt-crew-outline' as const,
          label: 'Partners',
          description: 'Checkout DH Ultimate',
          onPress: () => {
            router.push('/Partners');
          },
        },
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
      <NewGameSheet
        visible={isNewGameSheetVisible}
        activeGameKind={activeGameKind}
        onClose={closeNewGameSheet}
        onStartBasic={startBasicGame}
        onStartAdvanced={startAdvancedGame}
        onStartScrimmage={startScrimmage}
      />

      <ScreenHeader
        title="DASHBOARD"
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent]}>
        {hasRemoteUpdate && (
          <Pressable
            onPress={handleRemoteUpdatePress}
            style={({ pressed }) => [
              styles.updateBanner,
              {
                backgroundColor: palette.accentOverlay10,
                borderColor: palette.accentOverlay30,
              },
              pressed && styles.menuItemPressed,
            ]}>
            <MaterialCommunityIcons
              name="download-circle-outline"
              size={metrics.bannerIconSize}
              color={palette.accent}
            />
            <View style={styles.updateBannerText}>
              <ThemedText style={[styles.updateBannerTitle, { color: palette.accent }]}>
                New Version Available
              </ThemedText>
              <ThemedText style={[styles.updateBannerSubtitle, { color: palette.textMuted }]}>
                Tap to update
              </ThemedText>
            </View>
            <Pressable onPress={dismissRemoteUpdate} hitSlop={8}>
              <MaterialCommunityIcons
                name="close"
                size={metrics.bannerIconSize}
                color={palette.textMuted}
              />
            </Pressable>
          </Pressable>
        )}

        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
              {section.title}
            </ThemedText>
            <View style={styles.menuList}>
              {section.items.map((item, index) => (
                <Pressable
                  key={index}
                  testID={item.testID}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
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
                          {
                            color: item.disabled ? palette.textMuted : palette.textInverse,
                          },
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
                captureException(new Error('U-Stat Sentry test error'));
              }}
              style={({ pressed }) => [
                styles.discordBanner,
                { backgroundColor: palette.danger },
                pressed && styles.menuItemPressed,
              ]}>
              <MaterialCommunityIcons
                name="bug-outline"
                size={metrics.bannerIconSize}
                color={palette.textOnAccent}
              />
              <View style={styles.discordText}>
                <ThemedText style={[styles.discordTitle, { color: palette.textOnAccent }]}>
                  Send Test Sentry Error
                </ThemedText>
                <ThemedText style={[styles.discordSubtitle, { color: palette.textOnAccentMuted }]}>
                  DEV ONLY - Sends a test exception to Sentry
                </ThemedText>
              </View>
            </Pressable>
            <Pressable
              onPress={seedTestTeam}
              style={({ pressed }) => [
                styles.discordBanner,
                { backgroundColor: palette.success, marginTop: 12 },
                pressed && styles.menuItemPressed,
              ]}>
              <MaterialCommunityIcons
                name="seed-outline"
                size={metrics.bannerIconSize}
                color={palette.textOnAccent}
              />
              <View style={styles.discordText}>
                <ThemedText style={[styles.discordTitle, { color: palette.textOnAccent }]}>
                  Seed Test Team
                </ThemedText>
                <ThemedText style={[styles.discordSubtitle, { color: palette.textOnAccentMuted }]}>
                  DEV ONLY - Creates Zoboomafoo with 7 test players
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              onPress={handleResetVersionCheck}
              style={({ pressed }) => [
                styles.discordBanner,
                { backgroundColor: palette.danger },
                pressed && styles.menuItemPressed,
              ]}>
              <MaterialCommunityIcons
                name="bug"
                size={metrics.bannerIconSize}
                color={palette.textOnAccent}
              />
              <View style={styles.discordText}>
                <ThemedText style={[styles.discordTitle, { color: palette.textOnAccent }]}>
                  Reset Version Check
                </ThemedText>
                <ThemedText style={[styles.discordSubtitle, { color: palette.textOnAccentMuted }]}>
                  DEV ONLY - Reload app after tapping
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              onPress={handleResetRemoteVersionCheck}
              style={({ pressed }) => [
                styles.discordBanner,
                { backgroundColor: palette.danger },
                pressed && styles.menuItemPressed,
              ]}>
              <MaterialCommunityIcons
                name="cloud-refresh"
                size={metrics.bannerIconSize}
                color={palette.textOnAccent}
              />
              <View style={styles.discordText}>
                <ThemedText style={[styles.discordTitle, { color: palette.textOnAccent }]}>
                  Reset Remote Version Check
                </ThemedText>
                <ThemedText style={[styles.discordSubtitle, { color: palette.textOnAccentMuted }]}>
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
                color={palette.textOnAccent}
              />
              <View style={styles.discordText}>
                <ThemedText style={[styles.discordTitle, { color: palette.textOnAccent }]}>
                  Reset Stats Tutorial
                </ThemedText>
                <ThemedText style={[styles.discordSubtitle, { color: palette.textOnAccentMuted }]}>
                  DEV ONLY - Reset the has seen flag
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                useTutorialStore.setState({ hasSeenShowcaseHint: false });
              }}
              style={({ pressed }) => [
                styles.discordBanner,
                { backgroundColor: palette.danger, marginTop: 12 },
                pressed && styles.menuItemPressed,
              ]}>
              <MaterialCommunityIcons
                name="trophy-outline"
                size={metrics.bannerIconSize}
                color={palette.textOnAccent}
              />
              <View style={styles.discordText}>
                <ThemedText style={[styles.discordTitle, { color: palette.textOnAccent }]}>
                  Reset Showcase Hint
                </ThemedText>
                <ThemedText style={[styles.discordSubtitle, { color: palette.textOnAccentMuted }]}>
                  DEV ONLY - Show hint banner on Stats page again
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                // dev testing, typecast fine so we can throw 404 manually
                router.push('/this-route-does-not-exist' as never); // eslint-disable-line
              }}
              style={({ pressed }) => [
                styles.discordBanner,
                { backgroundColor: palette.warning, marginTop: 12 },
                pressed && styles.menuItemPressed,
              ]}>
              <MaterialCommunityIcons
                name="link-off"
                size={metrics.bannerIconSize}
                color={palette.textOnAccent}
              />
              <View style={styles.discordText}>
                <ThemedText style={[styles.discordTitle, { color: palette.textOnAccent }]}>
                  Test 404 Page
                </ThemedText>
                <ThemedText style={[styles.discordSubtitle, { color: palette.textOnAccentMuted }]}>
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
    updateBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: scaleBySizeClass(16, sizeClass),
      borderRadius: scaleBySizeClass(14, sizeClass),
      gap: scaleBySizeClass(14, sizeClass),
      width: '100%',
      borderWidth: 1,
    },
    updateBannerText: {
      flex: 1,
      gap: scaleBySizeClass(2, sizeClass),
    },
    updateBannerTitle: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    updateBannerSubtitle: {
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
