import AdvancedChemistryMap from '@/components/advancedTracking/AdvancedChemistryMap';
import AdvancedImpactTimeline from '@/components/advancedTracking/AdvancedImpactTimeline';
import AdvancedPlayingTimeSection from '@/components/advancedTracking/AdvancedPlayingTimeSection';
import AdvancedPointPresenceStrip from '@/components/advancedTracking/AdvancedPointPresenceStrip';
import AdvancedProfileDiamond from '@/components/advancedTracking/AdvancedProfileDiamond';
import AdvancedRelativeStatsSection from '@/components/advancedTracking/AdvancedRelativeStatsSection';
import { ThemedText } from '@/components/ThemedText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { computeAdvancedChemistry } from '@/lib/advancedTracking/advancedChemistryUtils';
import { computeAdvancedImpact } from '@/lib/advancedTracking/advancedImpactUtils';
import {
  computeAdvancedPlayerStats,
  computeAdvancedPlayerStatsForParticipant,
} from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function AdvancedPlayerStatsScreen() {
  const { gameId, participantId } = useLocalSearchParams<{
    gameId?: string;
    participantId?: string;
  }>();
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { savedGames } = useAdvancedTrackingStore();

  const rawGame = gameId ? (savedGames.find((g) => g.id === gameId) ?? null) : null;
  const analyticsGame = rawGame ? buildAnalyticsGame(rawGame) : null;
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

  const hasChemistry = chemistry.some((c) => c.goalsFrom > 0 || c.assistsTo > 0);

  const impactData =
    analyticsGame && participantId
      ? computeAdvancedImpact(analyticsGame, participantId, analyticsGame.focusSideId)
      : [];

  const hasImpact = impactData.length > 0;

  if (!analyticsGame || !participantId || !stats || !participantName) {
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
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={scaleBySizeClass(42, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText style={[styles.stateText, { color: palette.textMuted }]}>
            Player not found.
          </ThemedText>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: palette.overlay10 }]}>
            <ThemedText style={[styles.backButtonText, { color: palette.accent }]}>
              Go Back
            </ThemedText>
          </Pressable>
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
    <View style={[styles.container, { backgroundColor: palette.primary }]}>
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
        {/* Top Row: Profile Diamond + Summary Card */}
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
                { label: 'Goals', value: stats.goals, positive: true },
                { label: 'Assists', value: stats.assists, positive: true },
                { label: 'HA', value: stats.hockeyAssists, positive: true },
                { label: 'Blocks', value: stats.blocks, positive: true },
                { label: 'T/A', value: stats.throwaways, positive: false },
                { label: 'Drops', value: stats.drops, positive: false },
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
          {hasImpact && (
            <View
              style={[
                styles.card,
                { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
              ]}>
              <AdvancedImpactTimeline data={impactData} />
              <AdvancedPointPresenceStrip impactPoints={impactData} />
            </View>
          )}

          <AdvancedRelativeStatsSection
            participantId={participantId}
            allPlayerStats={allPlayerStats}
            participantNames={analyticsGame.participantNames}
          />

          {hasChemistry && (
            <View
              style={[
                styles.card,
                { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
              ]}>
              <AdvancedChemistryMap participantName={participantName} connections={chemistry} />
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
      paddingBottom: 60,
    },
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
    divider: {
      height: 1,
      alignSelf: 'stretch',
      marginVertical: 12,
    },
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
    grid: {
      gap: 16,
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
      paddingVertical: 12,
      minHeight: 250,
    },
  });
}
