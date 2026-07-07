import TimelineEventSeparator from '@/components/basic/timeline/TimelineEventSeparator';
import TimelineGoalSection from '@/components/basic/timeline/TimelineGoalSection';
import TimelineLineupFooter from '@/components/basic/timeline/TimelineLineupFooter';
import TimelineMergedEvents from '@/components/basic/timeline/TimelineMergedEvents';
import TimelinePointHeader from '@/components/basic/timeline/TimelinePointHeader';
import { useTheme } from '@/context/ThemeContext';
import { getPlayerMatchingType, getPlayerName } from '@/lib/playerUtils';
import { Player, PointLineRecord } from '@/lib/storage/types';
import {
  buildPointCardTimelineData,
  DisplayTurnover,
  getMatchingTypeColor,
  PointEvents,
} from '@/lib/basic/timelineUtils';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface TimelinePointCardProps {
  point: PointEvents;
  team2Name: string;
  roster: Player[];
  timingEnabled: boolean;
  showSplitSeparators: boolean;
  showLineups: boolean;
  currentPoint?: number;
  pointPlayerIds: string[];
  pointRecords: PointLineRecord[];
  mmpColor: string;
  fmpColor: string;
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

export default function TimelinePointCard({
  point,
  team2Name,
  roster,
  timingEnabled,
  showSplitSeparators,
  showLineups,
  currentPoint,
  pointPlayerIds,
  pointRecords,
  mmpColor,
  fmpColor,
  onEditEvent,
  onEditGoal,
  onEditPointDuration,
  onEditEventTime,
}: TimelinePointCardProps) {
  const { palette } = useTheme();

  const isInProgress = point.isInProgress === true;
  const isTeam1 = point.scoringTeam === 'team1';
  let teamColor: string;
  if (isInProgress) {
    teamColor = palette.accent;
  } else if (isTeam1) {
    teamColor = palette.success;
  } else {
    teamColor = palette.danger;
  }

  const goalName = getPlayerName(roster, point.goalPlayerId);
  const assistName = getPlayerName(roster, point.assistPlayerId);
  const goalMatchingType = getPlayerMatchingType(roster, point.goalPlayerId);
  const assistMatchingType = getPlayerMatchingType(roster, point.assistPlayerId);
  const goalMatchingColor = getMatchingTypeColor(goalMatchingType, {
    mmpColor,
    fmpColor,
    fallbackColor: palette.textInverse,
  });
  const assistMatchingColor = getMatchingTypeColor(assistMatchingType, {
    mmpColor,
    fmpColor,
    fallbackColor: palette.textInverse,
  });
  const { isCallahan, mergedEvents, hasVisibleEvents, splitToGoalMs } = buildPointCardTimelineData(
    point,
    {
      isTeam1,
      timingEnabled,
      showSplitSeparators,
    },
  );

  return (
    <View style={[styles.pointCard, { backgroundColor: palette.overlay08 }]}>
      <TimelinePointHeader
        pointNumber={point.pointNumber}
        scoreAfter={point.scoreAfter}
        teamColor={teamColor}
        isInProgress={isInProgress}
        pointDurationMs={point.pointDurationMs}
        possessionType={point.possessionType}
        isTeam1={isTeam1}
      />

      <View style={styles.cardBody}>
        <TimelineMergedEvents
          events={mergedEvents}
          roster={roster}
          mmpColor={mmpColor}
          fmpColor={fmpColor}
          timingEnabled={timingEnabled}
          showSplitSeparators={showSplitSeparators}
          isCurrentPoint={currentPoint === point.pointNumber}
          onEditEvent={onEditEvent}
          onEditEventTime={onEditEventTime}
        />

        {!isInProgress && hasVisibleEvents && (
          <TimelineEventSeparator
            splitMs={splitToGoalMs}
            timingEnabled={timingEnabled}
            showSplitSeparators={showSplitSeparators}
          />
        )}

        {!isInProgress && (
          <TimelineGoalSection
            isCallahan={isCallahan}
            isTeam1={isTeam1}
            teamColor={teamColor}
            currentPointNumber={currentPoint}
            pointNumber={point.pointNumber}
            team2Name={team2Name}
            goalEventIndex={point.goalEventIndex}
            goalPlayerId={point.goalPlayerId}
            assistPlayerId={point.assistPlayerId}
            goalName={goalName}
            assistName={assistName}
            goalMatchingColor={goalMatchingColor}
            assistMatchingColor={assistMatchingColor}
            pointDurationMs={point.pointDurationMs}
            onEditGoal={onEditGoal}
            onEditPointDuration={onEditPointDuration}
          />
        )}
      </View>

      {showLineups && pointPlayerIds.length > 0 && (
        <TimelineLineupFooter
          playerIds={pointPlayerIds}
          pointRecords={pointRecords}
          roster={roster}
          mmpColor={mmpColor}
          fmpColor={fmpColor}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pointCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
});
