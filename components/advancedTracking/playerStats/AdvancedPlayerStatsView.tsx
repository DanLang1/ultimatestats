import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import AdvancedChemistrySection from '@/components/advancedTracking/AdvancedChemistrySection';
import AdvancedImpactTimeline from '@/components/advancedTracking/AdvancedImpactTimeline';
import AdvancedPlayingTimeSection from '@/components/advancedTracking/AdvancedPlayingTimeSection';
import AdvancedPointPresenceStrip from '@/components/advancedTracking/AdvancedPointPresenceStrip';
import AdvancedProfileDiamond from '@/components/advancedTracking/AdvancedProfileDiamond';
import AdvancedRelativeStatsSection from '@/components/advancedTracking/AdvancedRelativeStatsSection';
import AdvancedPlayerThrowTypesCard from '@/components/advancedTracking/playerStats/AdvancedPlayerThrowTypesCard';
import { ThemedText } from '@/components/ThemedText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import PlayerSummaryCard from '@/components/view-stats/PlayerSummaryCard';
import StatsSectionCard from '@/components/view-stats/StatsSectionCard';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  computeAdvancedChemistry,
  computeAdvancedPassConnections,
} from '@/lib/advancedTracking/advancedChemistryUtils';
import {
  getAdvancedGameLabel,
  getAdvancedGameTimestamp,
} from '@/lib/advancedTracking/advancedGameTeamUtils';
import { computeAdvancedImpact } from '@/lib/advancedTracking/advancedImpactUtils';
import {
  computeAdvancedPlayerStats,
  getAdvancedPlayerStatsForParticipant,
} from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { resolveAnalyticsSideId } from '@/lib/advancedTracking/analyticsPerspectiveUtils';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { hasItems, pluralize } from '@/lib/utils';
import { Fonts } from '@/theme/theme';

type AnalyticsGame = ReturnType<typeof buildAnalyticsGame>;
const EMPTY_ADVANCED_GAMES: AdvancedTrackedGame[] = [];
const EMPTY_GAME_IDS: string[] = [];

type AdvancedPlayerStatsViewProps = {
  analyticsGame: AnalyticsGame | null;
  participantId: string | undefined;
  requestedSideId: string | undefined;
  isLoading: boolean;
  gameLabel?: string;
  aggregateGames?: AdvancedTrackedGame[];
  aggregateGameIds?: string[];
  selectedImpactGameId?: string;
};

