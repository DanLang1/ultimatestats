import { useTheme } from '@/context/ThemeContext';
import { useHalftimeTimer } from '@/hooks/useHalftimeTimer';
import { MODAL_MAX_WIDTH_LARGE } from '@/lib/constants';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { computePlayerStats } from '@/lib/statsUtils';
import { computeTeamStats } from '@/lib/teamStatsUtils';
import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function HalftimeModal() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const {
    team1Score,
    team2Score,
    currentTeam,
    team2Name,
    startingPossession,
    isHalftimeBreak,
    events,
    gameTo,
    autoHalftimeEnabled,
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

  const styles = createStyles(isLandscape, sizeClass);

  const team1Name = currentTeam?.name ?? 'Team 1';
  const receivingTeamKey = startingPossession === 'team1' ? 'team2' : 'team1';
  const receivingLabel = receivingTeamKey === 'team1' ? 'YOU RECEIVE' : 'THEY RECEIVE';

  // Compute halftime stats
  const teamStats = computeTeamStats(events, startingPossession, gameTo, autoHalftimeEnabled);
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
      router.dismissTo('/Scoreboard');
    } else {
      router.replace('/LineEditor');
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: 'rgba(0,0,0,0.88)',
            padding: 16,
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
            <MaterialCommunityIcons
              name="close"
              size={scaleBySizeClass(20, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>

          <View style={styles.headerRow}>
            <View style={styles.headerSection}>
              <MaterialCommunityIcons
                name="timer-sand"
                size={scaleBySizeClass(16, sizeClass)}
                color={palette.accent}
              />
              <Text style={[styles.headerText, { color: palette.textMuted }]}>HALFTIME</Text>
            </View>

            {statTrackingEnabled && (
              <>
                <MaterialCommunityIcons
                  name="disc"
                  size={scaleBySizeClass(12, sizeClass)}
                  color={palette.accent}
                />
                <Text
                  style={[styles.receivingText, { color: palette.textMuted }]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {receivingLabel}
                </Text>
              </>
            )}
          </View>

          <ScrollView
            contentContainerStyle={[styles.contentRow, !hasStats && styles.contentRowCompact]}
            showsVerticalScrollIndicator={false}>
            {/* Score + Timer */}
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
                  style={styles.timerBtnCompact}>
                  <MaterialCommunityIcons
                    name="minus"
                    size={scaleBySizeClass(16, sizeClass)}
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
                  style={styles.timerBtnCompact}>
                  <MaterialCommunityIcons
                    name="plus"
                    size={scaleBySizeClass(16, sizeClass)}
                    color={!canIncrement ? palette.textMuted : palette.textInverse}
                  />
                </Pressable>
              </View>

              {!hasStats && (
                <View style={styles.buttonRow}>
                  {lineCallingEnabled && (
                    <Pressable
                      onPress={() => router.push('/LineEditor')}
                      style={({ pressed }) => [
                        styles.setLineBtn,
                        { borderColor: palette.overlay10 },
                        pressed && { opacity: 0.7 },
                      ]}>
                      <MaterialCommunityIcons
                        name="account-switch"
                        size={scaleBySizeClass(14, sizeClass)}
                        color={palette.accent}
                      />
                      <Text style={[styles.setLineBtnText, { color: palette.textInverse }]}>
                        SET LINE
                      </Text>
                    </Pressable>
                  )}
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
                      size={scaleBySizeClass(16, sizeClass)}
                      color={palette.textOnAccent}
                    />
                  </Pressable>
                </View>
              )}
            </View>

            {/* Divider */}
            {hasStats && <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />}

            {/* Stats & Action */}
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

                {/* Top Performers List */}
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

                <View style={[styles.buttonRow, { marginTop: 16 }]}>
                  {lineCallingEnabled && (
                    <Pressable
                      onPress={() => router.push('/LineEditor')}
                      style={({ pressed }) => [
                        styles.setLineBtn,
                        { borderColor: palette.overlay10 },
                        pressed && { opacity: 0.7 },
                      ]}>
                      <MaterialCommunityIcons
                        name="account-switch"
                        size={scaleBySizeClass(14, sizeClass)}
                        color={palette.accent}
                      />
                      <Text style={[styles.setLineBtnText, { color: palette.textInverse }]}>
                        SET LINE
                      </Text>
                    </Pressable>
                  )}
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
                      size={scaleBySizeClass(16, sizeClass)}
                      color={palette.textOnAccent}
                    />
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      width: '100%',
      maxWidth: getSizeClassValue(MODAL_MAX_WIDTH_LARGE, sizeClass),
      maxHeight: '90%',
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    contentRow: {
      flexDirection: isLandscape ? 'row' : 'column',
      minHeight: isLandscape ? 240 : 0,
      ...(!isLandscape && { alignItems: 'stretch', gap: 8 }),
    },
    contentRowCompact: {
      minHeight: 0,
    },
    leftColumn: {
      flex: isLandscape ? 1 : 0,
      padding: 24,
      justifyContent: isLandscape ? 'space-between' : 'center',
      alignItems: 'center',
      ...(!isLandscape && { gap: 16 }),
    },
    leftColumnCompact: {
      justifyContent: 'center',
      gap: 16,
    },
    rightColumn: {
      flex: isLandscape ? 1.1 : 0,
      padding: 16,
      paddingTop: 24,
      justifyContent: isLandscape ? 'space-between' : 'center',
      ...(!isLandscape && { gap: 12 }),
    },
    divider: isLandscape
      ? {
          width: 1,
          height: '80%',
          alignSelf: 'center',
        }
      : {
          width: '80%',
          height: 1,
          alignSelf: 'center',
        },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      paddingTop: 16,
      paddingBottom: 4,
      paddingHorizontal: 40,
      paddingRight: 56,
      gap: 10,
      zIndex: 10,
    },
    headerSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    receivingText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontWeight: '600',
      flexShrink: 1,
      maxWidth: isLandscape ? 260 : 180,
    },
    headerText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '800',
      letterSpacing: 2,
    },
    scoreCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    scoreNumber: {
      fontSize: scaleBySizeClass(64, sizeClass),
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
      lineHeight: scaleBySizeClass(70, sizeClass),
    },
    scoreDivider: {
      fontSize: scaleBySizeClass(32, sizeClass),
      fontWeight: '200',
      marginBottom: 8,
      marginHorizontal: 8,
    },
    scoreGroup: {
      alignItems: 'center',
    },
    teamNameLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
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
      fontSize: scaleBySizeClass(36, sizeClass),
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    timerStateCompact: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 8,
      width: '100%',
    },
    setLineBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
    },
    setLineBtnText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontWeight: '800',
      letterSpacing: 0.5,
    },
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
      fontSize: scaleBySizeClass(20, sizeClass),
      fontWeight: '800',
    },
    statLabelCompact: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '700',
      marginTop: 2,
      letterSpacing: 0.5,
    },
    performersListCompact: {
      gap: 4,
      marginTop: 12,
      flex: isLandscape ? 1 : 0,
      justifyContent: 'center',
      width: '100%',
      maxWidth: 220,
      alignSelf: 'center',
    },
    performerRowCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingVertical: 2,
    },
    performerRankCompact: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '800',
      width: 16,
    },
    performerNameCompact: {
      flex: 1,
      fontSize: scaleBySizeClass(13, sizeClass),
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
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    continueBtnCompact: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    continueBtnTextCompact: {
      fontSize: scaleBySizeClass(14, sizeClass),
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
}
