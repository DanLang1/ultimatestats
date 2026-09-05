import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import ChemistryMap from '@/components/view-stats/ChemistryMap';
import ImpactTimeline from '@/components/view-stats/ImpactTimeline';
import PlayerSummaryCard from '@/components/view-stats/PlayerSummaryCard';
import PointPresenceStrip from '@/components/view-stats/playing-time/PointPresenceStrip';
import PlayingTimeSection from '@/components/view-stats/PlayingTimeSection';
import RelativePlayerStatsSection from '@/components/view-stats/RelativePlayerStatsSection';
import RoleDiamond from '@/components/view-stats/RoleDiamond';
import StatsSectionCard from '@/components/view-stats/StatsSectionCard';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import {
  computePlayerStats,
  getChemistryStats,
  getImpactStats,
  getPlayerRoleLabel,
  getRoleStats,
  getSelectablePlayerStatGames,
  hasImpactTimelineData,
} from '@/lib/basic/statsUtils';
import { getPlayerName } from '@/lib/playerUtils';
import { getGameDisplayTimestamp } from '@/lib/savedGameUtils';
import { hasItems, pluralize } from '@/lib/utils';
import { usePlayerStatsStore } from '@/store/playerStatsStore';
import { Fonts } from '@/theme/theme';

export default function PlayerStats() {
  const {
    playerId,
    events,
    team,
    games,
    selectedGameId,
    roster,
    pointLines,
    startingPossession,
    gameTo,
    autoHalftimeEnabled,
  } = usePlayerStatsStore();
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles();

  // Derive player name for display
  const playerName = getPlayerName(roster, playerId) ?? playerId ?? '';

  const handleDismiss = () => {
    router.back();
  };

  // Compute stats directly (React Compiler handles memoization)
  const allPlayerStats =
    playerId && events.length ? computePlayerStats(events, team, roster || undefined) : [];
  const roleStats =
    playerId && events.length ? getRoleStats(playerId, events, team, roster || undefined) : null;
  // Find by player ID instead of name
  const summary = allPlayerStats.find((p) => p.id === playerId);
  const highestPlusMinus = allPlayerStats.length
    ? Math.max(...allPlayerStats.map((p) => p.plusMinus))
    : 0;
  const isMVP = summary?.plusMinus === highestPlusMinus && highestPlusMinus > 0;

  const selectableGames = getSelectablePlayerStatGames(playerId, games, team);
  const hasMultipleSelectableGames = selectableGames.length > 1;

  // Default to the most recent selectable saved game (impact or playing-time presence).
  const defaultGameId = selectableGames.length
    ? [...selectableGames].sort(
        (a, b) => getGameDisplayTimestamp(b) - getGameDisplayTimestamp(a),
      )[0].id
    : null;
  const selectedGameIsSelectable =
    !!selectedGameId && selectableGames.some((g) => g.id === selectedGameId);
  const effectiveGameId = selectedGameIsSelectable ? selectedGameId : defaultGameId;

  // Selected game stays within selectable games so timeline/strip stay visible.
  const displayGame = effectiveGameId ? games?.find((g) => g.id === effectiveGameId) : null;
  const impactEvents = displayGame?.events ?? events;
  const impactData = playerId ? getImpactStats(playerId, impactEvents, team) : [];
  const gameLabel = displayGame
    ? `${new Date(getGameDisplayTimestamp(displayGame)).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })} vs ${displayGame.team2Name}`
    : '';

  const stats =
    playerId && events.length && roleStats
      ? {
          chemistry: getChemistryStats(playerId, events, team, roster || undefined),
          impact: impactData,
          summary,
          role: roleStats,
          roleLabel: getPlayerRoleLabel(roleStats, isMVP),
        }
      : null;

  const resolveStripPointLines = () => {
    if (hasItems(displayGame?.pointLines)) return displayGame.pointLines;
    if (!hasItems(games)) return pointLines ?? null;
    return null;
  };

  const stripPointLines = resolveStripPointLines();
  const stripEvents = displayGame?.events ?? events;

  if (!playerId || !stats) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: palette.primary, justifyContent: 'center', alignItems: 'center' },
        ]}>
        <ThemedText style={{ color: palette.textMuted }}>No player data found.</ThemedText>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20, padding: 10 }}>
          <ThemedText style={{ color: palette.accent }}>Go Back</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.primary }]}>
      <ScreenHeader
        title="PLAYER STATS"
        onBack={handleDismiss}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay05}
        containerStyle={[styles.header, { borderBottomColor: palette.overlay10 }]}
        titleOverlayPaddingPortrait={76}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent]}>
        <PlayerSummaryCard
          name={playerName}
          scope={
            games && games.length > 1
              ? `${games.length} combined games`
              : gameLabel || 'Single game'
          }
          plusMinus={stats.summary?.plusMinus ?? 0}
          badges={[
            ...(stats.roleLabel ? [stats.roleLabel] : []),
            ...(stats.summary && stats.summary.callahans > 0
              ? [`${stats.summary.callahans} Callahan${stats.summary.callahans === 1 ? '' : 's'}`]
              : []),
          ]}
          stats={
            stats.summary
              ? [
                  {
                    label: pluralize(stats.summary.goals, 'Goal', 'Goals'),
                    value: stats.summary.goals,
                  },
                  {
                    label: pluralize(stats.summary.assists, 'Assist', 'Assists'),
                    value: stats.summary.assists,
                  },
                  {
                    label: pluralize(stats.summary.blocks, 'Block', 'Blocks'),
                    value: stats.summary.blocks,
                  },
                  {
                    label: pluralize(
                      stats.summary.throwaways + stats.summary.drops,
                      'Turnover',
                      'Turnovers',
                    ),
                    value: stats.summary.throwaways + stats.summary.drops,
                  },
                  {
                    label: pluralize(stats.summary.throwaways, 'Throwaway', 'Throwaways'),
                    value: stats.summary.throwaways,
                  },
                  {
                    label: pluralize(stats.summary.drops, 'Drop', 'Drops'),
                    value: stats.summary.drops,
                  },
                ]
              : []
          }
          profile={<RoleDiamond roleStats={stats.role} />}
        />

        <View style={styles.grid}>
          <RelativePlayerStatsSection
            playerId={playerId}
            allPlayerStats={allPlayerStats}
            events={events}
            pointLines={pointLines}
            startingPossession={startingPossession}
            gameTo={gameTo}
            autoHalftimeEnabled={autoHalftimeEnabled}
            games={games}
            roster={roster}
          />

          {/* Full-width Impact Timeline - show if impact data or playing time data exists */}
          {(hasImpactTimelineData(stats.impact) || hasItems(stripPointLines)) && (
            <StatsSectionCard title="Game impact">
              <View style={styles.chartContent}>
                {/* Game context / selector */}
                {(displayGame || hasMultipleSelectableGames) && (
                  <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
                    <ThemedText
                      style={{
                        color: palette.textMuted,
                        fontSize: scaleBySizeClass(13, sizeClass),
                        fontFamily: Fonts.semiBold,
                        marginBottom: 6,
                        letterSpacing: 0.5,
                      }}>
                      Game shown in this chart
                    </ThemedText>

                    {hasMultipleSelectableGames ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Choose game for impact chart"
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
                        <MaterialCommunityIcons
                          name="calendar"
                          size={scaleBySizeClass(16, sizeClass)}
                          color={palette.textMuted}
                        />
                        <ThemedText
                          style={{
                            color: palette.textInverse,
                            fontFamily: Fonts.semiBold,
                            fontSize: scaleBySizeClass(14, sizeClass),
                          }}>
                          {gameLabel}
                        </ThemedText>
                        <MaterialCommunityIcons
                          name="chevron-down"
                          size={scaleBySizeClass(18, sizeClass)}
                          color={palette.textMuted}
                        />
                      </Pressable>
                    ) : (
                      <View
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
                        <MaterialCommunityIcons
                          name="calendar"
                          size={scaleBySizeClass(16, sizeClass)}
                          color={palette.textMuted}
                        />
                        <ThemedText
                          style={{
                            color: palette.textInverse,
                            fontFamily: Fonts.semiBold,
                            fontSize: scaleBySizeClass(14, sizeClass),
                          }}>
                          {gameLabel}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                )}

                {/* Impact timeline — only when selected game has recorded events */}
                {hasImpactTimelineData(stats.impact) && <ImpactTimeline data={stats.impact} />}

                {/* Point presence strip */}
                {hasItems(stripPointLines) && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
                    <PointPresenceStrip
                      playerId={playerId}
                      events={stripEvents}
                      pointLines={stripPointLines}
                      startingPossession={
                        displayGame?.startingPossession ?? startingPossession ?? null
                      }
                      gameTo={displayGame?.gameTo ?? gameTo ?? 15}
                      autoHalftimeEnabled={displayGame?.autoHalftimeEnabled ?? autoHalftimeEnabled}
                    />
                  </View>
                )}
              </View>
            </StatsSectionCard>
          )}

          {/* Full-width Chemistry Map - only show if connections exist */}
          {stats.chemistry.some((c) => c.goalsFrom > 0 || c.assistsTo > 0) && (
            <StatsSectionCard title="Scoring chemistry">
              <View style={styles.chartContent}>
                <ChemistryMap playerName={playerName} connections={stats.chemistry} />
              </View>
            </StatsSectionCard>
          )}

          {/* Playing Time Section */}
          <PlayingTimeSection
            playerId={playerId}
            events={events}
            pointLines={pointLines}
            games={games}
            startingPossession={startingPossession}
            gameTo={gameTo}
            autoHalftimeEnabled={autoHalftimeEnabled}
            goals={stats.summary?.goals}
            assists={stats.summary?.assists}
            blocks={stats.summary?.blocks}
            turnovers={(stats.summary?.throwaways ?? 0) + (stats.summary?.drops ?? 0)}
            throwaways={stats.summary?.throwaways}
            drops={stats.summary?.drops}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      borderBottomWidth: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    grid: { gap: 0 },
    chartContent: { marginHorizontal: -16 },
  });
}
