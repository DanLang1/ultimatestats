import { ThemedText } from '@/components/ThemedText';
import OpeningPullSplit from '@/components/advancedTracking/OpeningPullSplit';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import StatRing from '@/components/view-stats/StatRing';
import StatsGrid from '@/components/view-stats/StatsGrid';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { AdvancedInitialPullWinStats } from '@/lib/advancedTracking/advancedAggregateStatsUtils';
import { computeAdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { computePullStats } from '@/lib/advancedTracking/advancedPullStatsUtils';
import { computeAdvancedTeamStats } from '@/lib/advancedTracking/advancedTeamStatsUtils';
import { AnalyticsGame } from '@/lib/advancedTracking/analyticsTypes';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import AdvancedStatsTable from './AdvancedStatsTable';

const formatDecimal = (value: number) => {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

interface AdvancedStatsContentProps {
  game: AnalyticsGame;
  gameId: string;
  myTeamName: string;
  opponentName: string;
  myScore: number;
  opponentScore: number;
  focusSideId: string;
  participantNames: Map<string, string>;
  aggregateInfo?: { gameCount: number };
  aggregateGameIds?: string[];
  initialPullWinStats?: AdvancedInitialPullWinStats;
}

export default function AdvancedStatsContent({
  game,
  gameId,
  myTeamName,
  opponentName,
  myScore,
  opponentScore,
  focusSideId,
  participantNames,
  aggregateInfo,
  aggregateGameIds,
  initialPullWinStats,
}: AdvancedStatsContentProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

  const playerStats = computeAdvancedPlayerStats(game, focusSideId);
  const teamStats = computeAdvancedTeamStats(game, focusSideId);
  const pullStats = computePullStats(game, focusSideId);

  const possessionFlowStats: { label: string; value: string | number; sublabel?: string }[] = [];

  if (teamStats.possessionsPerPoint != null) {
    possessionFlowStats.push({
      label: 'Avg Poss/Pt',
      value: teamStats.possessionsPerPoint.toFixed(1),
    });
  }
  if (teamStats.multiPossessionPointPct != null) {
    possessionFlowStats.push({
      label: 'Multi-Turn Pts',
      value: formatPercent(teamStats.multiPossessionPointPct),
      sublabel: `${teamStats.multiPossessionPoints}/${teamStats.completedPoints}`,
    });
  }
  if (teamStats.completedPassesPerPoint != null) {
    possessionFlowStats.push({
      label: 'Passes/Point',
      value: formatDecimal(teamStats.completedPassesPerPoint),
    });
  }
  if (teamStats.completedPassesPerPossession != null) {
    possessionFlowStats.push({
      label: 'Passes/Poss',
      value: formatDecimal(teamStats.completedPassesPerPossession),
    });
  }

  const efficiencyStats: { label: string; value: string | number; sublabel?: string }[] = [];

  if (teamStats.possessionConversionPct != null) {
    efficiencyStats.push({
      label: 'Poss Conv',
      value: formatPercent(teamStats.possessionConversionPct),
      sublabel: `${teamStats.totalGoals}/${teamStats.totalPossessions}`,
    });
  }
  if (teamStats.completionPct != null) {
    efficiencyStats.push({
      label: 'Completion',
      value: formatPercent(teamStats.completionPct),
      sublabel: `${teamStats.totalCompletedPasses}/${teamStats.totalThrowAttempts}`,
    });
  }
  efficiencyStats.push(
    { label: 'Passes', value: teamStats.totalCompletedPasses },
    { label: 'Blk/D-Pt', value: formatDecimal(teamStats.blocksPerDPoint) },
    { label: 'Turn(s)', value: teamStats.totalTurnovers },
    { label: 'Block(s)', value: teamStats.totalBlocks },
  );

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
          { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
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

      {/* Team Stats Section */}
      <View
        style={[
          styles.teamStatsCard,
          { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
        ]}>
        <ThemedText style={[styles.teamStatsSectionTitle, { color: palette.textMuted }]}>
          TEAM PERFORMANCE
        </ThemedText>

        <View style={styles.ringRow}>
          <View style={styles.ringWrapper}>
            <StatRing
              percentage={(teamStats.oEfficiency ?? 0) * 100}
              label="Hold"
              sublabel={`${teamStats.holds}/${teamStats.holds + teamStats.timesBroken}`}
              info={`How often you score when starting on offense.

Formula: Holds ÷ (Holds + Times Broken)`}
              infoLabel="Hold Rate"
            />
          </View>
          <View style={styles.ringWrapper}>
            <StatRing
              percentage={(teamStats.dLineConversionPct ?? 0) * 100}
              label="Break Eff"
              sublabel={`${teamStats.breaks}/${teamStats.dPoints}`}
              info={`How often you score when starting on defense.

Formula: Breaks ÷ D-Points`}
              infoLabel="Break Efficiency"
            />
          </View>
          <View style={styles.ringWrapper}>
            <StatRing
              percentage={(teamStats.dEfficiency ?? 0) * 100}
              label="D-Eff"
              sublabel={`${teamStats.breaks}/${teamStats.breaks + teamStats.oppHolds}`}
              info={`When you force a turnover on D, how often do you convert?

Formula: Breaks ÷ (Breaks + Opp Holds)`}
              infoLabel="Defensive Efficiency"
            />
          </View>
          <View style={styles.ringWrapper}>
            <StatRing
              percentage={(teamStats.oLineConversionPct ?? 0) * 100}
              label="O-Line Conv"
              sublabel={`${teamStats.holds}/${teamStats.oPoints}`}
              info={`How often you score when your O-line takes the field.

Formula: Holds ÷ O-Points`}
              infoLabel="O-Line Conversion"
            />
          </View>
        </View>

        <StatsGrid
          stats={[
            { label: 'Clean Holds', value: teamStats.cleanHolds },
            { label: 'Dirty Holds', value: teamStats.dirtyHolds },
            { label: 'Breaks', value: teamStats.breaks },
            { label: 'Times Broken', value: teamStats.timesBroken },
          ]}
          columns={isLandscape ? 4 : 2}
        />

        <View style={styles.subsectionContainer}>
          <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
            GAME FLOW
          </ThemedText>
          <StatsGrid
            stats={[
              { label: 'Run', value: teamStats.longestScoringRun, sublabel: 'Longest' },
              { label: 'Drought', value: teamStats.longestDrought, sublabel: 'Longest' },
            ]}
            columns={2}
          />
        </View>

        <View style={styles.subsectionContainer}>
          <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
            OUR POSSESSION FLOW
          </ThemedText>
          <StatsGrid stats={possessionFlowStats} columns={possessionFlowStats.length || 1} />
        </View>

        <View style={styles.subsectionContainer}>
          <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
            EFFICIENCY
          </ThemedText>
          <StatsGrid stats={efficiencyStats} columns={isLandscape ? 4 : 2} />
        </View>
        {pullStats.totalPulls > 0 && (
          <View style={styles.subsectionContainer}>
            <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
              PULLING
            </ThemedText>
            <StatsGrid
              stats={[
                {
                  label: 'Inbound',
                  value: `${Math.round(((pullStats.outcomes.inbound ?? 0) / pullStats.totalPulls) * 100)}%`,
                  sublabel: `${pullStats.outcomes.inbound ?? 0}/${pullStats.totalPulls}`,
                },
                ...(pullStats.avgHangTimeMs != null
                  ? [
                      {
                        label: 'Avg Hang',
                        value: `${(pullStats.avgHangTimeMs / 1000).toFixed(1)}s`,
                      },
                    ]
                  : []),
              ]}
              columns={pullStats.avgHangTimeMs != null ? 2 : 1}
            />
          </View>
        )}

        {initialPullWinStats && (
          <View style={styles.subsectionContainer}>
            <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
              FLIP STATS
            </ThemedText>
            <OpeningPullSplit stats={initialPullWinStats} />
          </View>
        )}
      </View>

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
                    },
                  })
              : (participantId) =>
                  router.push({
                    pathname: '/advancedTracking/analytics/playerStats',
                    params: { gameId, participantId },
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
      marginBottom: 24,
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
    teamStatsCard: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      marginBottom: 24,
    },
    teamStatsSectionTitle: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      marginBottom: 16,
      textTransform: 'uppercase',
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
    subsectionContainer: {
      marginTop: 8,
    },
    subsectionTitle: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
      marginBottom: 8,
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
