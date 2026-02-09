import { useTheme } from '@/context/ThemeContext';
import { useHalftimeTimer } from '@/hooks/useHalftimeTimer';
import { computePlayerStats } from '@/lib/statsUtils';
import { computeTeamStats } from '@/lib/teamStatsUtils';
import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function HalftimeModal() {
  const { palette } = useTheme();
  const {
    team1Score,
    team2Score,
    currentTeam,
    team2Name,
    startingPossession,
    isHalftimeBreak,
    events,
    gameTo,
    statTrackingEnabled,
  } = useGameStore();
  const {
    formattedTime,
    isRunning,
    isComplete,
    toggleTimer,
    adjustTimer,
    handleContinue,
    canDecrement,
    canIncrement,
  } = useHalftimeTimer();

  const team1Name = currentTeam?.name ?? 'Team 1';
  const receivingTeam = startingPossession === 'team1' ? team2Name : team1Name;

  // Compute halftime stats
  const teamStats = computeTeamStats(events, startingPossession, gameTo);
  const playerStats = computePlayerStats(events, 'team1', currentTeam?.roster);
  const topPerformers = playerStats.slice(0, 3);

  const hasStats = statTrackingEnabled && events.length > 0;

  const lineConfirmedForNextPoint = useLinePresetsStore((state) => state.lineConfirmedForNextPoint);
  const lineCallingEnabled = useSettingsStore((state) => state.lineCallingEnabled);

  if (!isHalftimeBreak) {
    return null;
  }

  const onContinue = () => {
    handleContinue();
    if (lineConfirmedForNextPoint || !lineCallingEnabled) {
      router.dismissTo('/');
    } else {
      router.replace('/PointTransition');
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: 'rgba(0,0,0,0.88)',
            padding: 16, // Reduced padding
          },
        ]}>
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.container, { backgroundColor: palette.primary }]}>
          {/* Close button - top right */}
          <Pressable
            onPress={() => router.replace('/Dashboard')}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            hitSlop={12}>
            <MaterialCommunityIcons name="close" size={20} color={palette.textMuted} />
          </Pressable>

          <View style={styles.headerCenteredRow}>
            <View style={styles.headerSection}>
              <MaterialCommunityIcons name="timer-sand" size={16} color={palette.accent} />
              <Text style={[styles.headerText, { color: palette.textMuted }]}>HALFTIME</Text>
            </View>

            <MaterialCommunityIcons name="disc" size={12} color={palette.accent} />

            <View style={styles.headerSection}>
              <Text style={[styles.receivingText, { color: palette.textMuted }]}>
                {receivingTeam} receives
              </Text>

              {lineCallingEnabled && (
                <>
                  <MaterialCommunityIcons name="disc" size={12} color={palette.accent} />
                  <Pressable
                    onPress={() => router.push('/PointTransition')}
                    style={({ pressed }) => [styles.setLineBtn, pressed && { opacity: 0.5 }]}>
                    <MaterialCommunityIcons
                      name="account-switch"
                      size={12}
                      color={palette.accent}
                    />
                    <Text style={[styles.setLineBtnText, { color: palette.textMuted }]}>
                      Set Line
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          <View style={[styles.contentRow, !hasStats && styles.contentRowCompact]}>
            {/* LEFT SIDE: Game State (Score + Timer) */}
            <View style={[styles.leftColumn, !hasStats && styles.leftColumnCompact]}>
              <View style={styles.scoreCompact}>
                <View style={styles.scoreGroup}>
                  <Text
                    style={[styles.teamNameLabel, { color: palette.textInverse }]}
                    numberOfLines={1}>
                    {team1Name}
                  </Text>
                  <Text style={[styles.scoreNumber, { color: palette.textInverse }]}>
                    {team1Score}
                  </Text>
                </View>
                <Text style={[styles.scoreDivider, { color: palette.textMuted }]}>-</Text>
                <View style={styles.scoreGroup}>
                  <Text
                    style={[styles.teamNameLabel, { color: palette.textInverse }]}
                    numberOfLines={1}>
                    {team2Name}
                  </Text>
                  <Text style={[styles.scoreNumber, { color: palette.textInverse }]}>
                    {team2Score}
                  </Text>
                </View>
              </View>

              <View style={[styles.timerCompact, { backgroundColor: palette.overlay05 }]}>
                <Pressable
                  onPress={() => adjustTimer(-1)}
                  disabled={!canDecrement}
                  style={[styles.timerBtnCompact]}>
                  <MaterialCommunityIcons
                    name="minus"
                    size={16}
                    color={!canDecrement ? palette.textMuted : palette.textInverse}
                  />
                </Pressable>

                <Pressable onPress={toggleTimer} style={styles.timerDisplayCompact}>
                  <Text
                    style={[
                      styles.timerValueCompact,
                      { color: isComplete ? palette.success : palette.textInverse },
                    ]}>
                    {formattedTime}
                  </Text>
                  <Text style={[styles.timerStateCompact, { color: palette.textMuted }]}>
                    {isRunning ? 'PAUSE' : 'START'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => adjustTimer(1)}
                  disabled={!canIncrement}
                  style={[styles.timerBtnCompact]}>
                  <MaterialCommunityIcons
                    name="plus"
                    size={16}
                    color={!canIncrement ? palette.textMuted : palette.textInverse}
                  />
                </Pressable>
              </View>

              {!hasStats && (
                <Pressable
                  onPress={onContinue}
                  style={({ pressed }) => [
                    styles.continueBtnCompact,
                    { backgroundColor: palette.accent },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  ]}>
                  <Text style={[styles.continueBtnTextCompact, { color: palette.textOnAccent }]}>
                    CONTINUE
                  </Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={16}
                    color={palette.textOnAccent}
                  />
                </Pressable>
              )}
            </View>

            {/* Vertical Divider */}
            {hasStats && <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />}

            {/* RIGHT SIDE: Stats & Action */}
            {hasStats && (
              <View style={styles.rightColumn}>
                {/* 2 Stats Cards */}
                <View style={styles.statsRowCompact}>
                  <View style={[styles.statCardCompact, { backgroundColor: palette.overlay05 }]}>
                    <Text style={[styles.statValueCompact, { color: palette.textInverse }]}>
                      {Math.round(teamStats.holds)}/{teamStats.offensivePoints}
                    </Text>
                    <Text style={[styles.statLabelCompact, { color: palette.textMuted }]}>
                      HOLD
                    </Text>
                  </View>
                  <View style={[styles.statCardCompact, { backgroundColor: palette.overlay05 }]}>
                    <Text style={[styles.statValueCompact, { color: palette.textInverse }]}>
                      {Math.round(teamStats.breaks)}/{teamStats.defensivePoints}
                    </Text>
                    <Text style={[styles.statLabelCompact, { color: palette.textMuted }]}>
                      BREAK
                    </Text>
                  </View>
                </View>

                {/* Top Performers List (Compact) */}
                <View style={styles.performersListCompact}>
                  {topPerformers.map((p, i) => (
                    <View key={p.name} style={styles.performerRowCompact}>
                      <Text style={[styles.performerRankCompact, { color: palette.accent }]}>
                        {i + 1}
                      </Text>
                      <Text
                        style={[styles.performerNameCompact, { color: palette.textInverse }]}
                        numberOfLines={1}>
                        {p.name}
                      </Text>
                      <View
                        style={[
                          styles.performerBadge,
                          {
                            backgroundColor:
                              p.plusMinus >= 0 ? palette.success + '20' : palette.danger + '20',
                          },
                        ]}>
                        <Text
                          style={[
                            styles.performerStatCompact,
                            { color: p.plusMinus >= 0 ? palette.success : palette.danger },
                          ]}>
                          {p.plusMinus > 0 ? '+' : ''}
                          {p.plusMinus}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <Pressable
                  onPress={onContinue}
                  style={({ pressed }) => [
                    styles.continueBtnCompact,
                    { backgroundColor: palette.accent, marginTop: 16 },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  ]}>
                  <Text style={[styles.continueBtnTextCompact, { color: palette.textOnAccent }]}>
                    CONTINUE
                  </Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={16}
                    color={palette.textOnAccent}
                  />
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '90%', // Ensure it doesn't overflow screen
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  contentRow: {
    flexDirection: 'row',
    height: 240, // Fixed modest height for content
  },
  contentRowCompact: {
    height: 'auto', // Let content determine height when no stats
  },
  leftColumn: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftColumnCompact: {
    justifyContent: 'center', // Center content vertically when no stats
    gap: 16, // Add consistent spacing between elements
  },
  rightColumn: {
    flex: 1.1, // Give stats slightly more width
    padding: 16,
    paddingTop: 24,
    justifyContent: 'space-between',
  },
  divider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },
  headerCenteredRow: {
    paddingTop: 16,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 16,
    zIndex: 10,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receivingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  scoreCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    lineHeight: 70, // Tight line height
  },
  scoreDivider: {
    fontSize: 32,
    fontWeight: '200',
    marginBottom: 8,
    marginHorizontal: 8,
  },
  scoreGroup: {
    alignItems: 'center',
  },
  teamNameLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -4,
    maxWidth: 100,
  },

  timerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    paddingHorizontal: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  timerBtnCompact: {
    padding: 8,
  },
  timerDisplayCompact: {
    alignItems: 'center',
    minWidth: 90,
  },
  timerValueCompact: {
    fontSize: 36,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timerStateCompact: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  setLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  setLineBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Right Side Styles
  statsRowCompact: {
    flexDirection: 'row',
    gap: 12,
  },
  statCardCompact: {
    flex: 1,
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValueCompact: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabelCompact: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  performersListCompact: {
    gap: 4,
    marginTop: 12,
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 220, // Constrain width to keep badge closer
    alignSelf: 'center',
  },
  performerRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Align ends
    gap: 8,
    paddingVertical: 2,
  },
  performerRankCompact: {
    fontSize: 12,
    fontWeight: '800',
    width: 16,
    color: '#888', // Muted rank color
  },
  performerNameCompact: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  performerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  performerStatCompact: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  continueBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
  },
  continueBtnTextCompact: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 20,
  },
});
