import { ThemedView } from '@/components/ThemedView';
import { palette } from '@/constants/theme';
import { StatRecord, useGameStore } from '@/store/gameStore';
import { File, Paths } from 'expo-file-system';
import { router, Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type TeamTab = 'team1' | 'team2';

interface PlayerStats {
  name: string;
  goals: number;
  assists: number;
}

function computePlayerStats(records: StatRecord[], team: TeamTab): PlayerStats[] {
  const statsMap = new Map<string, PlayerStats>();

  for (const record of records) {
    if (record.team !== team) continue;

    if (record.goal) {
      const existing = statsMap.get(record.goal) || { name: record.goal, goals: 0, assists: 0 };
      existing.goals++;
      statsMap.set(record.goal, existing);
    }

    if (record.assist) {
      const existing = statsMap.get(record.assist) || { name: record.assist, goals: 0, assists: 0 };
      existing.assists++;
      statsMap.set(record.assist, existing);
    }
  }

  return Array.from(statsMap.values()).sort((a, b) => b.goals + b.assists - (a.goals + a.assists));
}

function generateCSV(records: StatRecord[], team1Name: string, team2Name: string): string {
  const header = 'Point Number,Team,Goal,Assist\n';
  const rows = records.map((r) => {
    const teamName = r.team === 'team1' ? team1Name : team2Name;
    return `${r.pointNumber},${teamName},${r.goal || ''},${r.assist || ''}`;
  });
  return header + rows.join('\n');
}

export default function ViewStatsScreen() {
  const { team1Name, team2Name, statRecords } = useGameStore();
  const [activeTab, setActiveTab] = useState<TeamTab>('team1');

  const playerStats = computePlayerStats(statRecords, activeTab);
  const teamName = activeTab === 'team1' ? team1Name : team2Name;
  const teamRecords = statRecords.filter((r) => r.team === activeTab);

  const handleExport = async () => {
    try {
      const csv = generateCSV(statRecords, team1Name, team2Name);
      // Use cacheDirectory and writeAsStringAsync directly from FileSystem namespace
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
        <View style={styles.card}>
          <Text style={styles.headerTitle}>Game Stats</Text>

          {/* Team Tabs */}
          <View style={styles.tabContainer}>
            <Pressable
              style={[styles.tab, activeTab === 'team1' && styles.tabActive]}
              onPress={() => setActiveTab('team1')}>
              <Text style={[styles.tabText, activeTab === 'team1' && styles.tabTextActive]}>
                {team1Name}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'team2' && styles.tabActive]}
              onPress={() => setActiveTab('team2')}>
              <Text style={[styles.tabText, activeTab === 'team2' && styles.tabTextActive]}>
                {team2Name}
              </Text>
            </Pressable>
          </View>

          {/* Summary */}
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {teamName}: {teamRecords.length} point{teamRecords.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Player Stats List */}
          {playerStats.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No stats recorded yet</Text>
            </View>
          ) : (
            <View style={styles.statsList}>
              {playerStats.map((player) => (
                <View key={player.name} style={styles.playerCard}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <View style={styles.statBadges}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeNumber}>{player.goals}</Text>
                      <Text style={styles.badgeLabel}>Goals</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeNumber}>{player.assists}</Text>
                      <Text style={styles.badgeLabel}>Assists</Text>
                    </View>
                  </View>
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
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  tabActive: {
    backgroundColor: palette.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: 'white',
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
  statsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  playerCard: {
    width: '48.5%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statBadges: {
    flexDirection: 'row',
    gap: 15,
  },
  badge: {
    alignItems: 'center',
  },
  badgeNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.primary,
  },
  badgeLabel: {
    fontSize: 12,
    color: '#999',
  },
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
