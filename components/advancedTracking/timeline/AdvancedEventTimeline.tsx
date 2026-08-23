import { Fragment } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import AdvancedTimelinePointCard from '@/components/advancedTracking/timeline/AdvancedTimelinePointCard';
import AdvancedTimelineTransitionDivider from '@/components/advancedTracking/timeline/AdvancedTimelineTransitionDivider';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { AdvancedActionLocator } from '@/lib/advancedTracking/advancedActionCorrectionUtils';
import type { AdvancedTimelinePoint } from '@/lib/advancedTracking/advancedTimelineUtils';
import type { GameStatus } from '@/lib/advancedTracking/types';
import { hasItems } from '@/lib/utils';
import { Fonts } from '@/theme/theme';

interface AdvancedEventTimelineProps {
  points: AdvancedTimelinePoint[];
  gameStatus: GameStatus;
  focusSideId: string;
  oppSideId: string;
  sideLabels: Record<string, string>;
  editableGoalActionIds?: ReadonlySet<string>;
  onEditGoalScorer?: (locator: AdvancedActionLocator) => void;
  editableLinePointIds?: ReadonlySet<string>;
  onEditLineups?: (point: AdvancedTimelinePoint) => void;
}

export default function AdvancedEventTimeline({
  points,
  gameStatus,
  focusSideId,
  oppSideId,
  sideLabels,
  editableGoalActionIds,
  onEditGoalScorer,
  editableLinePointIds,
  onEditLineups,
}: AdvancedEventTimelineProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const lastPoint = points.at(-1);
  const finalScores = lastPoint?.scoreAfter ?? { [focusSideId]: 0, [oppSideId]: 0 };

  const focusScore = finalScores[focusSideId] ?? 0;
  const oppScore = finalScores[oppSideId] ?? 0;

  const isGoalScorerEditingEnabled =
    onEditGoalScorer != null && editableGoalActionIds != null && editableGoalActionIds.size > 0;

  return (
    <View style={styles.container}>
      {/* Score Header */}
      <View style={[styles.scoreHeader, { backgroundColor: palette.overlay05 }]}>
        <ThemedText style={[styles.headerScore, { color: palette.success }]}>
          {focusScore}
        </ThemedText>
        <ThemedText style={[styles.headerDivider, { color: palette.textMuted }]}>–</ThemedText>
        <ThemedText style={[styles.headerScore, { color: palette.danger }]}>{oppScore}</ThemedText>
        <ThemedText style={[styles.headerLabel, { color: palette.textSecondary }]}>
          {gameStatus === 'in_progress' ? 'In Progress' : 'Final'}
        </ThemedText>
      </View>

      {/* Timeline */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {isGoalScorerEditingEnabled && (
          <ThemedText style={[styles.editHint, { color: palette.textMuted }]}>
            Long press a goal to edit who scored
          </ThemedText>
        )}
        {points.map((point) => (
          <Fragment key={point.pointId}>
            <AdvancedTimelinePointCard
              point={point}
              focusSideId={focusSideId}
              oppSideId={oppSideId}
              sideLabels={sideLabels}
              editableGoalActionIds={editableGoalActionIds}
              onEditGoalScorer={onEditGoalScorer}
              onEditLineups={
                editableLinePointIds?.has(point.pointId) && onEditLineups != null
                  ? () => onEditLineups(point)
                  : undefined
              }
            />
            {hasItems(point.transitionsAfter) &&
              point.transitionsAfter.map((transition) => (
                <AdvancedTimelineTransitionDivider
                  key={transition.id}
                  transition={transition}
                  sideLabels={sideLabels}
                />
              ))}
            {hasItems(point.gameTransitionsAfter) &&
              point.gameTransitionsAfter.map((transition) => (
                <AdvancedTimelineTransitionDivider
                  key={transition.id}
                  transition={transition}
                  sideLabels={sideLabels}
                />
              ))}
          </Fragment>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
      gap: 12,
    },
    scoreHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      marginHorizontal: 16,
      borderRadius: 12,
      gap: 10,
    },
    headerScore: {
      fontSize: scaleBySizeClass(28, sizeClass),
      fontFamily: Fonts.bold,
    },
    headerDivider: {
      fontSize: scaleBySizeClass(20, sizeClass),
    },
    headerLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
      marginLeft: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 12,
    },
    editHint: {
      marginBottom: -4,
      fontSize: scaleBySizeClass(11, sizeClass),
      fontStyle: 'italic',
    },
  });
}
