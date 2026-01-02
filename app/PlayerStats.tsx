import ChemistryMap from '@/components/view-stats/ChemistryMap';
import ImpactTimeline from '@/components/view-stats/ImpactTimeline';
import PlayerStatsSummary from '@/components/view-stats/PlayerStatsSummary';
import RoleDiamond from '@/components/view-stats/RoleDiamond';
import { useTheme } from '@/context/ThemeContext';
import {
  computePlayerStats,
  getChemistryStats,
  getImpactStats,
  getPlayerRoleLabel,
  getRoleStats,
} from '@/lib/statsUtils';
import { usePlayerStatsStore } from '@/store/playerStatsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlayerStats() {
  const { player, events, team, games, selectedGameId } = usePlayerStatsStore();
  const { palette } = useTheme();

  const handleDismiss = () => {
    router.back();
  };

  // Compute stats directly (React Compiler handles memoization)
  const allPlayerStats = player && events.length ? computePlayerStats(events, team) : [];
  const roleStats = player && events.length ? getRoleStats(player, events, team) : null;
  const summary = allPlayerStats.find((p) => p.name === player);
  const highestPlusMinus = allPlayerStats.length
    ? Math.max(...allPlayerStats.map((p) => p.plusMinus))
    : 0;
  const isMVP = summary?.plusMinus === highestPlusMinus && highestPlusMinus > 0;

  // Derive the effective selected game ID (default to latest if none selected)
  const defaultGameId =
    games && games.length > 1 ? [...games].sort((a, b) => b.createdAt - a.createdAt)[0].id : null;
  const effectiveGameId = selectedGameId ?? defaultGameId;

  // Determine which events to use for Impact Chart
  let impactEvents = events;
  if (effectiveGameId && games) {
    const game = games.find((g) => g.id === effectiveGameId);
    if (game) impactEvents = game.events;
  }

  // Calculate impact for the specific game selected (React Compiler handles memoization)
  const impactData = player ? getImpactStats(player, impactEvents, team) : [];

  const selectedGame = games?.find((g) => g.id === effectiveGameId);
  const gameDate = selectedGame
    ? new Date(selectedGame.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : '';
  const gameLabel = selectedGame ? `${gameDate} vs ${selectedGame.team2Name}` : 'All Games';

  // Calculate aggregate impact across all games (for multi-game view)
  const aggregateImpact =
    games && games.length > 1 && player
      ? games.reduce((total, g) => {
          const gameImpact = getImpactStats(player, g.events, team);
          const finalValue = gameImpact[gameImpact.length - 1]?.cumulativePlusMinus ?? 0;
          return total + finalValue;
        }, 0)
      : null;

  const stats =
    player && events.length && roleStats
      ? {
          chemistry: getChemistryStats(player, events, team),
          impact: impactData,
          summary,
          role: roleStats,
          roleLabel: getPlayerRoleLabel(roleStats, isMVP),
        }
      : null;

  if (!player || !stats) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: palette.primary, justifyContent: 'center', alignItems: 'center' },
        ]}>
        <Text style={{ color: palette.textMuted }}>No player data found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20, padding: 10 }}>
          <Text style={{ color: palette.accent }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.primary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={handleDismiss}
            style={[styles.backButton, { backgroundColor: palette.overlay05 }]}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
          </Pressable>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.playerName, { color: palette.textInverse }]}>{player}</Text>
              {stats.roleLabel && (
                <View style={[styles.labelBadge, { backgroundColor: palette.accent }]}>
                  <Text style={[styles.labelText, { color: '#FFF' }]}>{stats.roleLabel}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.playerDetail, { color: palette.textMuted }]}>
              {stats.summary?.plusMinus !== undefined && stats.summary.plusMinus > 0 ? '+' : ''}
              {stats.summary?.plusMinus ?? 0} Net Impact
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Stats Summary Row */}
        {stats.summary && <PlayerStatsSummary stats={stats.summary} palette={palette} />}

        <View style={styles.grid}>
          {/* Row 1: Role Diamond + Impact Timeline / Bars */}
          <View style={styles.row}>
            <View
              style={[
                styles.card,
                { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
              ]}>
              <RoleDiamond roleStats={stats.role} palette={palette} />
            </View>
            <View
              style={[
                styles.card,
                { backgroundColor: palette.overlay02, borderColor: palette.overlay05, flex: 1 },
              ]}>
              {/* Game Selector (only if aggregate) */}
              {games && games.length > 1 && (
                <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
                  {/* Aggregate Summary */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 12,
                      gap: 8,
                    }}>
                    <View
                      style={{
                        backgroundColor:
                          aggregateImpact && aggregateImpact > 0
                            ? palette.successOverlay15
                            : aggregateImpact && aggregateImpact < 0
                              ? palette.dangerOverlay15
                              : palette.overlay05,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}>
                      <Text
                        style={{
                          color:
                            aggregateImpact && aggregateImpact > 0
                              ? palette.success
                              : aggregateImpact && aggregateImpact < 0
                                ? palette.danger
                                : palette.textMuted,
                          fontSize: 16,
                          fontWeight: '800',
                        }}>
                        {aggregateImpact && aggregateImpact > 0 ? '+' : ''}
                        {aggregateImpact ?? 0}
                      </Text>
                    </View>
                    <Text style={{ color: palette.textMuted, fontSize: 12, fontWeight: '600' }}>
                      TOTAL ACROSS {games.length} GAMES
                    </Text>
                  </View>

                  {/* Per-game selector */}
                  <Text
                    style={{
                      color: palette.textMuted,
                      fontSize: 10,
                      fontWeight: '600',
                      marginBottom: 6,
                      letterSpacing: 0.5,
                    }}>
                    VIEW GAME DETAILS
                  </Text>
                  <Pressable
                    onPress={() => router.push('/GameSelectorModal')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: palette.overlay05,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignSelf: 'flex-start',
                      gap: 6,
                    }}>
                    <MaterialCommunityIcons name="calendar" size={16} color={palette.textMuted} />
                    <Text style={{ color: palette.textInverse, fontWeight: '600', fontSize: 14 }}>
                      {gameLabel}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={18}
                      color={palette.textMuted}
                    />
                  </Pressable>
                </View>
              )}

              <ImpactTimeline data={stats.impact} palette={palette} />
            </View>
          </View>

          {/* Row 2: Chemistry Map */}
          <View style={styles.row}>
            <View
              style={[
                styles.card,
                { backgroundColor: palette.overlay02, borderColor: palette.overlay05, flex: 1 },
              ]}>
              <ChemistryMap playerName={player} connections={stats.chemistry} palette={palette} />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  playerDetail: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  grid: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 12,
    // Ensure sufficient height for charts (prevent cut-off)
    minHeight: 250,
  },
  labelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
