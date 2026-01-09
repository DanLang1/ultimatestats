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

export default function PlayerStats() {
  const { player, events, team, games, selectedGameId, roster } = usePlayerStatsStore();
  const { palette } = useTheme();

  const handleDismiss = () => {
    router.back();
  };

  // Compute stats directly (React Compiler handles memoization)
  const allPlayerStats =
    player && events.length ? computePlayerStats(events, team, roster || undefined) : [];
  const roleStats =
    player && events.length ? getRoleStats(player, events, team, roster || undefined) : null;
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
  const impactData = player ? getImpactStats(player, impactEvents, team, roster || undefined) : [];

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
          const gameImpact = getImpactStats(player, g.events, team, roster || undefined);
          const finalValue = gameImpact[gameImpact.length - 1]?.cumulativePlusMinus ?? 0;
          return total + finalValue;
        }, 0)
      : null;

  const stats =
    player && events.length && roleStats
      ? {
          chemistry: getChemistryStats(player, events, team, roster || undefined),
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
    <View style={[styles.container, { backgroundColor: palette.primary }]}>
      {/* Header - just back button */}
      <View style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
        <Pressable
          onPress={handleDismiss}
          style={[styles.backButton, { backgroundColor: palette.overlay05 }]}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>PLAYER STATS</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Top Row: Profile Diamond + Player Summary Cards */}
        <View style={styles.topCardsRow}>
          {/* Profile Diamond Card */}
          <View
            style={[
              styles.profileCard,
              { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
            ]}>
            <RoleDiamond roleStats={stats.role} />
          </View>

          {/* Player Summary Card */}
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
            ]}>
            {/* Player Name + Label */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'center',
              }}>
              <Text style={[styles.playerName, { color: palette.textInverse }]}>{player}</Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 6,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}>
                {stats.roleLabel && (
                  <View style={[styles.labelBadge, { backgroundColor: palette.accent }]}>
                    <Text style={[styles.labelText, { color: '#FFF' }]}>{stats.roleLabel}</Text>
                  </View>
                )}
                {stats.summary && stats.summary.callahans > 0 && (
                  <View
                    style={[
                      styles.labelBadge,
                      {
                        backgroundColor: palette.successOverlay15,
                        borderColor: palette.success,
                        borderWidth: 1,
                      },
                    ]}>
                    <Text style={[styles.labelText, { color: palette.success }]}>
                      {stats.summary.callahans > 1 ? `${stats.summary.callahans} ` : ''}
                      CALLAHAN
                    </Text>
                  </View>
                )}
              </View>
            </View>
            {/* Net Impact */}
            <Text style={[styles.playerDetail, { color: palette.textMuted, textAlign: 'center' }]}>
              {stats.summary?.plusMinus !== undefined && stats.summary.plusMinus > 0 ? '+' : ''}
              {stats.summary?.plusMinus ?? 0} Net Impact
            </Text>
            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: palette.overlay10,
                marginVertical: 12,
                alignSelf: 'stretch',
              }}
            />
            {/* Stats Summary */}
            {stats.summary && <PlayerStatsSummary stats={stats.summary} variant="vertical" />}
          </View>
        </View>

        <View style={styles.grid}>
          {/* Full-width Impact Timeline */}
          <View
            style={[
              styles.card,
              { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
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
                  <MaterialCommunityIcons name="chevron-down" size={18} color={palette.textMuted} />
                </Pressable>
              </View>
            )}

            <ImpactTimeline data={stats.impact} />
          </View>

          {/* Full-width Chemistry Map */}
          <View
            style={[
              styles.card,
              { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
            ]}>
            <ChemistryMap playerName={player} connections={stats.chemistry} />
          </View>
        </View>
      </ScrollView>
    </View>
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
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  playerDetail: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
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
  topCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: 12,
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
