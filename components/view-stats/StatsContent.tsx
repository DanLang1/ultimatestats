import { computePlayerStats } from '@/lib/statsUtils';
import { StatRecord, TurnoverRecord } from '@/store/gameStore';
import { palette } from '@/theme/theme';
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
  const playerStats = computePlayerStats(statRecords, turnoverRecords, 'team1');
  const teamRecords = statRecords.filter((r) => r.team === 'team1');

  return (
    <>
      {/* Team Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryColumns}>
          {/* Left Column: Team Info */}
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryLabel}>MY TEAM</Text>
            <Text style={styles.summaryTeamName}>{team1Name}</Text>
            {team1Score !== undefined && team2Score !== undefined ? (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreBadgeText}>
                  {team1Score} - {team2Score}
                </Text>
              </View>
            ) : (
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeText}>
                  {teamRecords.length} Point{teamRecords.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Right Column: Top Performers */}
          {playerStats.length > 0 && (
            <View style={styles.summaryRight}>
              <Text style={styles.topPerformersTitle}>TOP PERFORMERS</Text>
              <View style={styles.topPerformersList}>
                {playerStats.slice(0, 3).map((player, index) => (
                  <View key={player.name} style={styles.topPerformerRow}>
                    <Text style={styles.topPerformerRank}>{index + 1}.</Text>
                    <Text style={styles.topPerformerName} numberOfLines={1}>
                      {player.name}
                    </Text>
                    <Text
                      style={[
                        styles.topPerformerPlusMinus,
                        player.plusMinus > 0 && styles.plusMinusPositive,
                        player.plusMinus < 0 && styles.plusMinusNegative,
                      ]}>
                      {player.plusMinus > 0 ? '+' : ''}
                      {player.plusMinus}
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
          <Text style={styles.emptyText}>
            {isSavedGame ? 'No player stats recorded for this game' : 'No stats recorded yet'}
          </Text>
        </View>
      ) : (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PLAYER STATS</Text>
            <Pressable style={styles.headerExportButton} onPress={onExport}>
              <MaterialCommunityIcons name="export-variant" size={16} color={palette.accent} />
              <Text style={styles.headerExportText}>Export CSV</Text>
            </Pressable>
          </View>
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.nameCell]}>PLAYER</Text>
              <Text style={styles.headerCell}>G</Text>
              <Text style={styles.headerCell}>A</Text>
              <Text style={styles.headerCell}>D</Text>
              <Text style={styles.headerCell}>T</Text>
              <Text style={styles.headerCell}>Dr</Text>
              <Text style={styles.headerCell}>+/-</Text>
            </View>

            {/* Table Rows */}
            {playerStats.map((player, index) => (
              <View
                key={player.name}
                style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.cell, styles.nameCell]} numberOfLines={1}>
                  {player.name}
                </Text>
                <Text style={styles.cell}>{player.goals || '-'}</Text>
                <Text style={styles.cell}>{player.assists || '-'}</Text>
                <Text style={styles.cell}>{player.blocks || '-'}</Text>
                <Text style={styles.cell}>{player.throwaways || '-'}</Text>
                <Text style={styles.cell}>{player.drops || '-'}</Text>
                <Text
                  style={[
                    styles.cell,
                    styles.plusMinusCell,
                    player.plusMinus > 0 && styles.plusMinusPositive,
                    player.plusMinus < 0 && styles.plusMinusNegative,
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
    backgroundColor: palette.overlay05,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: palette.overlay10,
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
    borderLeftColor: palette.overlay10,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryTeamName: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.textInverse,
    marginBottom: 12,
  },
  summaryBadge: {
    backgroundColor: palette.indigoOverlay20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.accent,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.accent,
  },
  scoreBadge: {
    backgroundColor: palette.successOverlay15,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.success,
  },
  scoreBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.success,
  },
  topPerformersTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.textMuted,
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
    color: palette.textMuted,
    width: 20,
  },
  topPerformerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: palette.textInverse,
  },
  topPerformerPlusMinus: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.textMuted,
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
    color: palette.textMuted,
    letterSpacing: 1,
  },
  headerExportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: palette.indigoOverlay10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.indigoOverlay30,
  },
  headerExportText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.accent,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: palette.textMuted,
    textAlign: 'center',
  },
  tableContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.overlay10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: palette.overlay08,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.overlay10,
  },
  headerCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    color: palette.textMuted,
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
  tableRowAlt: {
    backgroundColor: palette.overlay02,
  },
  cell: {
    flex: 1,
    fontSize: 13,
    color: palette.textInverse,
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
  plusMinusPositive: {
    color: palette.success,
  },
  plusMinusNegative: {
    color: palette.danger,
  },
});
