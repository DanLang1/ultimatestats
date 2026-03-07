import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getAllPlayersByPoint } from '@/lib/lineUtils';
import { getPlayerMatchingType, getPlayerName } from '@/lib/playerUtils';
import { Player, PointLineRecord } from '@/lib/storage/types';
import {
  buildTimelineLineupEntries,
  computeRoundedSplitMs,
  DisplayTurnover,
  filterCallahanBlock,
  formatClockDuration,
  formatSplitDuration,
  mergeTimelineEvents,
  PointEvents,
} from '@/lib/timelineUtils';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  onEditDuration?: (goalEventIndex: number, currentDurationMs: number | undefined) => void;
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
  onEditDuration,
}: EventTimelineProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { mmpColor, fmpColor } = useSettingsStore();

  const handleLongPressTurnover = (turnover: DisplayTurnover) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onEditEvent?.(turnover.eventIndex, turnover);
  };

  const finalScore =
    points.length > 0 ? points[points.length - 1].scoreAfter : { team1: 0, team2: 0 };

  const playersByPoint = getAllPlayersByPoint(pointLines ?? []);

  const isGameComplete = finalScore.team1 >= gameTo || finalScore.team2 >= gameTo || isSavedGame;
  const renderSeparator = (splitMs?: number) => {
    if (timingEnabled && showSplitSeparators && splitMs !== undefined && splitMs >= 0) {
      return (
        <View style={styles.separatorWithSplit}>
          <Text style={[styles.split, { color: palette.textMuted }]}>
            {formatSplitDuration(splitMs)}
          </Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={scaleBySizeClass(14, sizeClass)}
            color={palette.textMuted}
            style={styles.separatorIcon}
          />
        </View>
      );
    }
    return (
      <View style={styles.separatorArrowOnly}>
        <MaterialCommunityIcons
          name="arrow-right"
          size={scaleBySizeClass(14, sizeClass)}
          color={palette.textMuted}
          style={styles.separatorIcon}
        />
      </View>
    );
  };

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
              Long press event to edit
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

          // Resolve player IDs to names and matching types
          const goalName = getPlayerName(roster, point.goalPlayerId);
          const assistName = getPlayerName(roster, point.assistPlayerId);
          const goalMatchingType = getPlayerMatchingType(roster, point.goalPlayerId);
          const assistMatchingType = getPlayerMatchingType(roster, point.assistPlayerId);

          const isCallahan = isTeam1 && point.assistPlayerId === 'OTHER_TEAM';
          const callahanBlockIndex = isCallahan
            ? point.turnovers.findLastIndex(
                (t) =>
                  t.type === 'block' &&
                  point.goalPlayerId !== null &&
                  t.playerId === point.goalPlayerId,
              )
            : -1;
          const callahanBlockEventIndex =
            callahanBlockIndex >= 0 ? point.turnovers[callahanBlockIndex]?.eventIndex : undefined;
          const mergedEvents = filterCallahanBlock(
            mergeTimelineEvents(point.turnovers, point.timeouts),
            callahanBlockEventIndex,
          );
          const hasVisibleEvents = mergedEvents.length > 0;
          const lastVisibleElapsedMs = [...mergedEvents]
            .reverse()
            .find((event) => event.data.elapsedMs !== undefined)?.data.elapsedMs;
          const splitToGoalMs =
            timingEnabled &&
            showSplitSeparators &&
            point.goalElapsedMs !== undefined &&
            lastVisibleElapsedMs !== undefined &&
            point.goalElapsedMs >= lastVisibleElapsedMs
              ? computeRoundedSplitMs(lastVisibleElapsedMs, point.goalElapsedMs)
              : undefined;

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
                    {point.pointDurationMs !== undefined && point.pointDurationMs > 0 ? (
                      <Pressable
                        onPress={
                          onEditDuration
                            ? () => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onEditDuration(point.goalEventIndex, point.pointDurationMs);
                              }
                            : undefined
                        }
                        style={[
                          styles.durationChip,
                          { backgroundColor: palette.overlay10 },
                          onEditDuration && { borderColor: palette.textMuted, borderWidth: 1 },
                        ]}>
                        <MaterialCommunityIcons
                          name="timer-outline"
                          size={scaleBySizeClass(12, sizeClass)}
                          color={palette.textMuted}
                        />
                        <Text style={[styles.durationText, { color: palette.textMuted }]}>
                          {formatClockDuration(point.pointDurationMs)}
                        </Text>
                      </Pressable>
                    ) : (
                      onEditDuration && (
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onEditDuration(point.goalEventIndex, undefined);
                          }}
                          style={[
                            styles.durationChip,
                            { borderColor: palette.textMuted, borderWidth: 1 },
                          ]}>
                          <MaterialCommunityIcons
                            name="timer-plus-outline"
                            size={scaleBySizeClass(12, sizeClass)}
                            color={palette.textMuted}
                          />
                        </Pressable>
                      )
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
                {/* Merged turnovers and timeouts (in chronological order) */}
                {(() => {
                  let previousElapsedMs: number | undefined;

                  return mergedEvents.map((event, index) => {
                    const isFirst = index === 0;
                    const currentElapsedMs = event.data.elapsedMs;
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
                      currentElapsedMs !== undefined
                        ? formatClockDuration(currentElapsedMs)
                        : undefined;

                    if (currentElapsedMs !== undefined) {
                      previousElapsedMs = currentElapsedMs;
                    }

                    // Render timeout
                    if (event.kind === 'timeout') {
                      const timeout = event.data;
                      const isOurTimeout = timeout.team === 'team1';

                      return (
                        <React.Fragment key={`timeout-${event.originalIndex}`}>
                          {!isFirst && renderSeparator(splitMs)}
                          <View
                            style={[styles.eventRow, { backgroundColor: palette.warning + '20' }]}>
                            <Text style={[styles.eventLabel, { color: palette.warning }]}>
                              {timeout.isFloater ? 'FLOATER' : 'TIMEOUT'}
                            </Text>
                            <Text style={[styles.eventPlayer, { color: palette.textMuted }]}>
                              {isOurTimeout ? 'Us' : 'Opp'}
                            </Text>
                            {relativeTime && (
                              <Text style={[styles.eventTimestamp, { color: palette.textMuted }]}>
                                {relativeTime}
                              </Text>
                            )}
                          </View>
                        </React.Fragment>
                      );
                    }

                    // Render turnover
                    const turnover = event.data;
                    const isOpponent = turnover.team === 'team2';
                    const turnoverPlayerName = getPlayerName(roster, turnover.playerId);
                    const turnoverPlayer2Name = getPlayerName(roster, turnover.player2Id ?? null);
                    const turnoverMatchingType = getPlayerMatchingType(roster, turnover.playerId);
                    const turnover2MatchingType = getPlayerMatchingType(
                      roster,
                      turnover.player2Id ?? null,
                    );

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

                    // Disable editing for current point in live games
                    const isCurrentPoint =
                      currentPoint !== undefined && point.pointNumber === currentPoint;
                    const canEdit = onEditEvent && !isCurrentPoint;

                    return (
                      <React.Fragment key={`turnover-${event.originalIndex}`}>
                        {!isFirst && renderSeparator(splitMs)}
                        <Pressable
                          onLongPress={
                            canEdit ? () => handleLongPressTurnover(turnover) : undefined
                          }
                          delayLongPress={400}>
                          <View
                            style={[
                              styles.eventRow,
                              {
                                backgroundColor: isOpponent
                                  ? turnover.type === 'block'
                                    ? palette.danger + '20'
                                    : palette.success + '20'
                                  : bgColor,
                              },
                              canEdit && {
                                borderColor: isOpponent
                                  ? turnover.type === 'block'
                                    ? palette.danger
                                    : palette.success
                                  : turnover.type === 'block'
                                    ? palette.success
                                    : palette.danger,
                                borderWidth: 1,
                              },
                            ]}>
                            <Text style={[styles.eventLabel, { color: palette.textInverse }]}>
                              {isOpponent
                                ? turnover.type === 'block'
                                  ? 'OPP BLOCK'
                                  : 'OPP TURN'
                                : label.toUpperCase()}
                            </Text>
                            {!isOpponent && (
                              <>
                                {turnover.type === 'fiftyfifty' && turnoverPlayer2Name && (
                                  <Text
                                    style={[
                                      styles.eventLabel,
                                      { color: palette.textInverse, opacity: 0.7 },
                                    ]}>
                                    Thr:
                                  </Text>
                                )}
                                <Text
                                  style={[
                                    styles.eventPlayer,
                                    {
                                      color:
                                        turnoverMatchingType === 'mmp'
                                          ? mmpColor
                                          : turnoverMatchingType === 'fmp'
                                            ? fmpColor
                                            : palette.textInverse,
                                      flexShrink:
                                        turnover.type === 'fiftyfifty' && turnoverPlayer2Name
                                          ? 1
                                          : 0,
                                      maxWidth:
                                        turnover.type === 'fiftyfifty' && turnoverPlayer2Name
                                          ? '40%'
                                          : undefined,
                                    },
                                  ]}
                                  numberOfLines={1}>
                                  {turnoverPlayerName || 'Unknown'}
                                </Text>
                              </>
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
                                  Drop:
                                </Text>
                                <Text
                                  style={[
                                    styles.eventPlayer,
                                    {
                                      color: isOpponent
                                        ? palette.textMuted
                                        : turnover2MatchingType === 'mmp'
                                          ? mmpColor
                                          : turnover2MatchingType === 'fmp'
                                            ? fmpColor
                                            : palette.textInverse,
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
                            {relativeTime && (
                              <Text style={[styles.eventTimestamp, { color: palette.textMuted }]}>
                                {relativeTime}
                              </Text>
                            )}
                          </View>
                        </Pressable>
                      </React.Fragment>
                    );
                  });
                })()}

                {/* Arrow before Goal/Callahan - only show if there are visible events and point is complete */}
                {!isInProgress && hasVisibleEvents && renderSeparator(splitToGoalMs)}

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
                          style={[
                            styles.eventPlayer,
                            {
                              color:
                                goalMatchingType === 'mmp'
                                  ? mmpColor
                                  : goalMatchingType === 'fmp'
                                    ? fmpColor
                                    : palette.textInverse,
                            },
                          ]}
                          numberOfLines={1}>
                          {goalName}
                        </Text>
                        {/* Point duration timestamp */}
                        {point.pointDurationMs !== undefined && point.pointDurationMs > 0 && (
                          <Text style={[styles.eventTimestamp, { color: palette.textMuted }]}>
                            {formatClockDuration(point.pointDurationMs)}
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
                            style={[
                              styles.eventPlayer,
                              {
                                color: isTeam1
                                  ? goalMatchingType === 'mmp'
                                    ? mmpColor
                                    : goalMatchingType === 'fmp'
                                      ? fmpColor
                                      : palette.textInverse
                                  : palette.textInverse,
                              },
                            ]}
                            numberOfLines={1}>
                            {isTeam1 ? goalName || 'Unknown' : team2Name}
                          </Text>
                          {/* Point duration timestamp */}
                          {point.pointDurationMs !== undefined && point.pointDurationMs > 0 && (
                            <Text style={[styles.eventTimestamp, { color: palette.textMuted }]}>
                              {formatClockDuration(point.pointDurationMs)}
                            </Text>
                          )}
                        </View>
                      </Pressable>

                      {/* Plus between Goal and Assist */}
                      {isTeam1 && assistName && (
                        <>
                          <Text style={[styles.plus, { color: palette.textMuted }]}>+</Text>
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
                                style={[
                                  styles.eventPlayer,
                                  {
                                    color:
                                      assistMatchingType === 'mmp'
                                        ? mmpColor
                                        : assistMatchingType === 'fmp'
                                          ? fmpColor
                                          : palette.textInverse,
                                  },
                                ]}
                                numberOfLines={1}>
                                {assistName}
                              </Text>
                              {/* Point duration timestamp */}
                              {point.pointDurationMs !== undefined && point.pointDurationMs > 0 && (
                                <Text style={[styles.eventTimestamp, { color: palette.textMuted }]}>
                                  {formatClockDuration(point.pointDurationMs)}
                                </Text>
                              )}
                            </View>
                          </Pressable>
                        </>
                      )}
                    </>
                  ))}
              </View>

              {/* Lineup Footer */}
              {showLineups && playersByPoint.has(point.pointNumber) && (
                <View
                  style={[
                    styles.lineupFooter,
                    {
                      backgroundColor: 'transparent',
                      borderTopColor: palette.border,
                    },
                  ]}>
                  <View style={styles.lineupHeader}>
                    <MaterialCommunityIcons
                      name="account-group-outline"
                      size={scaleBySizeClass(16, sizeClass)}
                      color={palette.accent}
                    />
                  </View>
                  <View style={styles.lineupChipsWrapper}>
                    {(() => {
                      const pointRecords =
                        pointLines?.filter((record) => record.pointNumber === point.pointNumber) ??
                        [];
                      const lineupEntries = buildTimelineLineupEntries(
                        playersByPoint.get(point.pointNumber) ?? [],
                        pointRecords,
                      );
                      return lineupEntries.map(({ playerId, isSubIn, isInjuredOut }) => {
                        const matchType = getPlayerMatchingType(roster, playerId);
                        const chipLabelColor =
                          matchType === 'mmp'
                            ? mmpColor
                            : matchType === 'fmp'
                              ? fmpColor
                              : palette.textInverse;

                        return (
                          <View
                            key={playerId}
                            style={[
                              styles.lineupChip,
                              {
                                backgroundColor: palette.timelineLineupChipBg,
                                borderColor: palette.timelineLineupChipBorder,
                              },
                            ]}>
                            <Text style={[styles.lineupChipText, { color: chipLabelColor }]}>
                              {getPlayerName(roster, playerId) ?? playerId}
                            </Text>
                            {isSubIn && (
                              <View
                                style={[
                                  styles.lineupStateBadge,
                                  {
                                    backgroundColor: palette.warning,
                                  },
                                ]}>
                                <Text
                                  style={[
                                    styles.lineupStateBadgeText,
                                    { color: palette.textOnAccent },
                                  ]}>
                                  SUB
                                </Text>
                              </View>
                            )}
                            {isInjuredOut && (
                              <View
                                style={[
                                  styles.lineupStateBadge,
                                  {
                                    backgroundColor: palette.danger,
                                  },
                                ]}>
                                <Text
                                  style={[
                                    styles.lineupStateBadgeText,
                                    { color: palette.textOnAccent },
                                  ]}>
                                  INJ
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      });
                    })()}
                  </View>
                </View>
              )}
            </View>
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
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '700',
    },
    scoreText: {
      fontSize: scaleBySizeClass(16, sizeClass),
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
      fontSize: scaleBySizeClass(11, sizeClass),
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
      fontSize: scaleBySizeClass(14, sizeClass),
    },
    eventLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    eventPlayer: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '500',
      maxWidth: 100,
      flexShrink: 1,
    },
    eventTimestamp: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '500',
      marginLeft: 4,
      opacity: 0.7,
    },
    split: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '500',
      opacity: 0.78,
    },
    separatorWithSplit: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      minHeight: scaleBySizeClass(24, sizeClass),
      alignSelf: 'center',
    },
    separatorArrowOnly: {
      minHeight: scaleBySizeClass(24, sizeClass),
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
    },
    separatorIcon: {
      opacity: 0.75,
    },
    plus: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontWeight: '700',
      lineHeight: scaleBySizeClass(30, sizeClass),
    },
    editHint: {
      alignItems: 'flex-start',
      marginBottom: -4,
    },
    editHintText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontStyle: 'italic',
    },
    lineupFooter: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderTopWidth: 1,
      borderBottomLeftRadius: 14,
      borderBottomRightRadius: 14,
    },
    lineupHeader: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: 4,
    },
    lineupChipsWrapper: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    lineupChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
    },
    lineupChipText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
    },
    lineupStateBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lineupStateBadgeText: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontWeight: '800',
      letterSpacing: 0.4,
    },
  });
}
