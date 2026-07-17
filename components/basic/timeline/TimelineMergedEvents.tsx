import * as Haptics from 'expo-haptics';
import React from 'react';

import TimelineEventSeparator from '@/components/basic/timeline/TimelineEventSeparator';
import TimelineTimeoutRow from '@/components/basic/timeline/TimelineTimeoutRow';
import TimelineTurnoverRow from '@/components/basic/timeline/TimelineTurnoverRow';
import {
  computeRoundedSplitMs,
  DisplayTurnover,
  formatClockDuration,
  TimelineEvent,
} from '@/lib/basic/timelineUtils';
import { Player } from '@/lib/storage/types';

interface TimelineMergedEventsProps {
  events: TimelineEvent[];
  roster: Player[];
  mmpColor: string;
  fmpColor: string;
  timingEnabled: boolean;
  showSplitSeparators: boolean;
  isCurrentPoint: boolean;
  onEditEvent?: (eventIndex: number, turnover: DisplayTurnover) => void;
  onEditEventTime?: (
    eventIndex: number,
    currentElapsedMs: number | undefined,
    eventType: 'turnover' | 'timeout',
  ) => void;
}

export default function TimelineMergedEvents({
  events,
  roster,
  mmpColor,
  fmpColor,
  timingEnabled,
  showSplitSeparators,
  isCurrentPoint,
  onEditEvent,
  onEditEventTime,
}: TimelineMergedEventsProps) {
  const previousElapsedByIndex = getPreviousElapsedByIndex(events);

  return (
    <>
      {events.map((event, index) => {
        const isFirst = index === 0;
        const currentElapsedMs = event.data.elapsedMs;
        const previousElapsedMs = previousElapsedByIndex[index];
        const splitMs =
          !isFirst &&
          timingEnabled &&
          showSplitSeparators &&
          currentElapsedMs !== undefined &&
          previousElapsedMs !== undefined &&
          currentElapsedMs >= previousElapsedMs
            ? computeRoundedSplitMs(previousElapsedMs, currentElapsedMs)
            : undefined;

        const relativeTime =
          currentElapsedMs !== undefined ? formatClockDuration(currentElapsedMs) : undefined;

        if (event.kind === 'timeout') {
          const timeout = event.data;
          const canEditTime = !!onEditEventTime && !isCurrentPoint;
          const handlePress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onEditEventTime?.(timeout.eventIndex, timeout.elapsedMs, 'timeout');
          };

          return (
            <React.Fragment key={`timeout-${event.originalIndex}`}>
              {!isFirst && (
                <TimelineEventSeparator
                  splitMs={splitMs}
                  timingEnabled={timingEnabled}
                  showSplitSeparators={showSplitSeparators}
                />
              )}
              <TimelineTimeoutRow
                timeout={timeout}
                relativeTime={relativeTime}
                canEditTime={canEditTime}
                onEditTime={handlePress}
              />
            </React.Fragment>
          );
        }

        const turnover = event.data;
        const canEdit = !!onEditEvent && !isCurrentPoint;
        const canEditTime = !!onEditEventTime && !isCurrentPoint;
        const handleEditTime = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onEditEventTime?.(turnover.eventIndex, turnover.elapsedMs, 'turnover');
        };
        const handleLongPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onEditEvent?.(turnover.eventIndex, turnover);
        };

        return (
          <React.Fragment key={`turnover-${event.originalIndex}`}>
            {!isFirst && (
              <TimelineEventSeparator
                splitMs={splitMs}
                timingEnabled={timingEnabled}
                showSplitSeparators={showSplitSeparators}
              />
            )}
            <TimelineTurnoverRow
              turnover={turnover}
              roster={roster}
              mmpColor={mmpColor}
              fmpColor={fmpColor}
              relativeTime={relativeTime}
              canEditTime={canEditTime}
              onEditTime={handleEditTime}
              canLongPress={canEdit}
              onLongPress={handleLongPress}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

function getPreviousElapsedByIndex(events: TimelineEvent[]) {
  const previousElapsedByIndex: (number | undefined)[] = [];
  let previousElapsedMs: number | undefined;

  for (const event of events) {
    previousElapsedByIndex.push(previousElapsedMs);
    if (event.data.elapsedMs !== undefined) {
      previousElapsedMs = event.data.elapsedMs;
    }
  }

  return previousElapsedByIndex;
}
