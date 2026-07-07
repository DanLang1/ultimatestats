import { HalfIndicator } from '@/components/basic/game-info/HalfIndicator';
import HelpContent from '@/components/HelpContent';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AlertModal } from '@/components/ui/AlertModal';
import { useAlert } from '@/components/ui/AlertProvider';
import FlashingIcon from '@/components/ui/FlashingIcon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useEndGame } from '@/hooks/basic/useEndGame';
import { useGameTimer } from '@/hooks/basic/useGameTimer';
import { useHalftimeEarly } from '@/hooks/basic/useHalftimeEarly';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { usePointTimer } from '@/hooks/basic/usePointTimer';
import { formatRatioFull, getExpectedRatio, getSequenceNumber } from '@/lib/genderRatioUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function GameInfoScreen() {
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const {
    gameTo,
    currentTeam,
    team2Name,
    team1Timeouts,
    team2Timeouts,
    team1Floater,
    team2Floater,
    floaterEnabled,
    team1Score,
    team2Score,
    isSoftCap,
    softCapPending,
    statTrackingEnabled,
    currentPoint,
    gameHalf,
  } = useGameStore();

  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();

  const [showAbbaModal, setShowAbbaModal] = useState(false);

  const team1Name = currentTeam.name;

  const { timeLeft } = useGameTimer();
  const isHardcap = timeLeft === 0;

  const { palette } = useTheme();
  const { showAlert } = useAlert();
  const { confirmEndGame } = useEndGame();
  const { canTriggerHalftimeEarly, confirmHalftimeEarly } = useHalftimeEarly();
  const {
    elapsedSeconds,
    isActive: pointIsActive,
    isPaused,
    togglePause,
    isEnabled: pointTimerEnabled,
    restart: restartPointTimer,
  } = usePointTimer();

  const countTimeoutsRemaining = (timeouts: boolean[]) => timeouts.filter((t) => t).length;

  // Format elapsed seconds as MM:SS
  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format compact timeout/floater string
  const formatTimeoutStats = (timeouts: boolean[], hasFloater: boolean) => {
    const toCount = countTimeoutsRemaining(timeouts);
    const toText = `${toCount} TO`;
    if (!floaterEnabled) return toText;
    return hasFloater ? `${toText} • 1 Floater` : `${toText} • 0 Floater`;
  };

  const confirmRestartPointTimer = () => {
    showAlert({
      title: 'Restart Point Timer?',
      message: 'This will reset the timer for the current point back to 0:00.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', style: 'destructive', onPress: restartPointTimer },
      ],
    });
  };

  const showPointTimer = pointTimerEnabled && pointIsActive;
  const hardcapIconSize = scaleBySizeClass(18, sizeClass);
  const universeIconSize = scaleBySizeClass(20, sizeClass);
  const softcapIconSize = scaleBySizeClass(16, sizeClass);
  const pointTimerControlIconSize = scaleBySizeClass(24, sizeClass);
  const pointTimerRestartIconSize = scaleBySizeClass(22, sizeClass);
  const ratioInfoIconSize = scaleBySizeClass(18, sizeClass);
  const actionIconSize = scaleBySizeClass(20, sizeClass);

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="MATCH STATUS"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        rightSlot={
          <Pressable
            onPress={() => router.push('/GameFormat')}
            style={({ pressed }) => [
              styles.headerIconButton,
              { backgroundColor: palette.overlay10 },
              pressed && styles.headerIconButtonPressed,
            ]}
            hitSlop={12}>
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={actionIconSize}
              color={palette.textInverse}
            />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={[styles.scrollContent]}>
        {isLandscape ? (
          /* Landscape: Three-Column Hero Section */
          <View key="hero-landscape" style={styles.heroSection}>
            <View style={styles.teamColumn}>
              <ThemedText
                style={[styles.teamColumnName, { color: palette.textMuted }]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {team1Name}
              </ThemedText>
              <ThemedText style={[styles.teamColumnScore, { color: palette.textInverse }]}>
                {team1Score}
              </ThemedText>
              <ThemedText style={[styles.teamColumnStats, { color: palette.textMuted }]}>
                {formatTimeoutStats(team1Timeouts, team1Floater)}
              </ThemedText>
            </View>

            <View style={styles.centerColumn}>
              {isHardcap ? (
                <>
                  <View style={styles.hardcapLabelRow}>
                    <MaterialCommunityIcons
                      name="hard-hat"
                      size={hardcapIconSize}
                      color={palette.accent}
                    />
                    <ThemedText style={[styles.centerLabel, { color: palette.accent }]}>
                      HARDCAP
                    </ThemedText>
                  </View>
                  {team1Score === team2Score ? (
                    <View style={styles.capStatusBadge}>
                      <MaterialCommunityIcons
                        name="sword-cross"
                        size={universeIconSize}
                        color={palette.textInverse}
                      />
                      <ThemedText
                        style={[styles.universePointText, { color: palette.textInverse }]}>
                        Universe Point
                      </ThemedText>
                    </View>
                  ) : (
                    <>
                      {(() => {
                        const leadingTeam = team1Score > team2Score ? team1Name : team2Name;
                        const trailingTeam = team1Score > team2Score ? team2Name : team1Name;
                        const scoreDiff = Math.abs(team1Score - team2Score);
                        const canTie = scoreDiff === 1;
                        return (
                          <>
                            <ThemedText
                              style={[styles.hardcapWinnerText, { color: palette.textInverse }]}>
                              {leadingTeam}
                            </ThemedText>
                            <ThemedText
                              style={[styles.capStatusText, { color: palette.textMuted }]}>
                              {canTie
                                ? `wins unless ${trailingTeam} scores`
                                : 'wins after this point'}
                            </ThemedText>
                          </>
                        );
                      })()}
                    </>
                  )}
                </>
              ) : (
                <>
                  <ThemedText style={[styles.centerLabel, { color: palette.accent }]}>
                    GAME TO
                  </ThemedText>
                  <ThemedText style={[styles.centerNumber, { color: palette.textInverse }]}>
                    {gameTo}
                  </ThemedText>
                  <HalfIndicator gameHalf={gameHalf} />
                  {isSoftCap && (
                    <View style={styles.capStatusBadge}>
                      <MaterialCommunityIcons
                        name="hat-fedora"
                        size={softcapIconSize}
                        color={palette.textInverse}
                      />
                      <ThemedText style={[styles.capStatusText, { color: palette.textInverse }]}>
                        Softcap Active
                      </ThemedText>
                    </View>
                  )}
                  {softCapPending && !isSoftCap && (
                    <View style={styles.capStatusBadge}>
                      <FlashingIcon
                        name="hat-fedora"
                        size={softcapIconSize}
                        color={palette.textInverse}
                        isFlashing
                      />
                      <ThemedText style={[styles.capStatusText, { color: palette.textInverse }]}>
                        Softcap Pending
                      </ThemedText>
                    </View>
                  )}
                </>
              )}

              {showPointTimer && (
                <View style={styles.pointTimerContainer}>
                  <View
                    style={[styles.pointTimerDivider, { backgroundColor: palette.overlay10 }]}
                  />
                  <ThemedText style={[styles.centerLabel, { color: palette.accent }]}>
                    POINT LENGTH
                  </ThemedText>
                  <View style={styles.pointTimerRow}>
                    <Pressable onPress={togglePause} hitSlop={8}>
                      <MaterialCommunityIcons
                        name={isPaused ? 'play' : 'pause'}
                        size={pointTimerControlIconSize}
                        color={isPaused ? palette.warning : palette.textMuted}
                      />
                    </Pressable>
                    <ThemedText
                      style={[
                        styles.pointTimerValue,
                        { color: isPaused ? palette.warning : palette.textInverse },
                      ]}>
                      {formatElapsed(elapsedSeconds)}
                    </ThemedText>
                    {isPaused && (
                      <Pressable onPress={confirmRestartPointTimer} hitSlop={8}>
                        <MaterialCommunityIcons
                          name="restart"
                          size={pointTimerRestartIconSize}
                          color={palette.textMuted}
                        />
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.teamColumn}>
              <ThemedText
                style={[styles.teamColumnName, { color: palette.textMuted }]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {team2Name}
              </ThemedText>
              <ThemedText style={[styles.teamColumnScore, { color: palette.textInverse }]}>
                {team2Score}
              </ThemedText>
              <ThemedText style={[styles.teamColumnStats, { color: palette.textMuted }]}>
                {formatTimeoutStats(team2Timeouts, team2Floater)}
              </ThemedText>
            </View>
          </View>
        ) : (
          /* Portrait: Score row on top, game status below */
          <View key="hero-portrait">
            {/* Score Row */}
            <View style={styles.scoreRow}>
              <View style={styles.scoreTeam}>
                <ThemedText
                  style={[styles.teamColumnName, { color: palette.textMuted }]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {team1Name}
                </ThemedText>
                <ThemedText style={[styles.teamColumnScore, { color: palette.textInverse }]}>
                  {team1Score}
                </ThemedText>
                <ThemedText style={[styles.teamColumnStats, { color: palette.textMuted }]}>
                  {formatTimeoutStats(team1Timeouts, team1Floater)}
                </ThemedText>
              </View>

              <ThemedText style={[styles.scoreDivider, { color: palette.textMuted }]}>–</ThemedText>

              <View style={styles.scoreTeam}>
                <ThemedText
                  style={[styles.teamColumnName, { color: palette.textMuted }]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {team2Name}
                </ThemedText>
                <ThemedText style={[styles.teamColumnScore, { color: palette.textInverse }]}>
                  {team2Score}
                </ThemedText>
                <ThemedText style={[styles.teamColumnStats, { color: palette.textMuted }]}>
                  {formatTimeoutStats(team2Timeouts, team2Floater)}
                </ThemedText>
              </View>
            </View>

            {/* Game Status Below */}
            <View style={styles.gameStatusSection}>
              {isHardcap ? (
                <>
                  <View style={styles.hardcapLabelRow}>
                    <MaterialCommunityIcons
                      name="hard-hat"
                      size={hardcapIconSize}
                      color={palette.accent}
                    />
                    <ThemedText style={[styles.centerLabel, { color: palette.accent }]}>
                      HARDCAP
                    </ThemedText>
                  </View>
                  {team1Score === team2Score ? (
                    <View style={styles.capStatusBadge}>
                      <MaterialCommunityIcons
                        name="sword-cross"
                        size={universeIconSize}
                        color={palette.textInverse}
                      />
                      <ThemedText
                        style={[styles.universePointText, { color: palette.textInverse }]}>
                        Universe Point
                      </ThemedText>
                    </View>
                  ) : (
                    <>
                      {(() => {
                        const leadingTeam = team1Score > team2Score ? team1Name : team2Name;
                        const trailingTeam = team1Score > team2Score ? team2Name : team1Name;
                        const scoreDiff = Math.abs(team1Score - team2Score);
                        const canTie = scoreDiff === 1;
                        return (
                          <>
                            <ThemedText
                              style={[styles.hardcapWinnerText, { color: palette.textInverse }]}>
                              {leadingTeam}
                            </ThemedText>
                            <ThemedText
                              style={[styles.capStatusText, { color: palette.textMuted }]}>
                              {canTie
                                ? `wins unless ${trailingTeam} scores`
                                : 'wins after this point'}
                            </ThemedText>
                          </>
                        );
                      })()}
                    </>
                  )}
                </>
              ) : (
                <>
                  <ThemedText style={[styles.centerLabel, { color: palette.accent }]}>
                    GAME TO
                  </ThemedText>
                  <ThemedText style={[styles.centerNumber, { color: palette.textInverse }]}>
                    {gameTo}
                  </ThemedText>
                  <HalfIndicator gameHalf={gameHalf} />
                  {isSoftCap && (
                    <View style={styles.capStatusBadge}>
                      <MaterialCommunityIcons
                        name="hat-fedora"
                        size={softcapIconSize}
                        color={palette.textInverse}
                      />
                      <ThemedText style={[styles.capStatusText, { color: palette.textInverse }]}>
                        Softcap Active
                      </ThemedText>
                    </View>
                  )}
                  {softCapPending && !isSoftCap && (
                    <View style={styles.capStatusBadge}>
                      <FlashingIcon
                        name="hat-fedora"
                        size={softcapIconSize}
                        color={palette.textInverse}
                        isFlashing
                      />
                      <ThemedText style={[styles.capStatusText, { color: palette.textInverse }]}>
                        Softcap Pending
                      </ThemedText>
                    </View>
                  )}
                </>
              )}

              {showPointTimer && (
                <View style={styles.pointTimerContainer}>
                  <View
                    style={[styles.pointTimerDivider, { backgroundColor: palette.overlay10 }]}
                  />
                  <ThemedText style={[styles.centerLabel, { color: palette.accent }]}>
                    POINT LENGTH
                  </ThemedText>
                  <View style={styles.pointTimerRow}>
                    <Pressable onPress={togglePause} hitSlop={8}>
                      <MaterialCommunityIcons
                        name={isPaused ? 'play' : 'pause'}
                        size={pointTimerControlIconSize}
                        color={isPaused ? palette.warning : palette.textMuted}
                      />
                    </Pressable>
                    <ThemedText
                      style={[
                        styles.pointTimerValue,
                        { color: isPaused ? palette.warning : palette.textInverse },
                      ]}>
                      {formatElapsed(elapsedSeconds)}
                    </ThemedText>
                    {isPaused && (
                      <Pressable onPress={confirmRestartPointTimer} hitSlop={8}>
                        <MaterialCommunityIcons
                          name="restart"
                          size={pointTimerRestartIconSize}
                          color={palette.textMuted}
                        />
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Gender Ratio Section */}
        {genderRatioEnabled && firstPointRatio && (
          <View style={styles.ratioSection}>
            <View style={[styles.ratioDivider, { backgroundColor: palette.overlay10 }]} />
            <View style={styles.ratioRow}>
              <ThemedText style={[styles.ratioLabel, { color: palette.accent }]}>
                CURRENT GENDER RATIO
              </ThemedText>
              <Pressable
                onPress={() => setShowAbbaModal(true)}
                style={({ pressed }) => [styles.ratioValueRow, pressed && { opacity: 0.7 }]}>
                <ThemedText style={[styles.ratioValue, { color: palette.textInverse }]}>
                  {formatRatioFull(
                    getExpectedRatio(currentPoint, firstPointRatio),
                    getSequenceNumber(currentPoint),
                  )}
                </ThemedText>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={ratioInfoIconSize}
                  color={palette.textMuted}
                />
              </Pressable>
            </View>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />

        {/* Action Section */}
        <View
          key={isLandscape ? 'actions-landscape' : 'actions-portrait'}
          style={styles.actionSection}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            GAME ACTIONS
          </ThemedText>
          <View style={styles.actionButtonRow}>
            {canTriggerHalftimeEarly && (
              <Pressable
                onPress={confirmHalftimeEarly}
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    backgroundColor: palette.accentOverlay10,
                    borderColor: palette.accentOverlay30,
                  },
                  pressed && { backgroundColor: palette.accentOverlay15 },
                ]}>
                <View style={styles.actionIconSlot}>
                  <MaterialCommunityIcons
                    name="skip-next-circle"
                    size={actionIconSize}
                    color={palette.accent}
                  />
                </View>
                <ThemedText style={[styles.actionButtonText, { color: palette.accent }]}>
                  START 2ND HALF
                </ThemedText>
              </Pressable>
            )}
            <Pressable
              onPress={confirmEndGame}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: palette.accentOverlay10, borderColor: palette.accentOverlay30 },
                pressed && { backgroundColor: palette.accentOverlay15 },
              ]}>
              <View style={styles.actionIconSlot}>
                <MaterialCommunityIcons
                  name="flag-checkered"
                  size={actionIconSize}
                  color={palette.accent}
                />
              </View>
              <ThemedText style={[styles.actionButtonText, { color: palette.accent }]}>
                END GAME
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />

        {/* Use shared HelpContent component */}
        <HelpContent showActionBarLegend={statTrackingEnabled} />
      </ScrollView>

      {/* Gender Ratio Info Modal */}
      <AlertModal
        visible={showAbbaModal && genderRatioEnabled && !!firstPointRatio}
        title="Gender Ratio Info"
        onClose={() => setShowAbbaModal(false)}>
        {firstPointRatio && (
          <>
            <View style={styles.ratioInfoRow}>
              <ThemedText
                style={[styles.ratioInfoLabel, { color: palette.textMuted }]}
                numberOfLines={1}>
                1ST MAJORITY
              </ThemedText>
              <ThemedText style={[styles.ratioInfoValue, { color: palette.textInverse }]}>
                {firstPointRatio === 'more-women' ? 'FMP' : 'MMP'}
              </ThemedText>
            </View>
            <View style={styles.ratioInfoRow}>
              <ThemedText style={[styles.ratioInfoLabel, { color: palette.textMuted }]}>
                NEXT POINT
              </ThemedText>
              <ThemedText style={[styles.ratioInfoValue, { color: palette.textInverse }]}>
                {formatRatioFull(
                  getExpectedRatio(currentPoint + 1, firstPointRatio),
                  getSequenceNumber(currentPoint + 1),
                )}
              </ThemedText>
            </View>
          </>
        )}
      </AlertModal>
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      paddingTop: 8,
    },

    // Landscape: Three-Column Hero Section
    heroSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    teamColumn: {
      flex: 1,
      alignItems: 'center',
    },

    // Portrait: Score row + game status below
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    scoreTeam: {
      flex: 1,
      alignItems: 'center',
    },
    scoreDivider: {
      fontSize: scaleBySizeClass(48, sizeClass),
      lineHeight: scaleBySizeClass(54, sizeClass),
      paddingTop: 18,
      paddingHorizontal: 8,
    },
    gameStatusSection: {
      alignItems: 'center',
      marginTop: 20,
    },
    teamColumnName: {
      fontSize: scaleBySizeClass(isLandscape ? 14 : 13, sizeClass),
      fontFamily: Fonts.semiBold,
      marginBottom: 4,
    },
    teamColumnScore: {
      fontSize: scaleBySizeClass(isLandscape ? 56 : 48, sizeClass),
      fontFamily: Fonts.extraBold,
      includeFontPadding: false,
      lineHeight: scaleBySizeClass(isLandscape ? 64 : 54, sizeClass),
    },
    teamColumnStats: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
      marginTop: 4,
    },
    centerColumn: {
      flex: 1.2,
      width: isLandscape ? undefined : '100%',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: isLandscape ? 16 : 0,
    },
    centerLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
    centerNumber: {
      fontSize: scaleBySizeClass(isLandscape ? 48 : 42, sizeClass),
      fontFamily: Fonts.extraBold,
      includeFontPadding: false,
      lineHeight: scaleBySizeClass(isLandscape ? 56 : 48, sizeClass),
    },
    hardcapLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    hardcapWinnerText: {
      fontSize: scaleBySizeClass(24, sizeClass),
      fontFamily: Fonts.extraBold,
      textAlign: 'center',
    },
    capStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    capStatusText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    universePointText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },

    // Point Timer (integrated in center column)
    pointTimerContainer: {
      alignItems: 'center',
      marginTop: 12,
    },
    pointTimerDivider: {
      width: 24,
      height: 1,
      marginBottom: 16,
    },
    pointTimerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
    },
    pointTimerValue: {
      fontSize: scaleBySizeClass(32, sizeClass),
      fontFamily: Fonts.extraBold,
      fontVariant: ['tabular-nums'],
      includeFontPadding: false,
      lineHeight: scaleBySizeClass(38, sizeClass),
    },

    divider: {
      height: 1,
      marginVertical: 20,
    },

    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1.5,
      marginBottom: 16,
    },
    headerIconButton: {
      padding: scaleBySizeClass(8, sizeClass),
      borderRadius: scaleBySizeClass(20, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconButtonPressed: {
      opacity: 0.8,
    },
    actionSection: {
      paddingBottom: 8,
    },
    actionButtonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: isLandscape ? 20 : 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    actionIconSlot: {
      width: scaleBySizeClass(22, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonText: {
      fontSize: scaleBySizeClass(isLandscape ? 14 : 12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.8,
    },
    // Gender Ratio Section
    ratioSection: {
      alignItems: 'center',
      marginTop: 16,
    },
    ratioDivider: {
      width: 40,
      height: 1,
      marginBottom: 16,
    },
    ratioRow: {
      alignItems: 'center',
      gap: 4,
    },
    ratioLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
    ratioValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    ratioValue: {
      fontSize: scaleBySizeClass(28, sizeClass),
      fontFamily: Fonts.extraBold,
    },

    // Gender Ratio Info Modal
    ratioInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    ratioInfoLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 1,
    },
    ratioInfoValue: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },
  });
}
