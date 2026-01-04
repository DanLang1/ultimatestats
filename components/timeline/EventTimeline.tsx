import { useTheme } from '@/context/ThemeContext';
import { getPlayerName } from '@/lib/playerUtils';
import { Player } from '@/lib/storage/types';
import { PointEvents } from '@/lib/timelineUtils';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface EventTimelineProps {
  points: PointEvents[];
  team1Name: string;
  team2Name: string;
  gameTo: number;
  roster: Player[];
}

export default function EventTimeline({
  points,
  team1Name,
  team2Name,
  gameTo,
  roster,
}: EventTimelineProps) {
  const { palette } = useTheme();

  const finalScore =
    points.length > 0 ? points[points.length - 1].scoreAfter : { team1: 0, team2: 0 };

  const isGameComplete = finalScore.team1 >= gameTo || finalScore.team2 >= gameTo;

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
        {points.map((point) => {
          const isTeam1 = point.scoringTeam === 'team1';
          const teamColor = isTeam1 ? palette.success : palette.danger;

          // Resolve player IDs to names
          const goalName = getPlayerName(roster, point.goalPlayerId);
          const assistName = getPlayerName(roster, point.assistPlayerId);

          return (
            <View
              key={point.pointNumber}
              style={[styles.pointCard, { backgroundColor: palette.overlay08 }]}>
              {/* Card Header */}
              <View style={[styles.cardHeader, { borderBottomColor: palette.overlay10 }]}>
                <View style={styles.headerLeft}>
                  <View style={[styles.pointBadge, { backgroundColor: teamColor }]}>
                    <Text style={styles.pointBadgeText}>{point.pointNumber}</Text>
                  </View>
                  <Text style={[styles.scoreText, { color: palette.textInverse }]}>
                    {point.scoreAfter.team1} – {point.scoreAfter.team2}
                  </Text>
                </View>
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
                              ? '#FFFFFF'
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

              {/* Card Body - Linearized Events */}
              <View style={styles.cardBody}>
                {/* Turnovers (in order) */}
                {point.turnovers.map((turnover, index) => {
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

                  return (
                    <React.Fragment key={`turnover-${index}`}>
                      {index > 0 && (
                        <Text style={[styles.arrow, { color: palette.textMuted }]}>→</Text>
                      )}
                      <View
                        style={[
                          styles.eventRow,
                          { backgroundColor: isOpponent ? palette.overlay10 : bgColor },
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
                              { color: isOpponent ? palette.textMuted : palette.textInverse },
                            ]}
                            numberOfLines={1}>
                            {turnoverPlayerName}
                            {turnover.type === 'fiftyfifty' && turnoverPlayer2Name && (
                              <Text style={{ opacity: 0.8 }}> & {turnoverPlayer2Name}</Text>
                            )}
                          </Text>
                        )}
                      </View>
                    </React.Fragment>
                  );
                })}

                {/* Arrow before Goal */}
                {point.turnovers.length > 0 && (
                  <Text style={[styles.arrow, { color: palette.textMuted }]}>→</Text>
                )}

                {/* Goal */}
                <View style={[styles.eventRow, { backgroundColor: palette.overlay05 }]}>
                  <Text style={[styles.eventLabel, { color: teamColor }]}>GOAL</Text>
                  <Text
                    style={[styles.eventPlayer, { color: palette.textInverse }]}
                    numberOfLines={1}>
                    {isTeam1 ? goalName || 'Unknown' : team2Name}
                  </Text>
                </View>

                {/* Arrow before Assist */}
                {isTeam1 && assistName && (
                  <Text style={[styles.arrow, { color: palette.textMuted }]}>→</Text>
                )}

                {/* Assist */}
                {isTeam1 && assistName && (
                  <View style={[styles.eventRow, { backgroundColor: palette.overlay05 }]}>
                    <Text style={[styles.eventLabel, { color: palette.accent }]}>ASSIST</Text>
                    <Text
                      style={[styles.eventPlayer, { color: palette.textInverse }]}
                      numberOfLines={1}>
                      {assistName}
                    </Text>
                  </View>
                )}
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
  arrow: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 30,
  },
});
