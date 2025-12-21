import { ThemedView } from '@/components/ThemedView';
import { palette } from '@/constants/theme';
import { StatRecord, TurnoverRecord, useGameStore } from '@/store/gameStore';
import { File, Paths } from 'expo-file-system';
import { router, Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
      }
    } catch {
      Alert.alert('Export failed', 'Could not export stats to CSV.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Game Stats</Text>

        {/* Team Name Header */}
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {team1Name}: {teamRecords.length} point{teamRecords.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Player Stats Table */}
        {playerStats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No stats recorded yet</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.nameCell]}>Player</Text>
              <Text style={styles.headerCell}>Goals</Text>
              <Text style={styles.headerCell}>Assists</Text>
              <Text style={styles.headerCell}>Blocks</Text>
              <Text style={styles.headerCell}>Throwaways</Text>
              <Text style={styles.headerCell}>Drops</Text>
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
                <Text style={styles.cell}>{player.goals}</Text>
                <Text style={styles.cell}>{player.assists}</Text>
                <Text style={styles.cell}>{player.blocks}</Text>
                <Text style={styles.cell}>{player.throwaways}</Text>
                <Text style={styles.cell}>{player.drops}</Text>
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
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Pressable style={styles.exportButton} onPress={handleExport}>
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    padding: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  summary: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  // Table styles
  tableContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: palette.primary,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerCell: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: 'white',
  },
  tableRowAlt: {
    backgroundColor: '#f9f9f9',
  },
  cell: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  nameCell: {
    flex: 2.5,
    textAlign: 'left',
  },
  plusMinusCell: {
    fontWeight: '600',
  },
  plusMinusPositive: {
    color: palette.accent,
  },
  plusMinusNegative: {
    color: '#e53935',
  },
  // Actions
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#eee',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  exportButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: palette.accent,
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
