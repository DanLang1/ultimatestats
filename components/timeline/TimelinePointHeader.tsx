import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatClockDuration } from '@/lib/timelineUtils';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

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
          <ThemedText style={[styles.pointBadgeText, { color: palette.textOnAccent }]}>
            {pointNumber}
          </ThemedText>
        </View>
        <ThemedText style={[styles.scoreText, { color: palette.textInverse }]}>
          {scoreAfter.team1} – {scoreAfter.team2}
        </ThemedText>
      </View>
      {isInProgress ? (
        <View style={[styles.statusChip, { backgroundColor: palette.accent }]}>
          <ThemedText style={[styles.statusChipText, { color: palette.textOnAccent }]}>
            IN PROGRESS
          </ThemedText>
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
              <ThemedText style={[styles.durationText, { color: palette.textMuted }]}>
                {formatClockDuration(pointDurationMs)}
              </ThemedText>
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
              <ThemedText
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
              </ThemedText>
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
      fontFamily: Fonts.bold,
    },
    scoreText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
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
      fontFamily: Fonts.semiBold,
    },
    statusChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusChipText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
    },
  });
}
