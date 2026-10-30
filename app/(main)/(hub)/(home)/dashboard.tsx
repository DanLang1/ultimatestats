import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons, {
  type MaterialDesignIconsIconName,
} from '@react-native-vector-icons/material-design-icons/static';
import { captureException } from '@sentry/react-native';
import { router, Stack } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { NewGameSheet } from '@/components/new-game/NewGameSheet';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { DiscordIcon } from '@/components/ui/DiscordIcon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { resumeGameSession, useActiveGameSession } from '@/hooks/useActiveGameSession';
import { useDashboardSession } from '@/hooks/useDashboardSession';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useNewGameLauncher } from '@/hooks/useNewGameLauncher';
import { useRemoteVersionCheck } from '@/hooks/useRemoteVersionCheck';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { APP_STORE_URL, DISCORD_URL, PLAY_STORE_URL } from '@/lib/constants';
import { seedTestTeam } from '@/lib/maestroUtils';
import { LAST_DISMISSED_REMOTE_VERSION_KEY } from '@/lib/remoteVersionUtils';
import { reportError } from '@/lib/sentry';
import { pluralize } from '@/lib/utils';
import { LAST_SEEN_VERSION_KEY } from '@/lib/versionUtils';
import { useTutorialStore } from '@/store/tutorialStore';
import { Fonts } from '@/theme/theme';

