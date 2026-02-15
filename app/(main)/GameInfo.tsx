import HelpContent from '@/components/HelpContent';
import { ThemedView } from '@/components/ThemedView';
import { AlertModal } from '@/components/ui/AlertModal';
import { useAlert } from '@/components/ui/AlertProvider';
import FlashingIcon from '@/components/ui/FlashingIcon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useEndGame } from '@/hooks/useEndGame';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useLayout } from '@/hooks/useLayout';
import { usePointTimer } from '@/hooks/usePointTimer';
import { formatRatioFull, getExpectedRatio, getSequenceNumber } from '@/lib/genderRatioUtils';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function GameInfoScreen() {
  const { isLandscape } = useLayout();
  const styles = createStyles(isLandscape);
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
    gameLocked,
  } = useGameStore();

  const { genderRatioEnabled, firstPointRatio, lineCallingEnabled } = useSettingsStore();

  const [showAbbaModal, setShowAbbaModal] = useState(false);

  const team1Name = currentTeam?.name ?? 'Team 1';

  const { timeLeft } = useGameTimer();
  const isHardcap = timeLeft === 0;

  const { palette } = useTheme();
  const { showAlert } = useAlert();
  const { confirmEndGame } = useEndGame();
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

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="MATCH STATUS"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent]}>
        {isLandscape ? (
          /* Landscape: Three-Column Hero Section */
          <View key="hero-landscape" style={styles.heroSection}>
            <View style={styles.teamColumn}>
              <Text
                style={[styles.teamColumnName, { color: palette.textMuted }]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {team1Name}
              </Text>
              <Text style={[styles.teamColumnScore, { color: palette.textInverse }]}>
                {team1Score}
              </Text>
              <Text style={[styles.teamColumnStats, { color: palette.textMuted }]}>
                {formatTimeoutStats(team1Timeouts, team1Floater)}
              </Text>
            </View>

            <View style={styles.centerColumn}>
              {isHardcap ? (
                <>
                  <View style={styles.hardcapLabelRow}>
                    <MaterialCommunityIcons name="hard-hat" size={18} color={palette.accent} />
                    <Text style={[styles.centerLabel, { color: palette.accent }]}>HARDCAP</Text>
                  </View>
                  {team1Score === team2Score ? (
                    <View style={styles.capStatusBadge}>
                      <MaterialCommunityIcons
                        name="sword-cross"
                        size={20}
                        color={palette.textInverse}
                      />
                      <Text style={[styles.universePointText, { color: palette.textInverse }]}>
                        Universe Point
                      </Text>
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
                            <Text
                              style={[styles.hardcapWinnerText, { color: palette.textInverse }]}>
                              {leadingTeam}
                            </Text>
                            <Text style={[styles.capStatusText, { color: palette.textMuted }]}>
                              {canTie
                                ? `wins unless ${trailingTeam} scores`
                                : 'wins after this point'}
                            </Text>
                          </>
                        );
                      })()}
                    </>
                  )}
                </>
              ) : (
                <>
                  <Text style={[styles.centerLabel, { color: palette.accent }]}>GAME TO</Text>
                  <Text style={[styles.centerNumber, { color: palette.textInverse }]}>
                    {gameTo}
                  </Text>
                  {isSoftCap && (
                    <View style={styles.capStatusBadge}>
                      <MaterialCommunityIcons
                        name="hat-fedora"
                        size={16}
                        color={palette.textInverse}
                      />
                      <Text style={[styles.capStatusText, { color: palette.textInverse }]}>
                        Softcap Active
                      </Text>
                    </View>
                  )}
                  {softCapPending && !isSoftCap && (
                    <View style={styles.capStatusBadge}>
                      <FlashingIcon
                        name="hat-fedora"
                        size={16}
                        color={palette.textInverse}
                        isFlashing
                      />
                      <Text style={[styles.capStatusText, { color: palette.textInverse }]}>
                        Softcap Pending
                      </Text>
                    </View>
                  )}
                </>
              )}

              {showPointTimer && (
                <View style={styles.pointTimerContainer}>
                  <View
                    style={[styles.pointTimerDivider, { backgroundColor: palette.overlay10 }]}
                  />
                  <Text style={[styles.centerLabel, { color: palette.accent }]}>POINT LENGTH</Text>
                  <View style={styles.pointTimerRow}>
                    <Pressable onPress={togglePause} hitSlop={8}>
                      <MaterialCommunityIcons
                        name={isPaused ? 'play' : 'pause'}
                        size={24}
                        color={isPaused ? palette.warning : palette.textMuted}
                      />
                    </Pressable>
                    <Text
                      style={[
                        styles.pointTimerValue,
                        { color: isPaused ? palette.warning : palette.textInverse },
                      ]}>
                      {formatElapsed(elapsedSeconds)}
                    </Text>
                    {isPaused && (
                      <Pressable onPress={confirmRestartPointTimer} hitSlop={8}>
                        <MaterialCommunityIcons
                          name="restart"
                          size={22}
                          color={palette.textMuted}
                        />
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.teamColumn}>
              <Text
                style={[styles.teamColumnName, { color: palette.textMuted }]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {team2Name}
              </Text>
              <Text style={[styles.teamColumnScore, { color: palette.textInverse }]}>
                {team2Score}
              </Text>
              <Text style={[styles.teamColumnStats, { color: palette.textMuted }]}>
                {formatTimeoutStats(team2Timeouts, team2Floater)}
              </Text>
            </View>
          </View>
        ) : (
          /* Portrait: Score row on top, game status below */
          <View key="hero-portrait">
            {/* Score Row */}
            <View style={styles.scoreRow}>
              <View style={styles.scoreTeam}>
                <Text
                  style={[styles.teamColumnName, { color: palette.textMuted }]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {team1Name}
                </Text>
                <Text style={[styles.teamColumnScore, { color: palette.textInverse }]}>
                  {team1Score}
                </Text>
                <Text style={[styles.teamColumnStats, { color: palette.textMuted }]}>
                  {formatTimeoutStats(team1Timeouts, team1Floater)}
                </Text>
              </View>

              <Text style={[styles.scoreDivider, { color: palette.textMuted }]}>–</Text>

              <View style={styles.scoreTeam}>
                <Text
                  style={[styles.teamColumnName, { color: palette.textMuted }]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {team2Name}
                </Text>
                <Text style={[styles.teamColumnScore, { color: palette.textInverse }]}>
                  {team2Score}
                </Text>
                <Text style={[styles.teamColumnStats, { color: palette.textMuted }]}>
                  {formatTimeoutStats(team2Timeouts, team2Floater)}
                </Text>
              </View>
            </View>

            {/* Game Status Below */}
            <View style={styles.gameStatusSection}>
              {isHardcap ? (
                <>
                  <View style={styles.hardcapLabelRow}>
                    <MaterialCommunityIcons name="hard-hat" size={18} color={palette.accent} />
                    <Text style={[styles.centerLabel, { color: palette.accent }]}>HARDCAP</Text>
                  </View>
                  {team1Score === team2Score ? (
                    <View style={styles.capStatusBadge}>
                      <MaterialCommunityIcons
                        name="sword-cross"
                        size={20}
                        color={palette.textInverse}
                      />
                      <Text style={[styles.universePointText, { color: palette.textInverse }]}>
                        Universe Point
                      </Text>
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
                            <Text
                              style={[styles.hardcapWinnerText, { color: palette.textInverse }]}>
                              {leadingTeam}
                            </Text>
                            <Text style={[styles.capStatusText, { color: palette.textMuted }]}>
                              {canTie
                                ? `wins unless ${trailingTeam} scores`
                                : 'wins after this point'}
                            </Text>
                          </>
                        );
                      })()}
                    </>
                  )}
                </>
              ) : (
                <>
                  <Text style={[styles.centerLabel, { color: palette.accent }]}>GAME TO</Text>
                  <Text style={[styles.centerNumber, { color: palette.textInverse }]}>
                    {gameTo}
                  </Text>
                  {isSoftCap && (
                    <View style={styles.capStatusBadge}>
                      <MaterialCommunityIcons
                        name="hat-fedora"
                        size={16}
                        color={palette.textInverse}
                      />
                      <Text style={[styles.capStatusText, { color: palette.textInverse }]}>
                        Softcap Active
                      </Text>
                    </View>
                  )}
                  {softCapPending && !isSoftCap && (
                    <View style={styles.capStatusBadge}>
                      <FlashingIcon
                        name="hat-fedora"
                        size={16}
                        color={palette.textInverse}
                        isFlashing
                      />
                      <Text style={[styles.capStatusText, { color: palette.textInverse }]}>
                        Softcap Pending
                      </Text>
                    </View>
                  )}
                </>
              )}

              {showPointTimer && (
                <View style={styles.pointTimerContainer}>
                  <View
                    style={[styles.pointTimerDivider, { backgroundColor: palette.overlay10 }]}
                  />
                  <Text style={[styles.centerLabel, { color: palette.accent }]}>POINT LENGTH</Text>
                  <View style={styles.pointTimerRow}>
                    <Pressable onPress={togglePause} hitSlop={8}>
                      <MaterialCommunityIcons
                        name={isPaused ? 'play' : 'pause'}
                        size={24}
                        color={isPaused ? palette.warning : palette.textMuted}
                      />
                    </Pressable>
                    <Text
                      style={[
                        styles.pointTimerValue,
                        { color: isPaused ? palette.warning : palette.textInverse },
                      ]}>
                      {formatElapsed(elapsedSeconds)}
                    </Text>
                    {isPaused && (
                      <Pressable onPress={confirmRestartPointTimer} hitSlop={8}>
                        <MaterialCommunityIcons
                          name="restart"
                          size={22}
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
              <Text style={[styles.ratioLabel, { color: palette.accent }]}>
                CURRENT GENDER RATIO
              </Text>
              <Pressable
                onPress={() => setShowAbbaModal(true)}
                style={({ pressed }) => [styles.ratioValueRow, pressed && { opacity: 0.7 }]}>
                <Text style={[styles.ratioValue, { color: palette.textInverse }]}>
                  {formatRatioFull(
                    getExpectedRatio(currentPoint, firstPointRatio),
                    getSequenceNumber(currentPoint),
                  )}
                </Text>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={18}
                  color={palette.textMuted}
                />
              </Pressable>
            </View>
          </View>
        )}

        {/* Action Section */}
        <View
          key={isLandscape ? 'actions-landscape' : 'actions-portrait'}
          style={styles.actionSection}>
          {lineCallingEnabled && !gameLocked && (
            <Pressable
              onPress={() => router.push('/LinePromptModal')}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: palette.overlay05, borderColor: palette.overlay20 },
                pressed && { backgroundColor: palette.overlay10 },
              ]}>
              <MaterialCommunityIcons name="account-switch" size={20} color={palette.textInverse} />
              <Text style={[styles.actionButtonText, { color: palette.textInverse }]}>
                EDIT LINE
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={confirmEndGame}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: palette.danger + '10', borderColor: palette.danger + '20' },
              pressed && { backgroundColor: palette.danger + '20' },
            ]}>
            <MaterialCommunityIcons name="flag-checkered" size={20} color={palette.danger} />
            <Text style={[styles.actionButtonText, { color: palette.danger }]}>END GAME EARLY</Text>
          </Pressable>
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
              <Text style={[styles.ratioInfoLabel, { color: palette.textMuted }]} numberOfLines={1}>
                1ST MAJORITY
              </Text>
              <Text style={[styles.ratioInfoValue, { color: palette.textInverse }]}>
                {firstPointRatio === 'more-women' ? 'FMP' : 'MMP'}
              </Text>
            </View>
            <View style={styles.ratioInfoRow}>
              <Text style={[styles.ratioInfoLabel, { color: palette.textMuted }]}>NEXT POINT</Text>
              <Text style={[styles.ratioInfoValue, { color: palette.textInverse }]}>
                {formatRatioFull(
                  getExpectedRatio(currentPoint + 1, firstPointRatio),
                  getSequenceNumber(currentPoint + 1),
                )}
              </Text>
            </View>
          </>
        )}
      </AlertModal>
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean) {
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
      fontSize: 48,
      fontWeight: '300',
      lineHeight: 54,
      paddingTop: 18,
      paddingHorizontal: 8,
    },
    gameStatusSection: {
      alignItems: 'center',
      marginTop: 20,
    },
    teamColumnName: {
      fontSize: isLandscape ? 14 : 13,
      fontWeight: '600',
      marginBottom: 4,
    },
    teamColumnScore: {
      fontSize: isLandscape ? 56 : 48,
      fontWeight: '800',
      includeFontPadding: false,
      lineHeight: isLandscape ? 64 : 54,
    },
    teamColumnStats: {
      fontSize: 13,
      fontWeight: '500',
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
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
    },
    centerNumber: {
      fontSize: isLandscape ? 48 : 42,
      fontWeight: '800',
      includeFontPadding: false,
      lineHeight: isLandscape ? 56 : 48,
    },
    hardcapLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    hardcapWinnerText: {
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
    },
    capStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    capStatusText: {
      fontSize: 13,
      fontWeight: '600',
    },
    universePointText: {
      fontSize: 16,
      fontWeight: '700',
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
      fontSize: 32,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      includeFontPadding: false,
      lineHeight: 38,
    },

    divider: {
      height: 1,
      marginVertical: 20,
    },

    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.5,
      marginBottom: 16,
    },
    actionSection: {
      flexDirection: isLandscape ? 'row' : 'column',
      justifyContent: 'center',
      alignItems: isLandscape ? undefined : 'stretch',
      gap: 12,
      paddingTop: isLandscape ? 24 : 16,
      paddingVertical: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: isLandscape ? undefined : '100%',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 1,
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
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
    },
    ratioValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    ratioValue: {
      fontSize: 28,
      fontWeight: '800',
    },

    // Gender Ratio Info Modal
    ratioInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    ratioInfoLabel: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1,
    },
    ratioInfoValue: {
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
