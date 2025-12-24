import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import { StatRecord, TurnoverRecord, useGameStore } from '@/store/gameStore';
import { palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { File, Paths } from 'expo-file-system';
import { router, Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface PlayerStats {
  name: string;
  goals: number;
  assists: number;
  blocks: number;
  throwaways: number;
  drops: number;
  plusMinus: number;
}

function computePlayerStats(
  statRecords: StatRecord[],
  turnoverRecords: TurnoverRecord[],
  team: 'team1' | 'team2',
): PlayerStats[] {
  const statsMap = new Map<string, PlayerStats>();

  const getOrCreate = (name: string): PlayerStats =>
    statsMap.get(name) || {
      name,
      goals: 0,
      assists: 0,
      blocks: 0,
      throwaways: 0,
      drops: 0,
      plusMinus: 0,
    };

  // Process stat records (goals/assists)
  for (const record of statRecords) {
    if (record.team !== team) continue;

    if (record.goal) {
      const stats = getOrCreate(record.goal);
      stats.goals++;
      statsMap.set(record.goal, stats);
    }

    if (record.assist) {
      const stats = getOrCreate(record.assist);
      stats.assists++;
      statsMap.set(record.assist, stats);
    }
  }

  // Process turnover records (blocks/throwaways/drops)
  for (const record of turnoverRecords) {
    if (record.team !== team || !record.player) continue;

    const stats = getOrCreate(record.player);
    switch (record.type) {
      case 'block':
        stats.blocks++;
        break;
      case 'throwaway':
        stats.throwaways++;
        break;
      case 'drop':
        stats.drops++;
        break;
    }
    statsMap.set(record.player, stats);
  }

  // Calculate plusMinus for each player
  for (const stats of statsMap.values()) {
    stats.plusMinus = stats.goals + stats.assists + stats.blocks - stats.throwaways - stats.drops;
  }

  // Sort by plusMinus descending, then by name
  return Array.from(statsMap.values()).sort(
    (a, b) => b.plusMinus - a.plusMinus || a.name.localeCompare(b.name),
  );
}

function generateCSV(
  statRecords: StatRecord[],
  turnoverRecords: TurnoverRecord[],
  playerStats: PlayerStats[],
  team1Name: string,
  team2Name: string,
): string {
  // Section 1: Play-by-play
  let csv = '# Play-by-Play\n';
  csv += 'Point Number,Team,Goal,Assist\n';
  csv += statRecords
    .map((r) => {
      const teamName = r.team === 'team1' ? team1Name : team2Name;
      return `${r.pointNumber},${teamName},${r.goal || ''},${r.assist || ''}`;
    })
    .join('\n');

  // Section 2: Turnovers
  csv += '\n\n# Turnovers\n';
  csv += 'Team,Type,Player\n';
  csv += turnoverRecords
    .map((r) => {
      const teamName = r.team === 'team1' ? team1Name : team2Name;
      return `${teamName},${r.type},${r.player || ''}`;
    })
    .join('\n');

  // Section 3: Player Summary
  csv += '\n\n# Player Summary\n';
  csv += 'Player,Goals,Assists,Blocks,Throwaways,Drops,Plus/Minus\n';
  csv += playerStats
    .map(
      (p) =>
        `${p.name},${p.goals},${p.assists},${p.blocks},${p.throwaways},${p.drops},${p.plusMinus}`,
    )
    .join('\n');

  return csv;
}

export default function ViewStatsScreen() {
  const { team1Name, team2Name, statRecords, turnoverRecords } = useGameStore();
  const { showAlert } = useAlert();

  // Only show team1 (my team) stats
  const playerStats = computePlayerStats(statRecords, turnoverRecords, 'team1');
  const teamRecords = statRecords.filter((r) => r.team === 'team1');

  const handleExport = async () => {
    try {
      const csv = generateCSV(statRecords, turnoverRecords, playerStats, team1Name, team2Name);
      const file = new File(Paths.cache, 'game_stats.csv');
      file.write(csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri);
      } else {
        showAlert({
          title: 'Sharing not available',
          message: 'Sharing is not available on this device.',
        });
      }
    } catch {
      showAlert({
        title: 'Export failed',
        message: 'Could not export stats to CSV.',
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={styles.headerTitle}>GAME STATS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Team Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryColumns}>
            {/* Left Column: Team Info */}
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryLabel}>MY TEAM</Text>
              <Text style={styles.summaryTeamName}>{team1Name}</Text>
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeText}>
                  {teamRecords.length} Point{teamRecords.length !== 1 ? 's' : ''}
                </Text>
              </View>
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
            <Text style={styles.emptyText}>No stats recorded yet</Text>
          </View>
        ) : (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PLAYER STATS</Text>
              <Pressable style={styles.headerExportButton} onPress={handleExport}>
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
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    backgroundColor: palette.overlay10,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    color: palette.textMuted,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
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
