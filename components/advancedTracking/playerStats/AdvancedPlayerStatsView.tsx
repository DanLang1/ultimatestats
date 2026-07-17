import AdvancedChemistrySection from '@/components/advancedTracking/AdvancedChemistrySection';
import AdvancedImpactTimeline from '@/components/advancedTracking/AdvancedImpactTimeline';
import AdvancedPlayingTimeSection from '@/components/advancedTracking/AdvancedPlayingTimeSection';
import AdvancedPointPresenceStrip from '@/components/advancedTracking/AdvancedPointPresenceStrip';
import AdvancedProfileDiamond from '@/components/advancedTracking/AdvancedProfileDiamond';
import AdvancedRelativeStatsSection from '@/components/advancedTracking/AdvancedRelativeStatsSection';
import { ThemedText } from '@/components/ThemedText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getAdvancedGameLabel,
  getAdvancedGameTimestamp,
} from '@/lib/advancedTracking/advancedGameTeamUtils';
import {
  computeAdvancedChemistry,
  computeAdvancedPassConnections,
} from '@/lib/advancedTracking/advancedChemistryUtils';
import { computeAdvancedImpact } from '@/lib/advancedTracking/advancedImpactUtils';
import {
  computeAdvancedPlayerStats,
  computeAdvancedPlayerStatsForParticipant,
} from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { hasItems } from '@/lib/utils';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

type AnalyticsGame = ReturnType<typeof buildAnalyticsGame>;

type AdvancedPlayerStatsViewProps = {
  analyticsGame: AnalyticsGame | null;
  participantId: string | undefined;
  isLoading: boolean;
  aggregateGames?: AdvancedTrackedGame[];
  aggregateGameIds?: string[];
  selectedImpactGameId?: string;
};

function getCountLabel(value: number, singular: string, plural: string): string {
  return value === 1 ? singular : plural;
}

