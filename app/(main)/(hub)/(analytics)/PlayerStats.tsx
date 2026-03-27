import { ScreenHeader } from '@/components/ui/ScreenHeader';
import ChemistryMap from '@/components/view-stats/ChemistryMap';
import ImpactTimeline from '@/components/view-stats/ImpactTimeline';
import PlayerStatsSummary from '@/components/view-stats/PlayerStatsSummary';
import PointPresenceStrip from '@/components/view-stats/playing-time/PointPresenceStrip';
import PlayingTimeSection from '@/components/view-stats/PlayingTimeSection';
import RelativePlayerStatsSection from '@/components/view-stats/RelativePlayerStatsSection';
import RoleDiamond from '@/components/view-stats/RoleDiamond';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getPlayerName } from '@/lib/playerUtils';
import { getGameDisplayTimestamp } from '@/lib/savedGameUtils';
import {
  computePlayerStats,
  getChemistryStats,
  getImpactStats,
  getPlayerRoleLabel,
  getRoleStats,
  getSelectablePlayerStatGames,
  hasImpactTimelineData,
} from '@/lib/statsUtils';
import { hasItems } from '@/lib/utils';
import { usePlayerStatsStore } from '@/store/playerStatsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
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
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

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
              <ThemedText style={[styles.playerName, { color: palette.textInverse }]}>
                {playerName}
              </ThemedText>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 6,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}>
                {stats.roleLabel && (
                  <View style={[styles.labelBadge, { backgroundColor: palette.accent }]}>
                    <ThemedText style={[styles.labelText, { color: palette.textOnAccent }]}>
                      {stats.roleLabel}
                    </ThemedText>
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
                    <ThemedText style={[styles.labelText, { color: palette.success }]}>
                      {stats.summary.callahans > 1 ? `${stats.summary.callahans} ` : ''}
                      CALLAHAN
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
            {/* Net Impact */}
            <ThemedText
              style={[styles.playerDetail, { color: palette.textMuted, textAlign: 'center' }]}>
              {stats.summary?.plusMinus !== undefined && stats.summary.plusMinus > 0 ? '+' : ''}
              {stats.summary?.plusMinus ?? 0} Net Impact
            </ThemedText>
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
            <View
              style={[
                styles.card,
                { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
                !hasImpactTimelineData(stats.impact) && { minHeight: 0 },
              ]}>
              {/* Game context / selector */}
              {(displayGame || hasMultipleSelectableGames) && (
                <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
                  <ThemedText
                    style={{
                      color: palette.textMuted,
                      fontSize: scaleBySizeClass(10, sizeClass),
                      fontFamily: Fonts.semiBold,
                      marginBottom: 6,
                      letterSpacing: 0.5,
                    }}>
                    CURRENT GAME
                  </ThemedText>

                  {hasMultipleSelectableGames ? (
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
                    sizeClass={sizeClass}
                    startingPossession={
                      displayGame?.startingPossession ?? startingPossession ?? null
                    }
                    gameTo={displayGame?.gameTo ?? gameTo ?? 15}
                    autoHalftimeEnabled={displayGame?.autoHalftimeEnabled ?? autoHalftimeEnabled}
                  />
                </View>
              )}
            </View>
          )}

          {/* Full-width Chemistry Map - only show if connections exist */}
          {stats.chemistry.some((c) => c.goalsFrom > 0 || c.assistsTo > 0) && (
            <View
              style={[
                styles.card,
                { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
              ]}>
              <ChemistryMap playerName={playerName} connections={stats.chemistry} />
            </View>
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

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      borderBottomWidth: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },
    playerName: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 0.5,
    },
    playerDetail: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
      marginTop: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    grid: {
      gap: 16,
    },
    topCardsRow: {
      flexDirection: isLandscape ? 'row' : 'column-reverse',
      alignItems: isLandscape ? undefined : 'stretch',
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
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
}
