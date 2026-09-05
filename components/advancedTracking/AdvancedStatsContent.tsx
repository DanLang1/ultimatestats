import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import OpeningSetupStats from '@/components/advancedTracking/OpeningSetupStats';
import { ThemedText } from '@/components/ThemedText';
import { useAlert } from '@/components/ui/AlertProvider';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import StatRing from '@/components/view-stats/StatRing';
import StatsGrid from '@/components/view-stats/StatsGrid';
import TimeOfPossessionSection from '@/components/view-stats/TimeOfPossessionSection';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  AdvancedFlipStats,
  AdvancedInitialPullWinStats,
} from '@/lib/advancedTracking/advancedAggregateStatsUtils';
import { computeAdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import {
  computePullStats,
  getInboundPullCount,
} from '@/lib/advancedTracking/advancedPullStatsUtils';
import type { AdvancedTeamStats } from '@/lib/advancedTracking/advancedTeamStatsUtils';
import { computeAdvancedTeamStats } from '@/lib/advancedTracking/advancedTeamStatsUtils';
import type { AdvancedThrowTypeStats } from '@/lib/advancedTracking/advancedThrowTypeStatsUtils';
import { computeAdvancedTimeOfPossessionStats } from '@/lib/advancedTracking/advancedTimeOfPossessionUtils';
import { getAnalyticsOpposingSideId } from '@/lib/advancedTracking/analyticsPerspectiveUtils';
import { AnalyticsGame } from '@/lib/advancedTracking/analyticsTypes';
import { Fonts, type Palette } from '@/theme/theme';

import AdvancedStatsTable from './AdvancedStatsTable';

const formatDecimal = (value: number) => {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
const formatNullablePercent = (value: number | null) =>
  value == null ? '—' : formatPercent(value);

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
  const { showAlert } = useAlert();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass, palette);

  const playerStats = computeAdvancedPlayerStats(game, perspectiveSideId);
  const teamStats = computeAdvancedTeamStats(game, perspectiveSideId);
  const pullStats = computePullStats(game, perspectiveSideId);
  const inboundPullCount = getInboundPullCount(pullStats);
  const opposingSideId = getAnalyticsOpposingSideId(game, perspectiveSideId);
  // don't show TOP stats for combined games
  const topStats = aggregateInfo
    ? null
    : computeAdvancedTimeOfPossessionStats(game, perspectiveSideId, opposingSideId);
  const { throwTypes } = teamStats;
  const { huckCompletionPct, huckTurnoverStats, resetTurnoverStats } =
    buildThrowTypeStats(throwTypes);
  const possessionFlowStats = buildPossessionFlowStats(teamStats);
  const efficiencyStats = buildEfficiencyStats(teamStats);
  const hasRedZoneEntries = teamStats.redZoneEntries > 0;
  const redZoneStats = buildRedZoneStats(teamStats);
  const hasOpponentRedZoneEntries = teamStats.opponentRedZoneEntries > 0;
  const redZoneDefenseStats = buildRedZoneDefenseStats(teamStats);

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
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: palette.statsCardBg, borderColor: palette.overlay10 },
        ]}>
        <ThemedText style={[styles.teamStatsSectionTitle, { color: palette.textInverse }]}>
          TEAM PERFORMANCE
        </ThemedText>

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
            { label: 'Clean Holds', value: teamStats.cleanHolds },
            { label: 'Dirty Holds', value: teamStats.dirtyHolds },
            { label: 'Breaks', value: teamStats.breaks },
            { label: 'Times Broken', value: teamStats.timesBroken },
          ]}
          columns={isLandscape ? 4 : 2}
          variant="summary"
        />
      </View>

      {/* Possession & Game Flow Card */}
      <View
        testID="advanced-possession-flow-card"
        style={[
          styles.sectionCard,
          { backgroundColor: palette.statsCardBg, borderColor: palette.overlay10 },
        ]}>
        <ThemedText style={[styles.teamStatsSectionTitle, { color: palette.textInverse }]}>
          POSSESSION & GAME FLOW
        </ThemedText>

        <View style={styles.subsectionContainerFirst}>
          <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
            MOMENTUM
          </ThemedText>
          <StatsGrid
            stats={[
              { label: 'Run', value: teamStats.longestScoringRun, sublabel: 'Longest' },
              { label: 'Drought', value: teamStats.longestDrought, sublabel: 'Longest' },
            ]}
            columns={2}
            variant="summary"
          />
        </View>

        <View style={styles.subsectionContainer}>
          <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
            POSSESSION FLOW
          </ThemedText>
          <StatsGrid stats={possessionFlowStats} columns={2} variant="summary" />
        </View>

        {topStats && (
          <TimeOfPossessionSection
            topStats={topStats}
            team1Name={myTeamName}
            team2Name={opponentName}
          />
        )}
      </View>

      {/* Efficiency Card */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: palette.statsCardBg, borderColor: palette.overlay10 },
        ]}>
        <View style={styles.sectionTitleRow}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textInverse }]}>
            EFFICIENCY
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="About efficiency stats"
            hitSlop={8}
            onPress={() =>
              showAlert({
                title: 'Efficiency Stats',
                message:
                  'D-Efficiency: breaks ÷ all completed D-points.\n\nOverall Conversion: scoring possessions ÷ all possessions.',
              })
            }>
            <MaterialCommunityIcons
              name="information-outline"
              size={scaleBySizeClass(15, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
        </View>
        <StatsGrid stats={efficiencyStats} columns={isLandscape ? 4 : 2} variant="summary" />
      </View>

      {/* Red Zone Card */}
      {(hasRedZoneEntries || hasOpponentRedZoneEntries) && (
        <View
          testID="advanced-red-zone-summary-card"
          style={[
            styles.sectionCard,
            { backgroundColor: palette.statsCardBg, borderColor: palette.overlay10 },
          ]}>
          <ThemedText style={[styles.teamStatsSectionTitle, { color: palette.textInverse }]}>
            RED ZONE
          </ThemedText>

          {hasRedZoneEntries && (
            <View testID="advanced-red-zone-card" style={styles.subsectionContainerFirst}>
              <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
                OFFENSE
              </ThemedText>
              <StatsGrid stats={redZoneStats} columns={isLandscape ? 4 : 2} variant="summary" />
            </View>
          )}

          {hasOpponentRedZoneEntries && (
            <View
              testID="advanced-red-zone-defense-card"
              style={
                hasRedZoneEntries ? styles.subsectionContainer : styles.subsectionContainerFirst
              }>
              <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
                DEFENSE
              </ThemedText>
              <StatsGrid
                stats={redZoneDefenseStats}
                columns={isLandscape ? 4 : 2}
                variant="summary"
              />
            </View>
          )}
        </View>
      )}

      {/* Throw Types Card */}
      {throwTypes.huckAttempts + throwTypes.resetTurnovers > 0 && (
        <View
          testID="advanced-throw-types-card"
          style={[
            styles.sectionCard,
            { backgroundColor: palette.statsCardBg, borderColor: palette.overlay10 },
          ]}>
          <View style={styles.sectionTitleRow}>
            <ThemedText style={[styles.sectionTitle, { color: palette.textInverse }]}>
              THROW TYPES
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="About throw classifications"
              hitSlop={8}
              onPress={() =>
                showAlert({
                  title: 'Throw Classifications',
                  message: 'Classifications are optional, so this data may not be fully accurate.',
                })
              }>
              <MaterialCommunityIcons
                name="information-outline"
                size={scaleBySizeClass(15, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          </View>
          {throwTypes.huckAttempts > 0 && (
            <View style={styles.subsectionContainerFirst}>
              <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
                HUCKS
              </ThemedText>
              <StatsGrid
                stats={[
                  {
                    label: 'Completion',
                    value:
                      huckCompletionPct == null ? '-' : `${Math.round(huckCompletionPct * 100)}%`,
                    sublabel: `${throwTypes.huckCompletions}/${throwTypes.huckAttempts}`,
                  },
                  { label: 'Attempts', value: throwTypes.huckAttempts },
                  { label: 'Completions', value: throwTypes.huckCompletions },
                  { label: 'Turnovers', value: throwTypes.huckTurnovers },
                  ...huckTurnoverStats,
                ]}
                columns={isLandscape ? 4 : 2}
                variant="summary"
              />
            </View>
          )}
          {throwTypes.resetTurnovers > 0 && (
            <View style={styles.subsectionContainer}>
              <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
                BACKFIELD RESETS
              </ThemedText>
              <StatsGrid
                stats={[
                  { label: 'Turnovers', value: throwTypes.resetTurnovers },
                  ...resetTurnoverStats,
                ]}
                columns={isLandscape ? 4 : 2}
                variant="summary"
              />
            </View>
          )}
        </View>
      )}

      {/* Pulling Card */}
      {pullStats.totalPulls > 0 && (
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: palette.statsCardBg, borderColor: palette.overlay10 },
          ]}>
          <ThemedText style={[styles.teamStatsSectionTitle, { color: palette.textInverse }]}>
            PULLING
          </ThemedText>
          <StatsGrid
            stats={[
              {
                label: 'Inbound',
                value: `${Math.round((inboundPullCount / pullStats.totalPulls) * 100)}%`,
                sublabel: `${inboundPullCount}/${pullStats.totalPulls}`,
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
            variant="summary"
          />
        </View>
      )}

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

interface StatsDisplayItem {
  label: string;
  value: string | number;
  sublabel?: string;
}

function buildRedZoneStats(teamStats: AdvancedTeamStats): StatsDisplayItem[] {
  const scoreDurationMs = teamStats.averageRedZoneTimeToScoreMs;
  const turnoverDurationMs = teamStats.averageRedZoneTimeToTurnoverMs;
  return [
    {
      label: 'Conversion',
      value: formatNullablePercent(teamStats.redZoneConversionPct),
      sublabel: `${teamStats.scoredRedZonePossessions}/${teamStats.resolvedRedZonePossessions}`,
    },
    {
      label: 'Red Zone Turns',
      value: teamStats.resolvedRedZonePossessions - teamStats.scoredRedZonePossessions,
    },
    {
      label: 'Avg Time to Score',
      value: scoreDurationMs == null ? '—' : `${Math.round(scoreDurationMs / 1000)}s`,
    },
    {
      label: 'Avg Time to Turn',
      value: turnoverDurationMs == null ? '—' : `${Math.round(turnoverDurationMs / 1000)}s`,
    },
  ];
}

function buildRedZoneDefenseStats(teamStats: AdvancedTeamStats): StatsDisplayItem[] {
  const opponentGoalDurationMs = teamStats.averageRedZoneTimeToOpponentGoalMs;
  const opponentTurnoverDurationMs = teamStats.averageRedZoneTimeToOpponentTurnoverMs;
  return [
    {
      label: 'Stop Rate',
      value: formatNullablePercent(teamStats.redZoneStopPct),
      sublabel: `${teamStats.redZoneStops}/${teamStats.resolvedOpponentRedZonePossessions}`,
    },
    { label: 'Red Zone Stops', value: teamStats.redZoneStops },
    {
      label: 'Avg Time to Opp Goal',
      value: opponentGoalDurationMs == null ? '—' : `${Math.round(opponentGoalDurationMs / 1000)}s`,
    },
    {
      label: 'Avg Time to Opp Turn',
      value:
        opponentTurnoverDurationMs == null
          ? '—'
          : `${Math.round(opponentTurnoverDurationMs / 1000)}s`,
    },
  ];
}

function buildThrowTypeStats(throwTypes: AdvancedThrowTypeStats): {
  huckCompletionPct: number | null;
  huckTurnoverStats: StatsDisplayItem[];
  resetTurnoverStats: StatsDisplayItem[];
} {
  return {
    huckCompletionPct: throwTypes.huckAttempts > 0 ? throwTypes.huckCompletionPct : null,
    huckTurnoverStats: buildTurnoverStats([
      ['Throwaways', throwTypes.huckThrowaways],
      ['Drops', throwTypes.huckDrops],
      ['Blocked', throwTypes.huckBlocks],
      ['Pressured', throwTypes.huckPressures],
    ]),
    resetTurnoverStats: buildTurnoverStats([
      ['Throwaways', throwTypes.resetThrowaways],
      ['Drops', throwTypes.resetDrops],
      ['Blocked', throwTypes.resetBlocks],
      ['Pressured', throwTypes.resetPressures],
    ]),
  };
}

function buildTurnoverStats(entries: [string, number][]): StatsDisplayItem[] {
  return entries.filter(([, value]) => value > 0).map(([label, value]) => ({ label, value }));
}

function buildPossessionFlowStats(teamStats: AdvancedTeamStats): StatsDisplayItem[] {
  const stats: StatsDisplayItem[] = [];
  if (teamStats.possessionsPerPoint != null) {
    stats.push({ label: 'Avg Poss/Pt', value: teamStats.possessionsPerPoint.toFixed(1) });
  }
  if (teamStats.multiPossessionPointPct != null) {
    stats.push({
      label: 'Multi-Turn Pts',
      value: formatPercent(teamStats.multiPossessionPointPct),
      sublabel: `${teamStats.multiPossessionPoints}/${teamStats.completedPoints}`,
    });
  }
  if (teamStats.completedPassesPerPoint != null) {
    stats.push({ label: 'Passes/Point', value: formatDecimal(teamStats.completedPassesPerPoint) });
  }
  if (teamStats.completedPassesPerPossession != null) {
    stats.push({
      label: 'Passes/Poss',
      value: formatDecimal(teamStats.completedPassesPerPossession),
    });
  }
  return stats;
}

function buildEfficiencyStats(teamStats: AdvancedTeamStats): StatsDisplayItem[] {
  const stats: StatsDisplayItem[] = [
    {
      label: 'D-Efficiency',
      value: formatNullablePercent(teamStats.dEfficiency),
      sublabel: `${teamStats.breaks}/${teamStats.breaks + teamStats.oppHolds}`,
    },
    {
      label: 'Overall Conversion',
      value: formatNullablePercent(teamStats.possessionConversionPct),
      sublabel: `${teamStats.totalGoals}/${teamStats.totalPossessions}`,
    },
  ];
  if (teamStats.completionPct != null) {
    stats.push({
      label: 'Completion',
      value: formatPercent(teamStats.completionPct),
      sublabel: `${teamStats.totalCompletedPasses}/${teamStats.totalThrowAttempts}`,
    });
  }
  stats.push(
    { label: 'Passes', value: teamStats.totalCompletedPasses },
    { label: 'Blk/D-Pt', value: formatDecimal(teamStats.blocksPerDPoint) },
    { label: 'Prs/D-Pt', value: formatDecimal(teamStats.pressuresPerDPoint) },
    { label: 'Turn(s)', value: teamStats.totalTurnovers },
    { label: 'Block(s)', value: teamStats.totalBlocks },
    { label: 'Pressure(s)', value: teamStats.totalPressures },
  );
  return stats;
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass, palette: Palette) {
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
    sectionCard: {
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 2,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      marginBottom: 16,
    },
    teamStatsSectionTitle: {
      backgroundColor: palette.statsHeaderBg,
      marginHorizontal: -16,
      marginTop: -16,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopLeftRadius: 15,
      borderTopRightRadius: 15,
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.bold,
      marginBottom: 12,
    },
    sectionTitleRow: {
      backgroundColor: palette.statsHeaderBg,
      marginHorizontal: -16,
      marginTop: -16,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopLeftRadius: 15,
      borderTopRightRadius: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    sectionTitle: {
      flex: 1,
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.bold,
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
      marginTop: 14,
      paddingTop: 14,
    },
    subsectionContainerFirst: {
      marginTop: 0,
    },
    subsectionTitle: {
      fontSize: scaleBySizeClass(13, sizeClass),
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
