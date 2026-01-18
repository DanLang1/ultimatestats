import { useTheme } from '@/context/ThemeContext';
import { getPlayerName } from '@/lib/playerUtils';
import { Player } from '@/lib/storage/types';
import { DisplayTurnover, PointEvents } from '@/lib/timelineUtils';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// Format milliseconds to "Xm Ys" or just "Xs" for short durations
const formatDuration = (ms: number): string => {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

interface EventTimelineProps {
  points: PointEvents[];
  isSavedGame?: boolean;
  team2Name: string;
  gameTo: number;
  roster: Player[];
  currentPoint?: number; // For live games: disable editing of current point
  onEditEvent?: (eventIndex: number, turnover: DisplayTurnover) => void;
  onEditGoal?: (
    eventIndex: number,
    playerId: string | null,
    editField: 'scorer' | 'assist',
  ) => void;
}

export default function EventTimeline({
  points,
  isSavedGame,
  team2Name,
  gameTo,
  roster,
  currentPoint,
  onEditEvent,
  onEditGoal,
}: EventTimelineProps) {
  const { palette } = useTheme();

  const handleLongPressTurnover = (turnover: DisplayTurnover) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onEditEvent?.(turnover.eventIndex, turnover);
  };

  const finalScore =
    points.length > 0 ? points[points.length - 1].scoreAfter : { team1: 0, team2: 0 };

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
        {onEditEvent && (
          <View style={styles.editHint}>
            <Text style={[styles.editHintText, { color: palette.textMuted }]}>
              Long press bordered events to edit
            </Text>
          </View>
        )}

        {points.map((point) => {
          const isInProgress = point.isInProgress === true;
          const isTeam1 = point.scoringTeam === 'team1';
          const teamColor = isInProgress
            ? palette.accent
            : isTeam1
              ? palette.success
              : palette.danger;

          // Resolve player IDs to names
          const goalName = getPlayerName(roster, point.goalPlayerId);
          const assistName = getPlayerName(roster, point.assistPlayerId);

          const isCallahan = isTeam1 && point.assistPlayerId === 'OTHER_TEAM';
          const callahanBlockIndex = isCallahan
            ? point.turnovers.findLastIndex(
                (t) => t.type === 'block' && t.playerId === point.goalPlayerId,
              )
            : -1;

          return (
            <View
              key={point.pointNumber}
              style={[styles.pointCard, { backgroundColor: palette.overlay08 }]}>
              {/* Card Header */}
              <View style={[styles.cardHeader, { borderBottomColor: palette.overlay10 }]}>
                <View style={styles.headerLeft}>
                  <View style={[styles.pointBadge, { backgroundColor: teamColor }]}>
                    <Text style={[styles.pointBadgeText, { color: palette.textOnAccent }]}>
                      {point.pointNumber}
                    </Text>
                  </View>
                  <Text style={[styles.scoreText, { color: palette.textInverse }]}>
                    {point.scoreAfter.team1} – {point.scoreAfter.team2}
                  </Text>
                </View>
                {isInProgress ? (
                  <View style={[styles.statusChip, { backgroundColor: palette.accent }]}>
                    <Text style={[styles.statusChipText, { color: palette.textOnAccent }]}>
                      IN PROGRESS
                    </Text>
                  </View>
                ) : (
                  <View style={styles.headerRight}>
                    {/* Point Duration */}
                    {point.pointDurationMs !== undefined && point.pointDurationMs > 0 && (
                      <View style={[styles.durationChip, { backgroundColor: palette.overlay10 }]}>
                        <MaterialCommunityIcons
                          name="timer-outline"
                          size={12}
                          color={palette.textMuted}
                        />
                        <Text style={[styles.durationText, { color: palette.textMuted }]}>
                          {formatDuration(point.pointDurationMs)}
                        </Text>
                      </View>
                    )}
                    {/* Hold/Break Chip */}
                    {point.possessionType && (
                      <View
                        style={[
                          styles.statusChip,
                          {
                            backgroundColor:
                              point.possessionType === 'break'
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
                                point.possessionType === 'break'
                                  ? palette.textOnAccent
                                  : isTeam1
                                    ? palette.success
                                    : palette.danger,
                            },
                          ]}>
                          {point.possessionType === 'break'
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

              {/* Card Body - Linearized Events */}
              <View style={styles.cardBody}>
                {/* Turnovers (in order) */}
                {point.turnovers.map((turnover, index) => {
                  if (index === callahanBlockIndex) return null;

                  const isOpponent = turnover.team === 'team2';
                  const turnoverPlayerName = getPlayerName(roster, turnover.playerId);
                  const turnoverPlayer2Name = getPlayerName(roster, turnover.player2Id ?? null);

                  const label =
                    turnover.type === 'block'
                      ? 'Block'
                      : turnover.type === 'drop'
                        ? 'Drop'
                        : turnover.type === 'fiftyfifty'
                          ? '50/50'
                          : 'Throwaway';

                  const bgColor =
                    turnover.type === 'block' ? palette.success + '20' : palette.danger + '20';

                  // Show arrow if not the first non-null turnover
                  const isFirstVisible =
                    (index === 0 && callahanBlockIndex !== 0) ||
                    (index === 1 && callahanBlockIndex === 0);

                  // Disable editing for current point in live games
                  const isCurrentPoint =
                    currentPoint !== undefined && point.pointNumber === currentPoint;
                  const canEdit = onEditEvent && !isCurrentPoint && !isOpponent;

                  // Calculate relative time since point start
                  const relativeTime =
                    point.pointStartTimestamp && turnover.timestamp
                      ? formatDuration(turnover.timestamp - point.pointStartTimestamp)
                      : undefined;

                  return (
                    <React.Fragment key={`turnover-${index}`}>
                      {index > 0 && !isFirstVisible && (
                        <Text style={[styles.arrow, { color: palette.textMuted }]}>→</Text>
                      )}
                      <Pressable
                        onLongPress={canEdit ? () => handleLongPressTurnover(turnover) : undefined}
                        delayLongPress={400}>
                        <View
                          style={[
                            styles.eventRow,
                            { backgroundColor: isOpponent ? palette.overlay10 : bgColor },
                            canEdit && {
                              borderColor:
                                turnover.type === 'block' ? palette.success : palette.danger,
                              borderWidth: 1,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.eventLabel,
                              { color: isOpponent ? palette.textMuted : palette.textInverse },
                            ]}>
                            {isOpponent ? `OPP ${label.toUpperCase()}` : label.toUpperCase()}
                          </Text>
                          {turnoverPlayerName && (
                            <Text
                              style={[
                                styles.eventPlayer,
                                {
                                  color: isOpponent ? palette.textMuted : palette.textInverse,
                                  flexShrink:
                                    turnover.type === 'fiftyfifty' && turnoverPlayer2Name ? 1 : 0,
                                  maxWidth:
                                    turnover.type === 'fiftyfifty' && turnoverPlayer2Name
                                      ? '40%'
                                      : undefined,
                                },
                              ]}
                              numberOfLines={1}>
                              {turnoverPlayerName}
                            </Text>
                          )}
                          {turnover.type === 'fiftyfifty' && turnoverPlayer2Name && (
                            <>
                              <Text
                                style={[
                                  styles.eventLabel,
                                  {
                                    color: isOpponent ? palette.textMuted : palette.textInverse,
                                    opacity: 0.7,
                                  },
                                ]}>
                                &
                              </Text>
                              <Text
                                style={[
                                  styles.eventPlayer,
                                  {
                                    color: isOpponent ? palette.textMuted : palette.textInverse,
                                    opacity: 0.9,
                                    flexShrink: 1,
                                    maxWidth: '40%',
                                  },
                                ]}
                                numberOfLines={1}>
                                {turnoverPlayer2Name}
                              </Text>
                            </>
                          )}
                          {/* Relative timestamp */}
                          {relativeTime && (
                            <Text style={[styles.eventTimestamp, { color: palette.textMuted }]}>
                              +{relativeTime}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    </React.Fragment>
                  );
                })}

                {/* Arrow before Goal/Callahan - only show if there are visible turnovers and point is complete */}
                {!isInProgress &&
                  point.turnovers.length > 0 &&
                  !(isCallahan && point.turnovers.length === 1) && (
                    <Text style={[styles.arrow, { color: palette.textMuted }]}>→</Text>
                  )}

                {/* Goal/Assist section - only for completed points */}
                {!isInProgress &&
                  (isCallahan ? (
                    <Pressable
                      onLongPress={
                        onEditGoal && currentPoint !== point.pointNumber
                          ? () => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                              onEditGoal(point.goalEventIndex, point.goalPlayerId, 'scorer');
                            }
                          : undefined
                      }
                      delayLongPress={400}>
                      <View
                        style={[
                          styles.eventRow,
                          {
                            backgroundColor: palette.successOverlay15,
                            borderColor: palette.success,
                            borderWidth: 1,
                          },
                        ]}>
                        <Text style={[styles.eventLabel, { color: palette.success }]}>
                          CALLAHAN
                        </Text>
                        <Text
                          style={[styles.eventPlayer, { color: palette.textInverse }]}
                          numberOfLines={1}>
                          {goalName}
                        </Text>
                        {/* Point duration timestamp */}
                        {point.pointDurationMs !== undefined && point.pointDurationMs > 0 && (
                          <Text style={[styles.eventTimestamp, { color: palette.textMuted }]}>
                            +{formatDuration(point.pointDurationMs)}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  ) : (
                    <>
                      {/* Goal */}
                      <Pressable
                        onLongPress={
                          onEditGoal && isTeam1 && currentPoint !== point.pointNumber
                            ? () => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                onEditGoal(point.goalEventIndex, point.goalPlayerId, 'scorer');
                              }
                            : undefined
                        }
                        delayLongPress={400}>
                        <View
                          style={[
                            styles.eventRow,
                            { backgroundColor: palette.overlay05 },
                            onEditGoal &&
                              isTeam1 &&
                              currentPoint !== point.pointNumber && {
                                borderColor: teamColor,
                                borderWidth: 1,
                              },
                          ]}>
                          <Text style={[styles.eventLabel, { color: teamColor }]}>GOAL</Text>
                          <Text
                            style={[styles.eventPlayer, { color: palette.textInverse }]}
                            numberOfLines={1}>
                            {isTeam1 ? goalName || 'Unknown' : team2Name}
                          </Text>
                          {/* Point duration timestamp */}
                          {point.pointDurationMs !== undefined && point.pointDurationMs > 0 && (
                            <Text style={[styles.eventTimestamp, { color: palette.textMuted }]}>
                              +{formatDuration(point.pointDurationMs)}
                            </Text>
                          )}
                        </View>
                      </Pressable>

                      {/* Arrow before Assist */}
                      {isTeam1 && assistName && (
                        <>
                          <Text style={[styles.arrow, { color: palette.textMuted }]}>→</Text>
                          <Pressable
                            onLongPress={
                              onEditGoal && currentPoint !== point.pointNumber
                                ? () => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                    onEditGoal(
                                      point.goalEventIndex,
                                      point.assistPlayerId,
                                      'assist',
                                    );
                                  }
                                : undefined
                            }
                            delayLongPress={400}>
                            <View
                              style={[
                                styles.eventRow,
                                { backgroundColor: palette.overlay05 },
                                onEditGoal &&
                                  currentPoint !== point.pointNumber && {
                                    borderColor: palette.accent,
                                    borderWidth: 1,
                                  },
                              ]}>
                              <Text style={[styles.eventLabel, { color: palette.accent }]}>
                                ASSIST
                              </Text>
                              <Text
                                style={[styles.eventPlayer, { color: palette.textInverse }]}
                                numberOfLines={1}>
                                {assistName}
                              </Text>
                              {/* Point duration timestamp */}
                              {point.pointDurationMs !== undefined && point.pointDurationMs > 0 && (
                                <Text style={[styles.eventTimestamp, { color: palette.textMuted }]}>
                                  +{formatDuration(point.pointDurationMs)}
                                </Text>
                              )}
                            </View>
                          </Pressable>
                        </>
                      )}
                    </>
                  ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 28,
    fontWeight: '700',
  },
  headerDivider: {
    fontSize: 20,
    fontWeight: '300',
  },
  headerLabel: {
    fontSize: 11,
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
  // Card
  pointCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
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
    fontSize: 12,
    fontWeight: '700',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Body
  cardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  eventEmoji: {
    fontSize: 14,
  },
  eventLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  eventPlayer: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 100,
    flexShrink: 1,
  },
  eventTimestamp: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
    opacity: 0.7,
  },
  arrow: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 30,
  },
  editHint: {
    alignItems: 'flex-start',
    marginBottom: -4,
  },
  editHintText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
