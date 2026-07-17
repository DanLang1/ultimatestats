import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import TimelineInteractiveRow from '@/components/basic/timeline/TimelineInteractiveRow';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatClockDuration } from '@/lib/basic/timelineUtils';
import { Fonts } from '@/theme/theme';

interface TimelineGoalSectionProps {
  isCallahan: boolean;
  isTeam1: boolean;
  teamColor: string;
  currentPointNumber: number | undefined;
  pointNumber: number;
  team2Name: string;
  goalEventIndex: number;
  goalPlayerId: string | null;
  assistPlayerId: string | null;
  goalName: string | null;
  assistName: string | null;
  goalMatchingColor: string;
  assistMatchingColor: string;
  pointDurationMs?: number;
  onEditGoal?: (
    eventIndex: number,
    playerId: string | null,
    editField: 'scorer' | 'assist',
  ) => void;
  onEditPointDuration?: (goalEventIndex: number, currentDurationMs: number | undefined) => void;
}

export default function TimelineGoalSection({
  isCallahan,
  isTeam1,
  teamColor,
  currentPointNumber,
  pointNumber,
  team2Name,
  goalEventIndex,
  goalPlayerId,
  assistPlayerId,
  goalName,
  assistName,
  goalMatchingColor,
  assistMatchingColor,
  pointDurationMs,
  onEditGoal,
  onEditPointDuration,
}: TimelineGoalSectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const isCurrentPoint = currentPointNumber === pointNumber;

  const handleEditTime = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEditPointDuration?.(goalEventIndex, pointDurationMs);
  };

  const handleEditScorer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onEditGoal?.(goalEventIndex, goalPlayerId, 'scorer');
  };

  const handleEditAssist = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onEditGoal?.(goalEventIndex, assistPlayerId, 'assist');
  };

  const renderDuration = () =>
    pointDurationMs !== undefined && pointDurationMs > 0 ? (
      <ThemedText style={[styles.eventTimestamp, { color: palette.textMuted }]}>
        {formatClockDuration(pointDurationMs)}
      </ThemedText>
    ) : null;

  if (isCallahan) {
    const canEditScorer = !!onEditGoal && !isCurrentPoint;
    const canEditTime = !!onEditPointDuration && !isCurrentPoint;

    return (
      <TimelineInteractiveRow
        canTap={canEditTime}
        onTap={handleEditTime}
        canLongPress={canEditScorer}
        onLongPress={handleEditScorer}>
        <View
          style={[
            styles.eventRow,
            {
              backgroundColor: palette.successOverlay15,
              borderColor: palette.success,
              borderWidth: 1,
            },
          ]}>
          <ThemedText style={[styles.eventLabel, { color: palette.success }]}>CALLAHAN</ThemedText>
          <ThemedText style={[styles.eventPlayer, { color: goalMatchingColor }]} numberOfLines={1}>
            {goalName}
          </ThemedText>
          {renderDuration()}
        </View>
      </TimelineInteractiveRow>
    );
  }

  const canEditGoal = !!onEditGoal && isTeam1 && !isCurrentPoint;
  const canEditAssist = !!onEditGoal && !isCurrentPoint;
  const canEditTime = !!onEditPointDuration && !isCurrentPoint;

  return (
    <>
      <TimelineInteractiveRow
        canTap={canEditTime}
        onTap={handleEditTime}
        canLongPress={canEditGoal}
        onLongPress={handleEditScorer}>
        <View
          style={[
            styles.eventRow,
            { backgroundColor: palette.overlay05 },
            canEditGoal && {
              borderColor: teamColor,
              borderWidth: 1,
            },
          ]}>
          <ThemedText style={[styles.eventLabel, { color: teamColor }]}>GOAL</ThemedText>
          <ThemedText
            style={[
              styles.eventPlayer,
              { color: isTeam1 ? goalMatchingColor : palette.textInverse },
            ]}
            numberOfLines={1}>
            {isTeam1 ? goalName || 'Unknown' : team2Name}
          </ThemedText>
          {renderDuration()}
        </View>
      </TimelineInteractiveRow>

      {isTeam1 && assistName && (
        <>
          <ThemedText style={[styles.plus, { color: palette.textMuted }]}>+</ThemedText>
          <TimelineInteractiveRow
            canTap={canEditTime}
            onTap={handleEditTime}
            canLongPress={canEditAssist}
            onLongPress={handleEditAssist}>
            <View
              style={[
                styles.eventRow,
                { backgroundColor: palette.overlay05 },
                canEditAssist && {
                  borderColor: palette.accent,
                  borderWidth: 1,
                },
              ]}>
              <ThemedText style={[styles.eventLabel, { color: palette.accent }]}>ASSIST</ThemedText>
              <ThemedText
                style={[styles.eventPlayer, { color: assistMatchingColor }]}
                numberOfLines={1}>
                {assistName}
              </ThemedText>
              {renderDuration()}
            </View>
          </TimelineInteractiveRow>
        </>
      )}
    </>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    eventLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.3,
    },
    eventPlayer: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      maxWidth: 100,
      flexShrink: 1,
    },
    eventTimestamp: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      marginLeft: 4,
      opacity: 0.7,
    },
    plus: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
      lineHeight: scaleBySizeClass(30, sizeClass),
    },
  });
}
