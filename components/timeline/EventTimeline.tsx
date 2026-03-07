import TimelinePointCard from '@/components/timeline/TimelinePointCard';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getAllPlayersByPoint } from '@/lib/lineUtils';
import { Player, PointLineRecord } from '@/lib/storage/types';
import { DisplayTurnover, PointEvents } from '@/lib/timelineUtils';
import { useSettingsStore } from '@/store/settingsStore';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface EventTimelineProps {
  points: PointEvents[];
  isSavedGame?: boolean;
  team2Name: string;
  gameTo: number;
  roster: Player[];
  timingEnabled?: boolean;
  showSplitSeparators?: boolean;
  pointLines?: PointLineRecord[];
  showLineups?: boolean;
  currentPoint?: number; // For live games: disable editing of current point
  onEditEvent?: (eventIndex: number, turnover: DisplayTurnover) => void;
  onEditGoal?: (
    eventIndex: number,
    playerId: string | null,
    editField: 'scorer' | 'assist',
  ) => void;
  onEditPointDuration?: (goalEventIndex: number, currentDurationMs: number | undefined) => void;
  onEditEventTime?: (
    eventIndex: number,
    currentElapsedMs: number | undefined,
    eventType: 'turnover' | 'timeout',
  ) => void;
}

export default function EventTimeline({
  points,
  isSavedGame,
  team2Name,
  gameTo,
  roster,
  timingEnabled = false,
  showSplitSeparators = false,
  pointLines,
  showLineups = false,
  currentPoint,
  onEditEvent,
  onEditGoal,
  onEditPointDuration,
  onEditEventTime,
}: EventTimelineProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { mmpColor, fmpColor } = useSettingsStore();

  const finalScore =
    points.length > 0 ? points[points.length - 1].scoreAfter : { team1: 0, team2: 0 };

  const playersByPoint = getAllPlayersByPoint(pointLines ?? []);

  const isGameComplete = finalScore.team1 >= gameTo || finalScore.team2 >= gameTo || isSavedGame;

  return (
    <View style={styles.container}>
      {/* Score Header */}
      <View style={[styles.scoreHeader, { backgroundColor: palette.overlay05 }]}>
        <Text style={[styles.headerScore, { color: palette.success }]}>{finalScore.team1}</Text>
        <Text style={[styles.headerDivider, { color: palette.textMuted }]}>–</Text>
        <Text style={[styles.headerScore, { color: palette.danger }]}>{finalScore.team2}</Text>
        <Text style={[styles.headerLabel, { color: palette.textSecondary }]}>
          {isGameComplete ? 'Final' : 'In Progress'}
        </Text>
      </View>

      {/* Timeline */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {/* Edit hint */}
        {(onEditEvent || onEditPointDuration || onEditEventTime) && (
          <View style={styles.editHint}>
            {onEditEvent && (
              <Text style={[styles.editHintText, { color: palette.textMuted }]}>
                Long press event to edit type or player
              </Text>
            )}
            {(onEditPointDuration || onEditEventTime) && (
              <Text style={[styles.editHintText, { color: palette.textMuted }]}>
                Tap event to edit time
              </Text>
            )}
          </View>
        )}

        {points.map((point) => {
          return (
            <TimelinePointCard
              key={point.pointNumber}
              point={point}
              team2Name={team2Name}
              roster={roster}
              timingEnabled={timingEnabled}
              showSplitSeparators={showSplitSeparators}
              showLineups={showLineups}
              currentPoint={currentPoint}
              pointPlayerIds={Array.from(playersByPoint.get(point.pointNumber) ?? [])}
              pointRecords={
                pointLines?.filter((record) => record.pointNumber === point.pointNumber) ?? []
              }
              mmpColor={mmpColor}
              fmpColor={fmpColor}
              onEditEvent={onEditEvent}
              onEditGoal={onEditGoal}
              onEditPointDuration={onEditPointDuration}
              onEditEventTime={onEditEventTime}
            />
          );
        })}
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
    // Header
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
      fontWeight: '700',
    },
    headerDivider: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontWeight: '300',
    },
    headerLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
      marginLeft: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    // List
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 12,
    },
    editHint: {
      alignItems: 'flex-start',
      marginBottom: -4,
    },
    editHintText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontStyle: 'italic',
    },
  });
}
