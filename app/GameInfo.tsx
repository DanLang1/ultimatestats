import HelpContent from '@/components/HelpContent';
import { ThemedView } from '@/components/ThemedView';
import { AlertModal } from '@/components/ui/AlertModal';
import FlashingIcon from '@/components/ui/FlashingIcon';
import { useTheme } from '@/context/ThemeContext';
import { useEndGame } from '@/hooks/useEndGame';
import { useGameTimer } from '@/hooks/useGameTimer';
import { usePointTimer } from '@/hooks/usePointTimer';
import { formatRatioFull, getExpectedRatio, getSequenceNumber } from '@/lib/genderRatioUtils';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function GameInfoScreen() {
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
  } = useGameStore();

  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();

  const [showAbbaModal, setShowAbbaModal] = useState(false);

  const team1Name = currentTeam?.name ?? 'Team 1';

  const { timeLeft } = useGameTimer();
  const isHardcap = timeLeft === 0;

  const { palette } = useTheme();
  const { confirmEndGame } = useEndGame();
  const {
    elapsedSeconds,
    isActive: pointIsActive,
    isPaused,
    togglePause,
    isEnabled: pointTimerEnabled,
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

  const showPointTimer = pointTimerEnabled && pointIsActive;

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
          hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>MATCH STATUS</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Three-Column Hero Section */}
        <View style={styles.heroSection}>
          {/* Left Column - Team 1 */}
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

          {/* Center Column - Game Status + Point Timer */}
          <View style={styles.centerColumn}>
            {/* Game To / Cap Status */}
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
                          <Text style={[styles.hardcapWinnerText, { color: palette.textInverse }]}>
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
                <Text style={[styles.centerNumber, { color: palette.textInverse }]}>{gameTo}</Text>
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

            {/* Point Timer (integrated) */}
            {showPointTimer && (
              <View style={styles.pointTimerContainer}>
                <View style={[styles.pointTimerDivider, { backgroundColor: palette.overlay10 }]} />
                <Pressable
                  onPress={togglePause}
                  style={({ pressed }) => [
                    styles.pointTimerPod,
                    pressed && { backgroundColor: palette.overlay10 },
                  ]}>
                  <Text style={[styles.centerLabel, { color: palette.accent }]}>POINT LENGTH</Text>
                  <View style={styles.pointTimerRow}>
                    <MaterialCommunityIcons
                      name={isPaused ? 'play' : 'pause'}
                      size={24}
                      color={isPaused ? palette.warning : palette.textMuted}
                    />
                    <Text
                      style={[
                        styles.pointTimerValue,
                        { color: isPaused ? palette.warning : palette.textInverse },
                      ]}>
                      {formatElapsed(elapsedSeconds)}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}
          </View>

          {/* Right Column - Team 2 */}
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

        {/* Gender Ratio Section */}
        {genderRatioEnabled && firstPointRatio && (
          <View style={styles.ratioSection}>
            <View style={[styles.ratioDivider, { backgroundColor: palette.overlay10 }]} />
            <View style={styles.ratioRow}>
              <Text style={[styles.ratioLabel, { color: palette.accent }]}>
                POINT {currentPoint} RATIO
              </Text>
              <View style={styles.ratioValueRow}>
                <Text style={[styles.ratioValue, { color: palette.textInverse }]}>
                  {formatRatioFull(
                    getExpectedRatio(currentPoint, firstPointRatio),
                    getSequenceNumber(currentPoint),
                  )}
                </Text>
                <Pressable
                  onPress={() => setShowAbbaModal(true)}
                  style={({ pressed }) => [styles.helpButton, pressed && { opacity: 0.7 }]}
                  hitSlop={8}>
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={18}
                    color={palette.textMuted}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Action Section */}
        <View style={styles.actionSection}>
          <Pressable
            onPress={confirmEndGame}
            style={({ pressed }) => [
              styles.endGameButton,
              { backgroundColor: palette.danger + '10', borderColor: palette.danger + '20' },
              pressed && { backgroundColor: palette.danger + '20' },
            ]}>
            <MaterialCommunityIcons name="flag-checkered" size={20} color={palette.danger} />
            <Text style={[styles.endGameText, { color: palette.danger }]}>END GAME EARLY</Text>
          </Pressable>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />

        {/* Use shared HelpContent component */}
        <HelpContent showActionBarLegend={statTrackingEnabled} />
      </ScrollView>

      {/* ABBA Rule Explanation Modal */}
      <AlertModal
        visible={showAbbaModal}
        title="Ratio Rule A (ABBA)"
        onClose={() => setShowAbbaModal(false)}>
        <Text style={[styles.abbaText, { color: palette.textInverse }]}>
          Gender ratio is tracked by the Ratio Rule A or ABBA method.
        </Text>
        <Text style={[styles.abbaText, { color: palette.textInverse }]}>
          Prefix F or M indicate gender majority, the number indicates if it is the first or second
          sequence.
        </Text>
        <Pressable
          onPress={() => Linking.openURL('https://usaultimate.org/rules/')}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.abbaSource, { color: palette.accent }]}>
            USAU Rules of Ultimate, Appendix B1.B
          </Text>
        </Pressable>
      </AlertModal>
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
  headerRightSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 8,
  },

  // Three-Column Hero Section
  heroSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  teamColumn: {
    flex: 1,
    alignItems: 'center',
  },
  teamColumnName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  teamColumnScore: {
    fontSize: 56,
    fontWeight: '800',
    includeFontPadding: false,
    lineHeight: 64,
  },
  teamColumnStats: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  centerColumn: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  centerLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  centerNumber: {
    fontSize: 48,
    fontWeight: '800',
    includeFontPadding: false,
    lineHeight: 56,
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
  pointTimerPod: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 24,
    borderRadius: 12,
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
    paddingTop: 24,
    alignItems: 'center',
    paddingVertical: 8,
  },
  endGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1,
  },
  endGameText: {
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
  helpButton: {
    padding: 4,
    borderRadius: 12,
  },

  // ABBA Modal
  abbaText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  abbaSource: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
