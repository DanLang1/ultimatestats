import { useTheme } from '@/context/ThemeContext';
import { computePlayerStats } from '@/lib/statsUtils';
import { StatRecord, TurnoverRecord } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface StatsContentProps {
  team1Name: string;
  team2Name: string;
  team1Score?: number;
  team2Score?: number;
  statRecords: StatRecord[];
  turnoverRecords: TurnoverRecord[];
  onExport: () => void;
  isSavedGame?: boolean;
}

export default function StatsContent({
  team1Name,
  team1Score,
  team2Score,
  statRecords,
  turnoverRecords,
  onExport,
  isSavedGame,
}: StatsContentProps) {
  const { palette } = useTheme();
  const playerStats = computePlayerStats(statRecords, turnoverRecords, 'team1');
  const teamRecords = statRecords.filter((r) => r.team === 'team1');
  const topPerformers = playerStats.filter((p) => p.plusMinus > 0).slice(0, 3);

  return (
    <>
      {/* Team Summary Card */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
        ]}>
        <View style={styles.summaryColumns}>
          {/* Left Column: Team Info */}
          <View style={styles.summaryLeft}>
            <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>MY TEAM</Text>
            <Text style={[styles.summaryTeamName, { color: palette.textInverse }]}>
              {team1Name}
            </Text>
            {team1Score !== undefined && team2Score !== undefined ? (
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: palette.successOverlay15, borderColor: palette.success },
                ]}>
                <Text style={[styles.scoreBadgeText, { color: palette.success }]}>
                  {team1Score} - {team2Score}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.summaryBadge,
                  { backgroundColor: palette.indigoOverlay20, borderColor: palette.accent },
                ]}>
                <Text style={[styles.summaryBadgeText, { color: palette.accent }]}>
                  {teamRecords.length} Point{teamRecords.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Right Column: Top Performers */}
          {topPerformers.length > 0 && (
            <View style={[styles.summaryRight, { borderLeftColor: palette.overlay10 }]}>
              <Text style={[styles.topPerformersTitle, { color: palette.textMuted }]}>
                TOP PERFORMERS
              </Text>
              <View style={styles.topPerformersList}>
                {topPerformers.map((player, index) => (
                  <View key={player.name} style={styles.topPerformerRow}>
                    <Text style={[styles.topPerformerRank, { color: palette.textMuted }]}>
                      {index + 1}.
                    </Text>
                    <Text
                      style={[styles.topPerformerName, { color: palette.textInverse }]}
                      numberOfLines={1}>
                      {player.name}
                    </Text>
                    <Text style={[styles.topPerformerPlusMinus, { color: palette.success }]}>
                      +{player.plusMinus}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Player Stats Table */}
      {playerStats.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="chart-bar-stacked" size={48} color={palette.textMuted} />
          <Text style={[styles.emptyText, { color: palette.textMuted }]}>
            {isSavedGame ? 'No player stats recorded for this game' : 'No stats recorded yet'}
          </Text>
        </View>
      ) : (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>PLAYER STATS</Text>
            <Pressable
              style={[
                styles.headerExportButton,
                { backgroundColor: palette.indigoOverlay10, borderColor: palette.indigoOverlay30 },
              ]}
              onPress={onExport}>
              <MaterialCommunityIcons name="export-variant" size={16} color={palette.accent} />
              <Text style={[styles.headerExportText, { color: palette.accent }]}>Export CSV</Text>
            </Pressable>
          </View>
          <View style={[styles.tableContainer, { borderColor: palette.overlay10 }]}>
            {/* Table Header */}
            <View
              style={[
                styles.tableHeader,
                { backgroundColor: palette.overlay08, borderBottomColor: palette.overlay10 },
              ]}>
              <Text style={[styles.headerCell, styles.nameCell, { color: palette.textMuted }]}>
                PLAYER
              </Text>
              <Text style={[styles.headerCell, { color: palette.textMuted }]}>G</Text>
              <Text style={[styles.headerCell, { color: palette.textMuted }]}>A</Text>
              <Text style={[styles.headerCell, { color: palette.textMuted }]}>D</Text>
              <Text style={[styles.headerCell, { color: palette.textMuted }]}>T</Text>
              <Text style={[styles.headerCell, { color: palette.textMuted }]}>Dr</Text>
              <Text style={[styles.headerCell, { color: palette.textMuted }]}>+/-</Text>
            </View>

            {/* Table Rows */}
            {playerStats.map((player, index) => (
              <View
                key={player.name}
                style={[
                  styles.tableRow,
                  index % 2 === 1 && [{ backgroundColor: palette.overlay02 }],
                ]}>
                <Text
                  style={[styles.cell, styles.nameCell, { color: palette.textInverse }]}
                  numberOfLines={1}>
                  {player.name}
                </Text>
                <Text style={[styles.cell, { color: palette.textInverse }]}>
                  {player.goals || '-'}
                </Text>
                <Text style={[styles.cell, { color: palette.textInverse }]}>
                  {player.assists || '-'}
                </Text>
                <Text style={[styles.cell, { color: palette.textInverse }]}>
                  {player.blocks || '-'}
                </Text>
                <Text style={[styles.cell, { color: palette.textInverse }]}>
                  {player.throwaways || '-'}
                </Text>
                <Text style={[styles.cell, { color: palette.textInverse }]}>
                  {player.drops || '-'}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    styles.plusMinusCell,
                    { color: palette.textInverse },
                    player.plusMinus > 0 && { color: palette.success },
                    player.plusMinus < 0 && { color: palette.danger },
                  ]}>
                  {player.plusMinus > 0 ? '+' : ''}
                  {player.plusMinus}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    position: 'relative',
  },
  summaryColumns: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
  },
  summaryLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  summaryRight: {
    flex: 1,
    paddingLeft: 16,
    borderLeftWidth: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryTeamName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  scoreBadgeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  topPerformersTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'left',
  },
  topPerformersList: {
    gap: 6,
  },
  topPerformerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  topPerformerRank: {
    fontSize: 12,
    fontWeight: '700',
    width: 20,
  },
  topPerformerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  topPerformerPlusMinus: {
    fontSize: 14,
    fontWeight: '800',
    width: 36,
    textAlign: 'right',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerExportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerExportText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  tableContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  nameCell: {
    flex: 2.5,
    textAlign: 'left',
    fontSize: 13,
    fontWeight: '600',
    paddingRight: 8,
  },
  plusMinusCell: {
    fontWeight: '800',
  },
});
