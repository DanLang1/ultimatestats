import LineupBlock from '@/components/advancedTracking/timeline/LineupBlock';
import TimelineFlowRow from '@/components/advancedTracking/timeline/TimelineFlowRow';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  createPointFlowItems,
  getPointStateLabel,
} from '@/lib/advancedTracking/advancedTimelineUtils';
import type { AdvancedTimelinePoint } from '@/lib/advancedTracking/advancedTimelineUtils';
import { formatClockDuration } from '@/lib/durationFormatUtils';
import { hasItems } from '@/lib/utils';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface AdvancedTimelinePointCardProps {
  point: AdvancedTimelinePoint;
  focusSideId: string;
  oppSideId: string;
  sideLabels: Record<string, string>;
}

export default function AdvancedTimelinePointCard({
  point,
  focusSideId,
  oppSideId,
  sideLabels,
}: AdvancedTimelinePointCardProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const focusScore = point.scoreAfter[focusSideId] ?? 0;
  const oppScore = point.scoreAfter[oppSideId] ?? 0;
  const flowItems = createPointFlowItems(point.possessions);

  const isFocusScored = point.scoringSideId === focusSideId;
  const isOppScored = point.scoringSideId === oppSideId;
  const isInProgress = point.state === 'in_progress';

  let headerColor: string;
  if (isInProgress) {
    headerColor = palette.accent;
  } else if (isFocusScored) {
    headerColor = palette.success;
  } else if (isOppScored) {
    headerColor = palette.danger;
  } else {
    headerColor = palette.textMuted;
  }

  const stateLabel = getPointStateLabel(point.state);

  return (
    <View style={[styles.card, { backgroundColor: palette.overlay08 }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.pointBadge, { backgroundColor: headerColor }]}>
            <ThemedText style={[styles.pointBadgeText, { color: palette.textOnAccent }]}>
              {point.pointNumber}
            </ThemedText>
          </View>
          <ThemedText style={[styles.scoreText, { color: palette.textInverse }]}>
            {focusScore} – {oppScore}
          </ThemedText>
          {point.half === 2 && (
            <View style={[styles.halfBadge, { backgroundColor: palette.overlay12 }]}>
              <ThemedText style={[styles.halfBadgeText, { color: palette.textSecondary }]}>
                2H
              </ThemedText>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {point.durationMs != null && point.durationMs > 0 && (
            <View style={styles.durationRow}>
              <MaterialCommunityIcons
                name="timer-outline"
                size={scaleBySizeClass(12, sizeClass)}
                color={palette.textMuted}
              />
              <ThemedText style={[styles.durationText, { color: palette.textMuted }]}>
                {formatClockDuration(point.durationMs)}
              </ThemedText>
            </View>
          )}
          <View style={[styles.stateChip, { backgroundColor: palette.overlay12 }]}>
            <ThemedText style={[styles.stateChipText, { color: headerColor }]}>
              {stateLabel.toUpperCase()}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Body - unified possession and action flow */}
      <View style={styles.body}>
        {flowItems.map((item, index) => (
          <TimelineFlowRow
            key={item.id}
            item={item}
            isFirst={index === 0}
            isLast={index === flowItems.length - 1}
            sideLabels={sideLabels}
            focusSideId={focusSideId}
            oppSideId={oppSideId}
            subs={point.subs}
          />
        ))}
      </View>

      {/* Lineup footer */}
      <View style={[styles.lineupSection, { borderTopColor: palette.overlay10 }]}>
        <LineupBlock players={point.linesBySide[focusSideId] ?? []} />
        {hasItems(point.linesBySide[oppSideId]) ? (
          <LineupBlock players={point.linesBySide[oppSideId] ?? []} />
        ) : null}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      borderRadius: 14,
      overflow: 'hidden',
    },
    header: {
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
      width: 28,
      height: 28,
      borderRadius: 14,
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
    halfBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    halfBadgeText: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.bold,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    durationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    durationText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    stateChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    stateChipText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
    },
    body: {
      padding: 12,
      paddingLeft: 10,
    },
    lineupSection: {
      padding: 12,
      gap: 10,
      borderTopWidth: 1,
    },
  });
}