export default function AdvancedPlayerStatsView({
  analyticsGame,
  participantId,
  isLoading,
  aggregateGames = [],
  aggregateGameIds = [],
  selectedImpactGameId,
}: AdvancedPlayerStatsViewProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const isAggregate = aggregateGameIds.length > 0;
  const participantName = analyticsGame?.participantNames.get(participantId ?? '') ?? null;

  const allPlayerStats = analyticsGame
    ? computeAdvancedPlayerStats(analyticsGame, analyticsGame.focusSideId)
    : [];

  const stats =
    analyticsGame && participantId
      ? computeAdvancedPlayerStatsForParticipant(analyticsGame, participantId)
      : null;

  const chemistry =
    analyticsGame && participantId
      ? computeAdvancedChemistry(analyticsGame, participantId, analyticsGame.participantNames)
      : [];

  const hasChemistry = hasItems(chemistry);
  const passConnections =
    analyticsGame && participantId
      ? computeAdvancedPassConnections(analyticsGame, participantId, analyticsGame.participantNames)
      : [];
  const hasPassConnections = hasItems(passConnections);

  const impactData =
    analyticsGame && participantId
      ? computeAdvancedImpact(analyticsGame, participantId, analyticsGame.focusSideId)
      : [];

  const aggregateImpactSections = participantId
    ? aggregateGames
        .map((game) => {
          const gameAnalytics = buildAnalyticsGame(game);
          return {
            gameId: game.id,
            label: getAdvancedGameLabel(game),
            impact: computeAdvancedImpact(gameAnalytics, participantId, gameAnalytics.focusSideId),
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
      <View
        style={[
          styles.card,
          { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
        ]}>
        <View style={styles.gameContextHeader}>
          <ThemedText style={[styles.gameContextLabel, { color: palette.textMuted }]}>
            GAME IMPACT
          </ThemedText>
          <Pressable
            disabled={!hasMultipleImpactSections}
            onPress={() =>
              router.push({
                pathname: '/AdvancedGameSelectorModal',
                params: {
                  participantId,
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
    );
  } else if (hasImpact) {
    impactContent = (
      <View
        style={[
          styles.card,
          { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
        ]}>
        <AdvancedImpactTimeline data={impactData} />
        <AdvancedPointPresenceStrip impactPoints={impactData} />
      </View>
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

  let plusMinusColor: string;
  if (stats.plusMinus > 0) {
    plusMinusColor = palette.success;
  } else if (stats.plusMinus < 0) {
    plusMinusColor = palette.danger;
  } else {
    plusMinusColor = palette.textMuted;
  }

  const plusMinusDisplay = stats.plusMinus > 0 ? `+${stats.plusMinus}` : String(stats.plusMinus);

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
        <View style={styles.topCardsRow}>
          <View
            style={[
              styles.profileCard,
              { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
            ]}>
            <AdvancedProfileDiamond stats={stats} />
          </View>

          <View
            style={[
              styles.summaryCard,
              { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
            ]}>
            <View style={styles.nameRow}>
              <ThemedText style={[styles.playerName, { color: palette.textInverse }]}>
                {participantName}
              </ThemedText>
              {stats.callahans > 0 && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: palette.successOverlay15,
                      borderColor: palette.success,
                    },
                  ]}>
                  <ThemedText style={[styles.badgeText, { color: palette.success }]}>
                    {stats.callahans > 1 ? `${stats.callahans} ` : ''}CALLAHAN
                  </ThemedText>
                </View>
              )}
            </View>

            <ThemedText style={[styles.plusMinus, { color: plusMinusColor }]}>
              {plusMinusDisplay}
            </ThemedText>
            <ThemedText style={[styles.plusMinusLabel, { color: palette.textMuted }]}>
              Net Impact
            </ThemedText>

            <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />

            <View style={styles.pillsRow}>
              {[
                {
                  label: getCountLabel(stats.goals, 'Goal', 'Goals'),
                  value: stats.goals,
                  positive: true,
                },
                {
                  label: getCountLabel(stats.assists, 'Assist', 'Assists'),
                  value: stats.assists,
                  positive: true,
                },
                { label: 'HA', value: stats.hockeyAssists, positive: true },
                {
                  label: getCountLabel(stats.blocks, 'Block', 'Blocks'),
                  value: stats.blocks,
                  positive: true,
                },
                {
                  label: getCountLabel(stats.pressures, 'Pressure', 'Pressures'),
                  value: stats.pressures,
                  positive: true,
                },
                { label: 'T/A', value: stats.throwaways, positive: false },
                {
                  label: getCountLabel(stats.drops, 'Drop', 'Drops'),
                  value: stats.drops,
                  positive: false,
                },
              ].map((s) => (
                <View
                  key={s.label}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: s.positive
                        ? palette.successOverlay15
                        : palette.dangerOverlay15,
                    },
                  ]}>
                  <ThemedText
                    style={[
                      styles.pillValue,
                      { color: s.positive ? palette.success : palette.danger },
                    ]}>
                    {s.value}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.pillLabel,
                      { color: s.positive ? palette.success : palette.danger },
                    ]}>
                    {s.label}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          {impactContent}

          <AdvancedRelativeStatsSection
            participantId={participantId}
            allPlayerStats={allPlayerStats}
            participantNames={analyticsGame.participantNames}
          />

          {(hasChemistry || hasPassConnections) && (
            <View
              style={[
                styles.card,
                { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
              ]}>
              <AdvancedChemistrySection
                participantName={participantName}
                chemistry={chemistry}
                passConnections={passConnections}
              />
            </View>
          )}

          <AdvancedPlayingTimeSection stats={stats} />
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
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
    topCardsRow: {
      flexDirection: isLandscape ? 'row' : 'column-reverse',
      alignItems: isLandscape ? undefined : 'stretch',
      gap: 12,
      marginBottom: 16,
    },
    profileCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
    summaryCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      alignItems: 'center',
      gap: 4,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
    },
    playerName: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
    },
    badgeText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    plusMinus: {
      fontSize: scaleBySizeClass(32, sizeClass),
      fontFamily: Fonts.extraBold,
      marginTop: 8,
    },
    plusMinusLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    divider: { height: 1, alignSelf: 'stretch', marginVertical: 12 },
    pillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 6,
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      alignItems: 'center',
      minWidth: scaleBySizeClass(44, sizeClass),
    },
    pillValue: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },
    pillLabel: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginTop: 1,
    },
    grid: { gap: 16 },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
      paddingVertical: 12,
      minHeight: 250,
    },
    gameContextHeader: { paddingHorizontal: 16, marginBottom: 12, gap: 6 },
    gameContextLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
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
