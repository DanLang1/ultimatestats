import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import AdvancedEfficiencyCard from '@/components/advancedTracking/AdvancedEfficiencyCard';
import AdvancedPossessionFlowCard from '@/components/advancedTracking/AdvancedPossessionFlowCard';
import AdvancedPullingCard from '@/components/advancedTracking/AdvancedPullingCard';
import AdvancedRedZoneCard from '@/components/advancedTracking/AdvancedRedZoneCard';
import AdvancedThrowTypesCard from '@/components/advancedTracking/AdvancedThrowTypesCard';
import OpeningSetupStats from '@/components/advancedTracking/OpeningSetupStats';
import { ThemedText } from '@/components/ThemedText';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import StatRing from '@/components/view-stats/StatRing';
import StatsGrid from '@/components/view-stats/StatsGrid';
import StatsSectionCard from '@/components/view-stats/StatsSectionCard';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  AdvancedFlipStats,
  AdvancedInitialPullWinStats,
} from '@/lib/advancedTracking/advancedAggregateStatsUtils';
import { computeAdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { computePullStats } from '@/lib/advancedTracking/advancedPullStatsUtils';
import { computeAdvancedTeamStats } from '@/lib/advancedTracking/advancedTeamStatsUtils';
import { computeAdvancedTimeOfPossessionStats } from '@/lib/advancedTracking/advancedTimeOfPossessionUtils';
import { getAnalyticsOpposingSideId } from '@/lib/advancedTracking/analyticsPerspectiveUtils';
import { AnalyticsGame } from '@/lib/advancedTracking/analyticsTypes';
import { pluralize } from '@/lib/utils';
import { Fonts } from '@/theme/theme';

import AdvancedStatsTable from './AdvancedStatsTable';

interface AdvancedStatsContentProps {
  game: AnalyticsGame;
  gameId: string;
  myTeamName: string;
  opponentName: string;
  myScore: number;
  opponentScore: number;
  perspectiveSideId: string;
  participantNames: Map<string, string>;
  aggregateInfo?: { gameCount: number };
  aggregateGameIds?: string[];
  initialPullWinStats?: AdvancedInitialPullWinStats;
  flipStats?: AdvancedFlipStats;
}

export default function AdvancedStatsContent({
  game,
  gameId,
  myTeamName,
  opponentName,
  myScore,
  opponentScore,
  perspectiveSideId,
  participantNames,
  aggregateInfo,
  aggregateGameIds,
  initialPullWinStats,
  flipStats,
}: AdvancedStatsContentProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

  const playerStats = computeAdvancedPlayerStats(game, perspectiveSideId);
  const teamStats = computeAdvancedTeamStats(game, perspectiveSideId);
  const pullStats = computePullStats(game, perspectiveSideId);
  const opposingSideId = getAnalyticsOpposingSideId(game, perspectiveSideId);
  // don't show TOP stats for combined games
  const topStats = aggregateInfo
    ? null
    : computeAdvancedTimeOfPossessionStats(game, perspectiveSideId, opposingSideId);
  const sorted = [...playerStats].sort((a, b) => b.plusMinus - a.plusMinus);
  const topPerformers = sorted.filter((p) => p.plusMinus > 0).slice(0, 3);
  const summaryCenter = aggregateInfo ? (
    <View
      style={[
        styles.summaryBadge,
        { backgroundColor: palette.indigoOverlay20, borderColor: palette.accent },
      ]}>
      <ThemedText style={[styles.summaryBadgeText, { color: palette.accent }]}>
        {aggregateInfo.gameCount} Game{aggregateInfo.gameCount !== 1 ? 's' : ''} Combined
      </ThemedText>
    </View>
  ) : (
    <ScoreBadge
      testID="advanced-stats-score-badge"
      score1={myScore}
      score2={opponentScore}
      size="large"
      style={styles.scoreBadge}
    />
  );

  return (
    <>
      {/* Team Summary Card */}
      <View
        testID="advanced-stats-summary-card"
        style={[
          styles.summaryCard,
          { backgroundColor: palette.statsCardBg, borderColor: palette.overlay10 },
        ]}>
        <View style={styles.matchupRow}>
          <View style={styles.teamBlock}>
            <ThemedText
              testID="advanced-stats-team-name"
              style={[styles.teamName, styles.teamNameLeft, { color: palette.textInverse }]}
              numberOfLines={2}>
              {myTeamName}
            </ThemedText>
          </View>
          <View style={styles.summaryCenter}>{summaryCenter}</View>
          <View style={[styles.teamBlock, styles.teamBlockRight]}>
            <ThemedText
              testID="advanced-stats-opponent-name"
              style={[styles.teamName, styles.teamNameRight, { color: palette.textMuted }]}
              numberOfLines={2}>
              {opponentName}
            </ThemedText>
          </View>
        </View>

        {topPerformers.length > 0 && (
          <View style={[styles.topPerformersSection, { borderTopColor: palette.overlay10 }]}>
            <ThemedText style={[styles.topPerformersTitle, { color: palette.textMuted }]}>
              TOP PERFORMERS
            </ThemedText>
            <View style={styles.topPerformersList}>
              {topPerformers.map((p, index) => (
                <View key={p.participantId} style={styles.topPerformerRow}>
                  <ThemedText style={[styles.topPerformerRank, { color: palette.textMuted }]}>
                    {index + 1}.
                  </ThemedText>
                  <ThemedText
                    style={[styles.topPerformerName, { color: palette.textInverse }]}
                    numberOfLines={1}>
                    {participantNames.get(p.participantId) ?? p.participantId}
                  </ThemedText>
                  <ThemedText style={[styles.topPerformerPlusMinus, { color: palette.success }]}>
                    +{p.plusMinus}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Team Performance Card */}
      <StatsSectionCard title="TEAM PERFORMANCE">
        <View style={styles.ringRow}>
          <View style={styles.ringWrapper}>
            <StatRing
              testID="advanced-stat-ring-hold"
              percentage={teamStats.oEfficiency == null ? null : teamStats.oEfficiency * 100}
              label="Hold"
              sublabel={`${teamStats.holds}/${teamStats.holds + teamStats.timesBroken}`}
              info={`How often you score when starting on offense.

Formula: Holds ÷ completed O-points`}
              infoLabel="Hold Rate"
            />
          </View>
          <View style={styles.ringWrapper}>
            <StatRing
              testID="advanced-stat-ring-o-conv"
              percentage={
                teamStats.oPossessionConversionPct == null
                  ? null
                  : teamStats.oPossessionConversionPct * 100
              }
              label="O Conv"
              sublabel={`${teamStats.scoredOPossessions}/${teamStats.totalPossessionsOnO}`}
              info={`How often you score on a possession during an O-point.

Formula: Scoring possessions on O-points ÷ possessions on O-points`}
              infoLabel="O-Possession Conversion"
            />
          </View>
          <View style={styles.ringWrapper}>
            <StatRing
              testID="advanced-stat-ring-break-eff"
              percentage={
                teamStats.breakEfficiencyPct == null ? null : teamStats.breakEfficiencyPct * 100
              }
              label="Break Eff"
              sublabel={`${teamStats.breaks}/${teamStats.dPointsWithTurnover}`}
              info={`When you gain at least one chance on a completed D-point, how often do you break?

Formula: Breaks ÷ completed D-points with at least one possession`}
              infoLabel="Break Efficiency"
            />
          </View>
          <View style={styles.ringWrapper}>
            <StatRing
              testID="advanced-stat-ring-d-conv"
              percentage={
                teamStats.dPossessionConversionPct == null
                  ? null
                  : teamStats.dPossessionConversionPct * 100
              }
              label="D Conv"
              sublabel={`${teamStats.scoredDPossessions}/${teamStats.totalPossessionsOnD}`}
              info={`How often you score on a possession during a D-point.

Formula: Scoring possessions on D-points ÷ possessions on D-points`}
              infoLabel="D-Possession Conversion"
            />
          </View>
        </View>

        <StatsGrid
          stats={[
            {
              label: pluralize(teamStats.cleanHolds, 'Clean Hold', 'Clean Holds'),
              value: teamStats.cleanHolds,
            },
            {
              label: pluralize(teamStats.dirtyHolds, 'Dirty Hold', 'Dirty Holds'),
              value: teamStats.dirtyHolds,
            },
            { label: pluralize(teamStats.breaks, 'Break', 'Breaks'), value: teamStats.breaks },
            {
              label: pluralize(teamStats.timesBroken, 'Time Broken', 'Times Broken'),
              value: teamStats.timesBroken,
            },
          ]}
          columns={isLandscape ? 4 : 2}
          variant="summary"
        />
      </StatsSectionCard>

      {/* Possession & Game Flow Card */}
      <AdvancedPossessionFlowCard
        teamStats={teamStats}
        topStats={topStats}
        team1Name={myTeamName}
        team2Name={opponentName}
      />

      {/* Efficiency Card */}
      <AdvancedEfficiencyCard teamStats={teamStats} />

      {/* Red Zone Card */}
      <AdvancedRedZoneCard teamStats={teamStats} />

      {/* Throw Types Card */}
      <AdvancedThrowTypesCard throwTypes={teamStats.throwTypes} />

      {/* Pulling Card */}
      <AdvancedPullingCard pullStats={pullStats} />

      {/* Opening Results Card */}
      {(flipStats || initialPullWinStats) && (
        <OpeningSetupStats flipStats={flipStats} initialPullWinStats={initialPullWinStats} />
      )}

      {/* Player Stats Table */}
      {playerStats.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="chart-bar-stacked"
            size={scaleBySizeClass(48, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
            No player stats recorded for this game
          </ThemedText>
        </View>
      ) : (
        <AdvancedStatsTable
          playerStats={playerStats}
          participantNames={participantNames}
          onPlayerPress={
            aggregateInfo && aggregateGameIds
              ? (participantId) =>
                  router.push({
                    pathname: '/advancedTracking/analytics/playerStats',
                    params: {
                      gameId: 'aggregate',
                      participantId,
                      aggregateGameIds: aggregateGameIds.join(','),
                      sideId: perspectiveSideId,
                    },
                  })
              : (participantId) =>
                  router.push({
                    pathname: '/advancedTracking/analytics/playerStats',
                    params: { gameId, participantId, sideId: perspectiveSideId },
                  })
          }
        />
      )}
    </>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    summaryCard: {
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
    },
    matchupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    teamBlock: {
      flex: 1,
      alignItems: 'flex-start',
    },
    teamBlockRight: {
      alignItems: 'flex-end',
    },
    teamName: {
      fontSize: scaleBySizeClass(isLandscape ? 24 : 18, sizeClass),
      fontFamily: Fonts.bold,
      lineHeight: scaleBySizeClass(isLandscape ? 28 : 22, sizeClass),
    },
    teamNameLeft: {
      textAlign: 'left',
    },
    teamNameRight: {
      textAlign: 'right',
    },
    summaryCenter: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreBadge: {
      minWidth: scaleBySizeClass(isLandscape ? 112 : 100, sizeClass),
    },
    summaryBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
    },
    summaryBadgeText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    topPerformersSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
    },
    topPerformersTitle: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      marginBottom: 10,
    },
    topPerformersList: {
      gap: 6,
    },
    topPerformerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 4,
    },
    topPerformerRank: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      width: 20,
    },
    topPerformerName: {
      flex: 1,
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    topPerformerPlusMinus: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.extraBold,
      minWidth: 44,
      textAlign: 'right',
    },
    ringRow: {
      flexDirection: 'row',
      justifyContent: isLandscape ? 'space-around' : 'center',
      marginBottom: 20,
      flexWrap: isLandscape ? 'nowrap' : 'wrap',
      rowGap: 16,
    },
    ringWrapper: {
      width: isLandscape ? undefined : '50%',
      alignItems: 'center',
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
      gap: 16,
      marginTop: 40,
    },
    emptyText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      textAlign: 'center',
    },
  });
}
