import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { captureException } from '@sentry/react-native';
import { router, Stack } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import DashboardIdleHero from '@/components/dashboard/DashboardIdleHero';
import DashboardLiveHero from '@/components/dashboard/DashboardLiveHero';
import DashboardRow from '@/components/dashboard/DashboardRow';
import DashboardSection from '@/components/dashboard/DashboardSection';
import { NewGameSheet } from '@/components/new-game/NewGameSheet';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { DiscordIcon } from '@/components/ui/DiscordIcon';
import {
  type ResponsiveHeaderAction,
  ResponsiveHeaderActions,
} from '@/components/ui/ResponsiveHeaderActions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import SavedGameResultRow from '@/components/view-stats/SavedGameResultRow';
import { useTheme } from '@/context/ThemeContext';
import { resumeGameSession, useActiveGameSession } from '@/hooks/useActiveGameSession';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useMostRecentSavedGame } from '@/hooks/useMostRecentSavedGame';
import { useNewGameLauncher } from '@/hooks/useNewGameLauncher';
import { useRemoteVersionCheck } from '@/hooks/useRemoteVersionCheck';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { APP_STORE_URL, DISCORD_URL, PLAY_STORE_URL } from '@/lib/constants';
import { formatDayTitle } from '@/lib/dateUtils';
import type { GameListItem } from '@/lib/gameListUtils';
import { seedTestTeam } from '@/lib/maestroUtils';
import { LAST_DISMISSED_REMOTE_VERSION_KEY } from '@/lib/remoteVersionUtils';
import { reportError } from '@/lib/sentry';
import { LAST_SEEN_VERSION_KEY } from '@/lib/versionUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { useTutorialStore } from '@/store/tutorialStore';
import { Fonts } from '@/theme/theme';

const CONTENT_PADDING = 24;
const SECTION_GAP = 24;
const SECTION_MIN_WIDTH = 280;

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
  const statTrackingEnabled = useGameStore((state) => state.statTrackingEnabled);
  const team1Name = useGameStore((state) => state.currentTeam.name);
  const rosterCount = useGameStore((state) => state.currentTeam.roster.length);
  const mostRecentGame = useMostRecentSavedGame();
  const hasActiveBasicGame = activeSession.kind === 'basic';
  const hasLiveGame = activeSession.kind !== 'none';
  // A live game takes over the hero, so the last result only shows between games.
  const lastGame = hasLiveGame ? null : mostRecentGame;

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

  // Saved stats screens live in the Stats tab; the origin sends their Back here, not to its list.
  const handleOpenLastGame = (game: GameListItem) => {
    if (game.kind === 'advanced') {
      router.push({
        pathname: '/advanced-tracking/analytics/[gameId]',
        params: { gameId: game.id, from: 'dashboard' },
      });
      return;
    }
    router.push({
      pathname: '/saved-games/[gameId]',
      params: { gameId: game.id, from: 'dashboard' },
    });
  };

  const hasLiveGameStats = hasActiveBasicGame && statTrackingEnabled;
  const hasLinePresets = rosterCount > 0;
  const moreRows = [
    // While a game is live, Resume is the primary action and starting over drops down here.
    ...(hasLiveGame
      ? [
          {
            label: 'Start a new game',
            onPress: openNewGameSheet,
            testID: 'dashboard-new-game-button',
          },
        ]
      : []),
    {
      label: 'Settings',
      onPress: () => router.push('/settings'),
      testID: 'dashboard-settings-button',
    },
    { label: 'Help', onPress: () => router.push('/help'), testID: 'dashboard-help-button' },
    { label: 'About', onPress: () => router.push('/about'), showDot: hasNewVersion },
  ];
  const headerActions: ResponsiveHeaderAction[] = [
    {
      key: 'settings',
      label: 'Settings',
      onPress: () => router.push('/settings'),
      inlineIcon: (
        <MaterialCommunityIcons
          name="cog-outline"
          size={scaleBySizeClass(24, sizeClass)}
          color={palette.textMuted}
        />
      ),
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
        rightSlot={<ResponsiveHeaderActions actions={headerActions} />}
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
              pressed && styles.pressed,
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

        <View style={styles.hero}>
          {hasLiveGame ? (
            <DashboardLiveHero onResume={() => resumeGameSession(activeSession)} />
          ) : (
            <DashboardIdleHero
              teamName={team1Name}
              rosterCount={rosterCount}
              onStartGame={openNewGameSheet}
            />
          )}
        </View>

        {lastGame != null && (
          <DashboardSection title="Last game" style={styles.section}>
            <SavedGameResultRow
              game={lastGame}
              detailLabel={formatDayTitle(lastGame.timestamp)}
              showDivider={false}
              selectionMode={false}
              onPress={() => handleOpenLastGame(lastGame)}
            />
          </DashboardSection>
        )}

        <DashboardSection title="Stats" style={styles.section}>
          {hasLiveGameStats && (
            <DashboardRow
              testID="dashboard-live-stats-button"
              label="Live game stats"
              isLive
              showDivider
              onPress={() => router.push('/live-stats')}
            />
          )}
          <DashboardRow
            testID="dashboard-saved-games-button"
            label="Saved games"
            showDivider={false}
            onPress={() => router.navigate('/stats')}
          />
        </DashboardSection>

        <DashboardSection title="Team" style={styles.section}>
          <DashboardRow
            testID="dashboard-roster-button"
            label="Roster"
            showDivider={hasLinePresets}
            onPress={() =>
              router.push({ pathname: '/edit-roster', params: { teamName: team1Name } })
            }
          />
          {hasLinePresets && (
            <DashboardRow
              testID="dashboard-line-presets-button"
              label="Lines"
              showDivider={false}
              onPress={() => router.push('/line-preset-editor')}
            />
          )}
        </DashboardSection>

        <DashboardSection title="Explore" style={styles.section}>
          <DashboardRow label="Showcase" showDivider onPress={() => router.push('/showcase')} />
          <DashboardRow
            label="Partners"
            showDivider={false}
            onPress={() => router.push('/partners')}
          />
        </DashboardSection>

        <DashboardSection title="More" style={styles.section}>
          {moreRows.map((row, index) => (
            <DashboardRow
              key={row.label}
              testID={row.testID}
              label={row.label}
              showDot={row.showDot}
              showDivider={index < moreRows.length - 1}
              onPress={row.onPress}
            />
          ))}
        </DashboardSection>

        <Pressable
          onPress={() => Linking.openURL(DISCORD_URL)}
          style={({ pressed }) => [
            styles.discordBanner,
            { backgroundColor: palette.discordBg },
            pressed && styles.pressed,
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
                pressed && styles.pressed,
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
                  DEV ONLY - Screen throws on render; tests error recovery
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
                pressed && styles.pressed,
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
                pressed && styles.pressed,
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
                pressed && styles.pressed,
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
                pressed && styles.pressed,
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
                pressed && styles.pressed,
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
                pressed && styles.pressed,
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
                pressed && styles.pressed,
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
      padding: scaleBySizeClass(CONTENT_PADDING, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: scaleBySizeClass(SECTION_GAP, sizeClass),
    },
    // Sections wrap into side-by-side columns once two fit; the hero always spans the row.
    hero: {
      width: '100%',
    },
    section: {
      flex: 1,
      minWidth: scaleBySizeClass(SECTION_MIN_WIDTH, sizeClass),
    },
    pressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
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
    chevronIconSize: scaleBySizeClass(22, sizeClass),
    bannerIconSize: scaleBySizeClass(24, sizeClass),
  };
}
