import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useTimestampTimer } from '@/hooks/advancedTracking/useTimer';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getActiveBetweenPointTimeout,
  getGoalInfo,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { getCurrentPoint, getPointScoringSideId } from '@/lib/advancedTracking/trackingUtils';
import type { AdvancedTrackedGame, Participant, TrackedPoint } from '@/lib/advancedTracking/types';
import { DEFAULT_TIMEOUT_SECONDS } from '@/lib/constants';
import { formatTimerSeconds, hasItems } from '@/lib/utils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts, Palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PlayerChip } from '@/components/ui/PlayerChip';
import {
  getHockeyAssistName,
  getLastEventLabel,
  getPointContextStats,
  getPointDetails,
  getPointOutcomeLabel,
} from './betweenPointUtils';

interface BetweenPointDisplayProps {
  game: AdvancedTrackedGame;
  participants: Participant[];
  onStartNextPoint: () => void;
}

export const BetweenPointDisplay = ({
  game,
  participants,
  onStartNextPoint,
}: BetweenPointDisplayProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass, palette);
  const { endBetweenPointTimeout, undoLastOperation } = useAdvancedTrackingStore();

  const point = getCurrentPoint(game);
  const activeTimeout = getActiveBetweenPointTimeout(game);
  const goalInfo = getGoalInfo(point, game.focusSideId, participants);
  const focusSide = game.sides.find((side) => side.id === game.focusSideId);
  const opponentSide = game.sides.find((side) => side.id !== game.focusSideId);
  const timeoutSide = activeTimeout
    ? game.sides.find((side) => side.id === activeTimeout.transition.sideId)
    : null;

  const timeoutSecondsLeft = useTimestampTimer({
    timestamp: activeTimeout?.transition.startedAt ?? null,
    mode: 'countdown',
    durationSeconds: DEFAULT_TIMEOUT_SECONDS,
    intervalMs: 250,
    enabled: activeTimeout !== null && activeTimeout.transition.startedAt != null,
    allowNegative: true,
  });

  let timerColor = palette.success;
  if (timeoutSecondsLeft <= 10) {
    timerColor = palette.danger;
  } else if (timeoutSecondsLeft <= 20) {
    timerColor = palette.warning;
  }

  const scoringSideId = point ? getPointScoringSideId(game, point) : null;
  const receivingSideId = point?.possessions[0]?.sideId ?? null;
  const outcomeLabel = getPointOutcomeLabel({
    focusSideId: game.focusSideId,
    scoringSideId,
    receivingSideId,
    possessionSideIds: point?.possessions.map((possession) => possession.sideId) ?? [],
  });
  const lastEventLabel = getLastEventLabel({
    goalInfo,
    focusSideLabel: focusSide?.label ?? 'Us',
    opponentSideLabel: opponentSide?.label ?? 'Opponent',
  });
  const pointDetails = getPointDetails(
    point?.possessions.flatMap((possession) => possession.actions) ?? [],
  );
  const hockeyAssistName = getHockeyAssistName(point, participants);
  const pointContextStats = getPointContextStats({
    game,
    pointActions: point?.possessions.flatMap((possession) => possession.actions) ?? [],
    receivingSideId,
  });
  const lastPointPlayers = getLastPointPlayers(point, game.focusSideId, participants);
  const handleEndTimeout = () => {
    if (activeTimeout == null) return;
    endBetweenPointTimeout(activeTimeout.transition.id);
  };

  const renderAttributionItem = (label: string, name: string | null) => (
    <View style={styles.statItem}>
      <ThemedText style={[styles.statLabel, { color: palette.textMuted }]}>{label}</ThemedText>
      <ThemedText style={[styles.statName, { color: palette.textInverse }]} numberOfLines={1}>
        {name ?? '-'}
      </ThemedText>
    </View>
  );

  if (activeTimeout) {
    return (
      <View style={styles.container}>
        <View style={styles.timeoutContent}>
          <View style={styles.timeoutBlock}>
            {timeoutSide && (
              <ThemedText style={[styles.sideLabel, { color: palette.textMuted }]}>
                {timeoutSide.label.toUpperCase()}
              </ThemedText>
            )}
            <View style={styles.iconRow}>
              <MaterialCommunityIcons
                name="timer-pause-outline"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.warning}
              />
              <ThemedText style={[styles.timeoutLabel, { color: palette.warning }]}>
                TIMEOUT
              </ThemedText>
            </View>
            <ThemedText style={[styles.countdownTimer, { color: timerColor }]}>
              {formatTimerSeconds(timeoutSecondsLeft)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.bottomActions}>
          <View style={styles.buttonRow}>
            <Pressable
              testID="between-point-start-next"
              style={({ pressed }) => [
                styles.actionBtn,
                styles.primaryBtn,
                {
                  borderColor: palette.success,
                  backgroundColor: palette.successOverlay10,
                },
                pressed && { opacity: 0.7 },
              ]}
              onPress={onStartNextPoint}>
              <ThemedText style={[styles.actionBtnText, { color: palette.success }]}>
                NEXT POINT
              </ThemedText>
            </Pressable>
            <Pressable
              testID="between-point-end-timeout"
              style={({ pressed }) => [
                styles.actionBtn,
                styles.endTimeoutBtn,
                {
                  borderColor: palette.overlay20,
                  backgroundColor: palette.overlay05,
                },
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleEndTimeout}>
              <ThemedText style={[styles.actionBtnText, { color: palette.textInverse }]}>
                END TIMEOUT
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryContent}>
        <View style={styles.summaryBand}>
          <View style={styles.summaryHeaderColumn}>
            <View style={styles.scoredRow}>
              <ThemedText style={[styles.scoredText, { color: palette.accent }]}>
                {lastEventLabel}
              </ThemedText>
            </View>
            <ThemedText style={[styles.outcomeText, { color: palette.textMuted }]}>
              {outcomeLabel}
            </ThemedText>
            <View style={styles.metricCardRow}>
              <View style={[styles.metricCard, { backgroundColor: palette.accentOverlay10 }]}>
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={scaleBySizeClass(18, sizeClass)}
                  color={palette.textInverse}
                />
                <View style={styles.metricTextBlock}>
                  <ThemedText style={[styles.metricValue, { color: palette.textInverse }]}>
                    {pointDetails.passCount}
                  </ThemedText>
                  <ThemedText style={[styles.metricLabel, { color: palette.textMuted }]}>
                    {pointDetails.passCount === 1 ? 'pass' : 'passes'}
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.metricCard, { backgroundColor: palette.accentOverlay10 }]}>
                <MaterialCommunityIcons
                  name="rotate-3d-variant"
                  size={scaleBySizeClass(18, sizeClass)}
                  color={palette.textInverse}
                />
                <View style={styles.metricTextBlock}>
                  <ThemedText style={[styles.metricValue, { color: palette.textInverse }]}>
                    {pointDetails.turnCount}
                  </ThemedText>
                  <ThemedText style={[styles.metricLabel, { color: palette.textMuted }]}>
                    {pointDetails.turnCount === 1 ? 'turn' : 'turns'}
                  </ThemedText>
                </View>
              </View>
              {pointContextStats.map((stat) => (
                <View
                  key={stat.label}
                  style={[styles.metricCard, { backgroundColor: palette.accentOverlay10 }]}>
                  <MaterialCommunityIcons
                    name={stat.icon}
                    size={scaleBySizeClass(18, sizeClass)}
                    color={palette.textInverse}
                  />
                  <View style={styles.metricTextBlock}>
                    <ThemedText style={[styles.metricValue, { color: palette.textInverse }]}>
                      {stat.value}
                    </ThemedText>
                    <ThemedText style={[styles.metricLabel, { color: palette.textMuted }]}>
                      {stat.label}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {goalInfo?.isFocusGoal === true && goalInfo.scorerName != null && (
            <View style={[styles.dividerLine, { backgroundColor: palette.overlay10 }]} />
          )}

          {goalInfo?.isFocusGoal === true && goalInfo.scorerName != null && (
            <View style={styles.statsRow}>
              {renderAttributionItem('Goal', goalInfo.scorerName)}
              {renderAttributionItem('Assist', goalInfo.assisterName)}
              {renderAttributionItem('Hockey', hockeyAssistName)}
            </View>
          )}

          {hasItems(lastPointPlayers) && (
            <>
              <View style={[styles.dividerLine, { backgroundColor: palette.overlay10 }]} />
              <View style={styles.lastPointSection}>
                <View style={styles.lastPointHeader}>
                  <MaterialCommunityIcons
                    name="account-group-outline"
                    size={scaleBySizeClass(15, sizeClass)}
                    color={palette.textMuted}
                  />
                  <ThemedText style={[styles.lastPointLabel, { color: palette.textMuted }]}>
                    Played last point
                  </ThemedText>
                </View>
                <View style={styles.chipGrid}>
                  {lastPointPlayers.map((player) => (
                    <PlayerChip
                      key={player.id}
                      name={player.name}
                      number={player.number}
                      matchingType={player.matchingType}
                      compact
                      onPress={() => {}}
                    />
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.bottomActions}>
        <View style={styles.buttonRow}>
          <Pressable
            testID="between-point-undo"
            style={({ pressed }) => [
              styles.iconBtn,
              {
                borderColor: palette.overlay20,
                backgroundColor: palette.overlay05,
              },
              pressed && { opacity: 0.7 },
            ]}
            onPress={undoLastOperation}>
            <MaterialCommunityIcons
              name="undo"
              size={scaleBySizeClass(22, sizeClass)}
              color={palette.textInverse}
            />
          </Pressable>
          <Pressable
            testID="between-point-start-next"
            style={({ pressed }) => [
              styles.actionBtn,
              styles.primaryBtn,
              {
                borderColor: palette.accent,
                backgroundColor: palette.accentOverlay10,
              },
              pressed && { opacity: 0.7 },
            ]}
            onPress={onStartNextPoint}>
            <ThemedText style={[styles.actionBtnText, { color: palette.accent }]}>
              NEXT POINT
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

function createStyles(sizeClass: SizeClass, palette: Palette) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-start' },
    summaryContent: {
      alignItems: 'center',
      paddingTop: scaleBySizeClass(28, sizeClass),
      paddingHorizontal: scaleBySizeClass(24, sizeClass),
      width: '100%',
      flex: 1,
    },
    summaryBand: {
      width: '100%',
      maxWidth: scaleBySizeClass(360, sizeClass),
      gap: scaleBySizeClass(16, sizeClass),
    },
    summaryHeaderColumn: {
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    scoredRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(8, sizeClass),
      width: '100%',
    },
    scoredText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(32, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      textAlign: 'center',
      flexShrink: 1,
    },
    outcomeText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(18, sizeClass),
      letterSpacing: 0.3,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    metricCardRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: scaleBySizeClass(10, sizeClass),
      width: '100%',
      marginTop: scaleBySizeClass(8, sizeClass),
      flexWrap: 'wrap',
    },
    metricCard: {
      width: scaleBySizeClass(156, sizeClass),
      minHeight: scaleBySizeClass(54, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
      borderCurve: 'continuous',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(8, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
    },
    metricTextBlock: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: scaleBySizeClass(4, sizeClass),
    },
    metricValue: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(18, sizeClass),
      fontVariant: ['tabular-nums'],
    },
    metricLabel: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(10, sizeClass),
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    dividerLine: {
      width: '100%',
      height: 1,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: scaleBySizeClass(10, sizeClass),
      width: '100%',
    },
    statItem: {
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
      flex: 1,
    },
    statLabel: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(9, sizeClass),
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statName: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(13, sizeClass),
      textAlign: 'center',
    },
    lastPointSection: {
      gap: scaleBySizeClass(8, sizeClass),
    },
    lastPointHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(6, sizeClass),
    },
    lastPointLabel: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(10, sizeClass),
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    timeoutContent: {
      alignItems: 'center',
      paddingTop: scaleBySizeClass(80, sizeClass),
      paddingHorizontal: scaleBySizeClass(32, sizeClass),
      width: '100%',
      flex: 1,
    },
    timeoutBlock: {
      width: '100%',
      maxWidth: scaleBySizeClass(340, sizeClass),
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    sideLabel: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(12, sizeClass),
      letterSpacing: 2,
    },
    iconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    timeoutLabel: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(16, sizeClass),
      letterSpacing: 3,
    },
    countdownTimer: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(72, sizeClass),
      fontVariant: ['tabular-nums'],
      letterSpacing: 2,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: scaleBySizeClass(12, sizeClass),
      width: '100%',
      maxWidth: scaleBySizeClass(340, sizeClass),
    },
    bottomActions: {
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: scaleBySizeClass(24, sizeClass),
      paddingBottom: scaleBySizeClass(48, sizeClass),
    },
    actionBtn: {
      paddingVertical: scaleBySizeClass(16, sizeClass),
      borderWidth: 1,
      borderRadius: 16,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtn: {
      width: scaleBySizeClass(58, sizeClass),
      paddingVertical: scaleBySizeClass(16, sizeClass),
      borderWidth: 1,
      borderRadius: 16,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtn: { flex: 2 },
    endTimeoutBtn: { flex: 1.6 },
    actionBtnText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(13, sizeClass),
      letterSpacing: 1,
      textAlign: 'center',
    },
  });
}

function getLastPointPlayers(
  point: TrackedPoint | null,
  focusSideId: string,
  participants: Participant[],
): Participant[] {
  if (point == null) return [];

  const line = point.lines.find((pointLine) => pointLine.sideId === focusSideId);
  if (line == null) return [];

  const participantIds = new Set(line.participantIds);
  const focusSideSubs = point.subs?.filter((sub) => sub.sideId === focusSideId) ?? [];
  for (const sub of focusSideSubs) {
    for (const inId of sub.inIds) {
      participantIds.add(inId);
    }
    for (const outId of sub.outIds) {
      participantIds.add(outId);
    }
  }

  return Array.from(participantIds)
    .map((participantId) => participants.find((participant) => participant.id === participantId))
    .filter((participant): participant is Participant => participant != null);
}