interface MenuItem {
  icon: MaterialDesignIconsIconName;
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

const CONTENT_PADDING = 24;
const SECTION_GAP = 24;
const SECTION_MIN_WIDTH = 280;
const DESCRIPTION_LINE_HEIGHT = 16;
const DESCRIPTION_MAX_LINES = 2;

export default function DashboardScreen() {
  const { palette } = useTheme();
  const { sizeClass, width } = useLayout();
  const styles = createStyles(sizeClass, isMultiColumnDashboard(width, sizeClass));
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
    sessionStatus,
    currentGameId,
    hasCompletedGame,
    completedGameSummary,
  } = useDashboardSession();
  // Only a game that has been ended at least once has a saved record to open.
  const lastCompletedGameId = hasCompletedGame && statTrackingEnabled ? currentGameId : null;
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
      reportError('remote-update-dismiss', dismissResult.reason);
    }
    if (openResult.status === 'rejected') {
      reportError('remote-update-open', openResult.reason);
    }
  };

  const handleResetVersionCheck = async () => {
    try {
      await AsyncStorage.removeItem(LAST_SEEN_VERSION_KEY);
      console.log('Version check reset - reload app to see badge');
    } catch (error) {
      reportError('version-check-reset', error);
    }
  };

  const handleResetRemoteVersionCheck = async () => {
    try {
      await AsyncStorage.removeItem(LAST_DISMISSED_REMOTE_VERSION_KEY);
    } catch (error) {
      reportError('remote-version-check-reset', error);
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
          description: 'Colors, display, player preferences',
          onPress: () => router.push('/settings'),
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
                onPress: () => resumeGameSession(activeSession),
                testID: 'dashboard-resume-game-button',
              },
              ...(hasActiveAdvancedGame
                ? []
                : [
                    {
                      icon: 'timeline-clock-outline' as const,
                      label: 'Game Timeline',
                      description: 'View play-by-play events',
                      onPress: () => router.push('/live-stats/timeline'),
                      disabled: !hasActiveBasicGame || !statTrackingEnabled,
                    },
                    {
                      icon: 'chart-bar' as const,
                      label: 'View Stats',
                      description: 'Live player and team stats',
                      onPress: () => router.push('/live-stats'),
                      disabled: !hasActiveBasicGame || !statTrackingEnabled,
                    },
                  ]),
            ],
          },
        ]
      : []),
    ...(lastCompletedGameId !== null
      ? [
          {
            title: 'LAST COMPLETED GAME',
            items: [
              {
                icon: 'chart-bar' as const,
                label: 'View Stats',
                description: completedGameSummary,
                onPress: () =>
                  router.push({
                    pathname: '/saved-games/[gameId]',
                    params: { gameId: lastCompletedGameId },
                  }),
              },
              {
                icon: 'timeline-clock-outline' as const,
                label: 'Game Timeline',
                description: 'Review the play-by-play from the finished game',
                onPress: () =>
                  router.push({
                    pathname: '/game-timeline',
                    params: { gameId: lastCompletedGameId },
                  }),
              },
            ],
          },
        ]
      : []),
    {
      title: 'DATA',
      items: [
        {
          icon: 'account-group-outline' as const,
          label: 'Manage Team',
          description: `${team1Name}${rosterCount > 0 ? ` • ${rosterCount} ${pluralize(rosterCount, 'player', 'players')}` : ''}`,
          onPress: () =>
            router.push({
              pathname: '/edit-roster',
              params: { teamName: team1Name },
            }),
        },
        ...(currentTeam && rosterCount > 0
          ? [
              {
                icon: 'account-group-outline' as const,
                label: 'Team Line Presets',
                description: 'Create and manage preset lines',
                onPress: () => router.push('/line-preset-editor'),
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
          onPress: () => router.push('/showcase'),
        },
        {
          icon: 'tshirt-crew-outline' as const,
          label: 'Partners',
          description: 'Checkout DH Ultimate',
          onPress: () => {
            router.push('/partners');
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
          onPress: () => router.push('/help'),
          testID: 'dashboard-help-button',
        },
        {
          icon: 'information-outline' as const,
          label: 'About',
          description: 'Version info & changelog',
          onPress: () => router.push('/about'),
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
                    <ThemedText
                      numberOfLines={DESCRIPTION_MAX_LINES}
                      style={[styles.menuItemDescription, { color: palette.textMuted }]}>
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

        <Pressable
          onPress={() => Linking.openURL(DISCORD_URL)}
          style={({ pressed }) => [
            styles.discordBanner,
            { backgroundColor: palette.discordBg },
            pressed && styles.menuItemPressed,
          ]}>
          <DiscordIcon size={metrics.bannerIconSize} color={palette.discordText} />
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

        {__DEV__ && (
          <>
            <Pressable
              onPress={() => router.push('/__dev_crash__')}
              style={({ pressed }) => [
                styles.discordBanner,
                { backgroundColor: palette.danger },
                pressed && styles.menuItemPressed,
              ]}>
              <MaterialCommunityIcons
                name="alert-octagon"
                size={metrics.bannerIconSize}
                color={palette.textOnAccent}
              />
              <View style={styles.discordText}>
                <ThemedText style={[styles.discordTitle, { color: palette.textOnAccent }]}>
                  Open Crashing Screen
                </ThemedText>
                <ThemedText style={[styles.discordSubtitle, { color: palette.textOnAccentMuted }]}>
                  DEV ONLY - Screen throws on render; tests Go to Dashboard
                </ThemedText>
              </View>
            </Pressable>

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
                useTutorialStore.setState({
                  hasSeenOnboarding: false,
                  hasSeenAdvancedTutorial: false,
                });
              }}
              style={({ pressed }) => [
                styles.discordBanner,
                { backgroundColor: palette.danger, marginTop: 12 },
                pressed && styles.menuItemPressed,
              ]}>
              <MaterialCommunityIcons
                name="restart"
                size={metrics.bannerIconSize}
                color={palette.textOnAccent}
              />
              <View style={styles.discordText}>
                <ThemedText style={[styles.discordTitle, { color: palette.textOnAccent }]}>
                  Reset Intro Tutorials
                </ThemedText>
                <ThemedText style={[styles.discordSubtitle, { color: palette.textOnAccentMuted }]}>
                  DEV ONLY - Reload app to start from the first tutorial
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

// Sections wrap into columns once two fit side by side.
function isMultiColumnDashboard(width: number, sizeClass: SizeClass): boolean {
  const contentWidth = width - scaleBySizeClass(CONTENT_PADDING, sizeClass) * 2;
  const twoSectionsWidth =
    scaleBySizeClass(SECTION_MIN_WIDTH, sizeClass) * 2 + scaleBySizeClass(SECTION_GAP, sizeClass);
  return contentWidth >= twoSectionsWidth;
}

function createStyles(sizeClass: SizeClass, isMultiColumn: boolean) {
  const descriptionLineHeight = scaleBySizeClass(DESCRIPTION_LINE_HEIGHT, sizeClass);
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: scaleBySizeClass(CONTENT_PADDING, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: scaleBySizeClass(SECTION_GAP, sizeClass),
    },
    section: {
      flex: 1,
      minWidth: scaleBySizeClass(SECTION_MIN_WIDTH, sizeClass),
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
      // Side-by-side columns reserve both lines so cards stay the same height across columns.
      ...(isMultiColumn
        ? {
            lineHeight: descriptionLineHeight,
            minHeight: descriptionLineHeight * DESCRIPTION_MAX_LINES,
          }
        : {}),
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