export default function AdvancedPlayerStatsView({
  analyticsGame,
  participantId,
  requestedSideId,
  isLoading,
  gameLabel,
  aggregateGames = EMPTY_ADVANCED_GAMES,
  aggregateGameIds = EMPTY_GAME_IDS,
  selectedImpactGameId,
}: AdvancedPlayerStatsViewProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const isAggregate = aggregateGameIds.length > 0;
  const participantName = analyticsGame?.participantNames.get(participantId ?? '') ?? null;
  const perspectiveSideId = analyticsGame
    ? resolveAnalyticsSideId(analyticsGame, requestedSideId ?? null)
    : null;
  const perspectiveSideName =
    analyticsGame && perspectiveSideId ? analyticsGame.sideLabels[perspectiveSideId] : null;

  const allPlayerStats =
    analyticsGame && perspectiveSideId
      ? computeAdvancedPlayerStats(analyticsGame, perspectiveSideId)
      : [];

  const stats =
    analyticsGame && participantId && perspectiveSideId
      ? getAdvancedPlayerStatsForParticipant(allPlayerStats, participantId)
      : null;

  const chemistry =
    analyticsGame && participantId && perspectiveSideId
      ? computeAdvancedChemistry(
          analyticsGame,
          participantId,
          analyticsGame.participantNames,
          perspectiveSideId,
        )
      : [];

  const hasChemistry = hasItems(chemistry);
  const passConnections =
    analyticsGame && participantId && perspectiveSideId
      ? computeAdvancedPassConnections(
          analyticsGame,
          participantId,
          analyticsGame.participantNames,
          perspectiveSideId,
        )
      : [];
  const hasPassConnections = hasItems(passConnections);

  const impactData =
    analyticsGame && participantId && perspectiveSideId
      ? computeAdvancedImpact(analyticsGame, participantId, perspectiveSideId, perspectiveSideId)
      : [];

  const aggregateImpactSections =
    participantId && perspectiveSideId
      ? aggregateGames
          .map((game) => {
            const gameAnalytics = buildAnalyticsGame(game);
            const gameSideId = resolveAnalyticsSideId(gameAnalytics, perspectiveSideId);
            return {
              gameId: game.id,
              label: getAdvancedGameLabel(game),
              impact: computeAdvancedImpact(gameAnalytics, participantId, gameSideId, gameSideId),
            };
          })
          .filter((section) =>
            section.impact.some((point) => point.onField || point.description.length > 0),
          )
      : [];
  const sortedAggregateImpactSections = [...aggregateImpactSections].sort((a, b) => {
    const aGame = aggregateGames.find((game) => game.id === a.gameId);
    const bGame = aggregateGames.find((game) => game.id === b.gameId);
    const aTimestamp = aGame ? getAdvancedGameTimestamp(aGame) : 0;
    const bTimestamp = bGame ? getAdvancedGameTimestamp(bGame) : 0;
    return bTimestamp - aTimestamp;
  });
  const selectedImpactSection =
    sortedAggregateImpactSections.find((section) => section.gameId === selectedImpactGameId) ??
    sortedAggregateImpactSections[0] ??
    null;
  const hasMultipleImpactSections = sortedAggregateImpactSections.length > 1;
  const hasImpact = isAggregate ? selectedImpactSection != null : impactData.length > 0;
  let impactContent: React.ReactNode = null;
  if (isAggregate && selectedImpactSection) {
    impactContent = (
      <StatsSectionCard title="Game impact">
        <View style={styles.chartContent}>
          <View style={styles.gameContextHeader}>
            <ThemedText style={[styles.gameContextLabel, { color: palette.textMuted }]}>
              Game shown in this chart
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose game for impact chart"
              accessibilityState={{ disabled: !hasMultipleImpactSections }}
              disabled={!hasMultipleImpactSections}
              onPress={() =>
                router.push({
                  pathname: '/AdvancedGameSelectorModal',
                  params: {
                    participantId,
                    sideId: perspectiveSideId,
                    aggregateGameIds: aggregateGameIds.join(','),
                    selectedImpactGameId: selectedImpactSection.gameId,
                  },
                })
              }
              style={[styles.gameContextPill, { backgroundColor: palette.overlay05 }]}>
              <MaterialCommunityIcons
                name="calendar"
                size={scaleBySizeClass(16, sizeClass)}
                color={palette.textMuted}
              />
              <ThemedText style={[styles.gameContextText, { color: palette.textInverse }]}>
                {selectedImpactSection.label}
              </ThemedText>
              {hasMultipleImpactSections && (
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={scaleBySizeClass(18, sizeClass)}
                  color={palette.textMuted}
                />
              )}
            </Pressable>
          </View>
          <AdvancedImpactTimeline data={selectedImpactSection.impact} />
          <AdvancedPointPresenceStrip impactPoints={selectedImpactSection.impact} />
        </View>
      </StatsSectionCard>
    );
  } else if (hasImpact) {
    impactContent = (
      <StatsSectionCard title="Game impact">
        <View style={styles.chartContent}>
          <AdvancedImpactTimeline data={impactData} />
          <AdvancedPointPresenceStrip impactPoints={impactData} />
        </View>
      </StatsSectionCard>
    );
  }

  if (isLoading || !analyticsGame || !participantId || !stats || !participantName) {
    return (
      <View style={[styles.container, { backgroundColor: palette.primary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader
          title="PLAYER STATS"
          onBack={() => router.back()}
          titleColor={palette.textMuted}
          backButtonBackgroundColor={palette.overlay10}
        />
        <View style={styles.centeredState}>
          {isLoading ? (
            <ActivityIndicator color={palette.accent} size="large" />
          ) : (
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={scaleBySizeClass(42, sizeClass)}
              color={palette.textMuted}
            />
          )}
          <ThemedText style={[styles.stateText, { color: palette.textMuted }]}>
            {isLoading ? 'Loading player...' : 'Player not found.'}
          </ThemedText>
          {!isLoading && (
            <Pressable
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: palette.overlay10 }]}>
              <ThemedText style={[styles.backButtonText, { color: palette.accent }]}>
                Go Back
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View
      testID="advanced-player-stats-screen"
      style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="PLAYER STATS"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        containerStyle={[styles.header, { borderBottomColor: palette.overlay10 }]}
        titleOverlayPaddingPortrait={76}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <PlayerSummaryCard
          name={participantName}
          scope={[
            perspectiveSideName,
            isAggregate ? `${aggregateGameIds.length} combined games` : gameLabel || 'Single game',
          ]
            .filter(Boolean)
            .join(' · ')}
          plusMinus={stats.plusMinus}
          badges={
            stats.callahans > 0
              ? [`${stats.callahans} Callahan${stats.callahans === 1 ? '' : 's'}`]
              : []
          }
          stats={[
            { label: pluralize(stats.goals, 'Goal', 'Goals'), value: stats.goals },
            { label: pluralize(stats.assists, 'Assist', 'Assists'), value: stats.assists },
            {
              label: pluralize(stats.hockeyAssists, 'Hockey assist', 'Hockey assists'),
              value: stats.hockeyAssists,
            },
            { label: pluralize(stats.blocks, 'Block', 'Blocks'), value: stats.blocks },
            { label: pluralize(stats.pressures, 'Pressure', 'Pressures'), value: stats.pressures },
            {
              label: pluralize(stats.stalls, 'Stall forced', 'Stalls forced'),
              value: stats.stalls,
            },
            {
              label: pluralize(stats.throwaways, 'Throwaway', 'Throwaways'),
              value: stats.throwaways,
            },
            { label: pluralize(stats.drops, 'Drop', 'Drops'), value: stats.drops },
            {
              label: pluralize(stats.stallsConceded, 'Stall conceded', 'Stalls conceded'),
              value: stats.stallsConceded,
            },
          ]}
          profile={<AdvancedProfileDiamond stats={stats} />}
        />

        <View style={styles.grid}>
          <AdvancedPlayerThrowTypesCard stats={stats} />
          {impactContent}

          <AdvancedRelativeStatsSection
            participantId={participantId}
            allPlayerStats={allPlayerStats}
            participantNames={analyticsGame.participantNames}
          />

          {(hasChemistry || hasPassConnections) && (
            <StatsSectionCard title="Chemistry">
              <View style={styles.chartContent}>
                <AdvancedChemistrySection
                  participantName={participantName}
                  chemistry={chemistry}
                  passConnections={passConnections}
                />
              </View>
            </StatsSectionCard>
          )}

          <AdvancedPlayingTimeSection stats={stats} />
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { borderBottomWidth: 1 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 60 },
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 24,
    },
    stateText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
      textAlign: 'center',
    },
    backButton: {
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    backButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
    grid: { gap: 0 },
    chartContent: { marginHorizontal: -16 },
    gameContextHeader: { paddingHorizontal: 16, marginBottom: 12, gap: 6 },
    gameContextLabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.5,
    },
    gameContextPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
    },
    gameContextText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
