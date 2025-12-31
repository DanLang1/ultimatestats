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
  const { player, events, team, games } = usePlayerStatsStore();
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

  // State for selected game in aggregate view
  const [selectedGameId, setSelectedGameId] = React.useState<string | null>(null);
  const [showGameSelector, setShowGameSelector] = React.useState(false);

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
                <View style={{ marginBottom: 16, zIndex: 10, paddingHorizontal: 16 }}>
                  <Pressable
                    onPress={() => setShowGameSelector(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: palette.overlay05,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignSelf: 'flex-start',
                      gap: 4,
                    }}>
                    <MaterialCommunityIcons name="calendar" size={16} color={palette.textMuted} />
                    <Text style={{ color: palette.textInverse, fontWeight: '600', fontSize: 13 }}>
                      {gameLabel}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={16}
                      color={palette.textMuted}
                    />
                  </Pressable>

                  {/* Quick Modal for selection */}
                  {showGameSelector && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 40,
                        left: 16,
                        backgroundColor: palette.overlay02,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: palette.overlay10,
                        padding: 6,
                        elevation: 10,
                        zIndex: 200,
                        width: 220,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                      }}>
                      <ScrollView style={{ maxHeight: 300 }}>
                        {(games ? [...games].sort((a, b) => b.createdAt - a.createdAt) : []).map(
                          (g) => (
                            <Pressable
                              key={g.id}
                              onPress={() => {
                                setSelectedGameId(g.id);
                                setShowGameSelector(false);
                              }}
                              hitSlop={8}
                              style={({ pressed }) => ({
                                paddingVertical: 12,
                                paddingHorizontal: 12,
                                backgroundColor:
                                  effectiveGameId === g.id
                                    ? palette.overlay10
                                    : pressed
                                      ? palette.overlay05
                                      : 'transparent',
                                borderRadius: 8,
                                marginBottom: 2,
                              })}>
                              <Text
                                style={{
                                  color: palette.textInverse,
                                  fontSize: 14,
                                  fontWeight: '500',
                                }}>
                                {new Date(g.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}{' '}
                                vs {g.team2Name}
                              </Text>
                            </Pressable>
                          ),
                        )}
                      </ScrollView>
                      <Pressable
                        onPress={() => setShowGameSelector(false)}
                        hitSlop={12}
                        style={{
                          padding: 12,
                          alignItems: 'center',
                          borderTopWidth: 1,
                          borderTopColor: palette.overlay05,
                          marginTop: 4,
                        }}>
                        <Text style={{ color: palette.textMuted, fontSize: 12, fontWeight: '700' }}>
                          CLOSE
                        </Text>
                      </Pressable>
                    </View>
                  )}
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
