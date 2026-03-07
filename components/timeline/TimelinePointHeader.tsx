import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatClockDuration } from '@/lib/timelineUtils';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TimelinePointHeaderProps {
  pointNumber: number;
  scoreAfter: { team1: number; team2: number };
  teamColor: string;
  isInProgress: boolean;
  pointDurationMs?: number;
  possessionType: 'hold' | 'break' | null;
  isTeam1: boolean;
}

export default function TimelinePointHeader({
  pointNumber,
  scoreAfter,
  teamColor,
  isInProgress,
  pointDurationMs,
  possessionType,
  isTeam1,
}: TimelinePointHeaderProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={[styles.cardHeader, { borderBottomColor: palette.overlay10 }]}>
      <View style={styles.headerLeft}>
        <View style={[styles.pointBadge, { backgroundColor: teamColor }]}>
          <Text style={[styles.pointBadgeText, { color: palette.textOnAccent }]}>
            {pointNumber}
          </Text>
        </View>
        <Text style={[styles.scoreText, { color: palette.textInverse }]}>
          {scoreAfter.team1} – {scoreAfter.team2}
        </Text>
      </View>
      {isInProgress ? (
        <View style={[styles.statusChip, { backgroundColor: palette.accent }]}>
          <Text style={[styles.statusChipText, { color: palette.textOnAccent }]}>IN PROGRESS</Text>
        </View>
      ) : (
        <View style={styles.headerRight}>
          {pointDurationMs !== undefined && pointDurationMs > 0 && (
            <View style={styles.durationSummary}>
              <MaterialCommunityIcons
                name="timer-outline"
                size={scaleBySizeClass(12, sizeClass)}
                color={palette.textMuted}
              />
              <Text style={[styles.durationText, { color: palette.textMuted }]}>
                {formatClockDuration(pointDurationMs)}
              </Text>
            </View>
          )}
          {possessionType && (
            <View
              style={[
                styles.statusChip,
                {
                  backgroundColor:
                    possessionType === 'break'
                      ? isTeam1
                        ? palette.success
                        : palette.danger
                      : palette.overlay15,
                },
              ]}>
              <Text
                style={[
                  styles.statusChipText,
                  {
                    color:
                      possessionType === 'break'
                        ? palette.textOnAccent
                        : isTeam1
                          ? palette.success
                          : palette.danger,
                  },
                ]}>
                {possessionType === 'break'
                  ? isTeam1
                    ? 'BROKE'
                    : 'BROKEN'
                  : isTeam1
                    ? 'HOLD'
                    : 'OPP HOLD'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    pointBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pointBadgeText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '700',
    },
    scoreText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontWeight: '600',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    durationSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: scaleBySizeClass(18, sizeClass),
      justifyContent: 'center',
    },
    durationText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
    },
    statusChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusChipText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '700',
      letterSpacing: 0.5,
    },
  });
}
