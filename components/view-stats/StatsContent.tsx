import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { ensureContrast } from '@/lib/colorUtils';
import { computePlayerStats } from '@/lib/statsUtils';
import { GameEvent, Player, PointLineRecord, SavedGame } from '@/lib/storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import StatsTable from './StatsTable';
import TeamStatsSection from './TeamStatsSection';

interface StatsContentProps {
  team1Name: string;
  team2Name: string;
  team1Score?: number;
  team2Score?: number;
  events: GameEvent[];
  roster?: Player[];
  isSavedGame?: boolean;
  aggregateInfo?: { teamName: string; gameCount: number };
  startingPossession?: 'team1' | 'team2' | null;
  gameTo?: number;
  autoHalftimeEnabled?: boolean;
  games?: SavedGame[];
  pointLines?: PointLineRecord[];
  team1Color?: string;
  team2Color?: string;
}

export default function StatsContent({
  team1Name,
  team2Name,
  team1Score,
  team2Score,
  events,
  roster,
  isSavedGame,
  aggregateInfo,
  startingPossession = null,
  gameTo = 15,
  autoHalftimeEnabled = true,
  games,
  pointLines,
  team1Color,
  team2Color,
}: StatsContentProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const cardBg = palette.overlay05;
  const t1TextColor = team1Color ? ensureContrast(team1Color, cardBg, 4.5) : palette.textInverse;
  const t2TextColor = team2Color ? ensureContrast(team2Color, cardBg, 4.5) : palette.textMuted;
  const playerStats = computePlayerStats(events, 'team1', roster);
  const goalCount = events.filter((e) => e.type === 'goal' && e.team === 'team1').length;
  const topPerformers = playerStats.filter((p) => p.plusMinus > 0).slice(0, 3);
  const showOpponentName = !aggregateInfo && team2Name.trim().length > 0;
  const summaryBadge = aggregateInfo ? (
    <View
      style={[
        styles.summaryBadge,
        { backgroundColor: palette.indigoOverlay20, borderColor: palette.accent },
      ]}>
      <Text style={[styles.summaryBadgeText, { color: palette.accent }]}>
        {aggregateInfo.gameCount} Game{aggregateInfo.gameCount !== 1 ? 's' : ''} Combined
      </Text>
    </View>
  ) : team1Score !== undefined && team2Score !== undefined ? (
    <ScoreBadge score1={team1Score} score2={team2Score} size="large" style={styles.scoreBadge} />
  ) : (
    <View
      style={[
        styles.summaryBadge,
        { backgroundColor: palette.indigoOverlay20, borderColor: palette.accent },
      ]}>
      <Text style={[styles.summaryBadgeText, { color: palette.accent }]}>
        {goalCount} Point{goalCount !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  return (
    <>
      {/* Team Summary Card */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
        ]}>
        {showOpponentName ? (
          <View style={styles.matchupRow}>
            <View style={styles.teamBlock}>
              <Text
                style={[styles.teamName, styles.teamNameLeft, { color: t1TextColor }]}
                numberOfLines={2}>
                {team1Name}
              </Text>
            </View>

            <View style={styles.summaryCenter}>{summaryBadge}</View>

            <View style={[styles.teamBlock, styles.teamBlockRight]}>
              <Text
                style={[styles.teamName, styles.teamNameRight, { color: t2TextColor }]}
                numberOfLines={2}>
                {team2Name}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.aggregateHero}>
            <Text style={[styles.aggregateLabel, { color: palette.textMuted }]}>TEAM</Text>
            <Text
              style={[styles.aggregateTeamName, { color: palette.textInverse }]}
              numberOfLines={2}>
              {team1Name}
            </Text>
            {summaryBadge}
          </View>
        )}

        {topPerformers.length > 0 ? (
          <View style={[styles.topPerformersSection, { borderTopColor: palette.overlay10 }]}>
            <Text style={[styles.topPerformersTitle, { color: palette.textMuted }]}>
              TOP PERFORMERS
            </Text>
            <View style={styles.topPerformersList}>
              {topPerformers.map((player, index) => (
                <View key={player.id} style={styles.topPerformerRow}>
                  <Text style={[styles.topPerformerRank, { color: palette.textMuted }]}>
                    {index + 1}.
                  </Text>
                  <Text
                    style={[styles.topPerformerName, { color: palette.textInverse }]}
                    numberOfLines={1}>
                    {player.name}
                  </Text>
                  <Text style={[styles.topPerformerPlusMinus, { color: palette.success }]}>
                    +{player.plusMinus}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {/* Team Stats Section */}
      <TeamStatsSection
        events={events}
        startingPossession={startingPossession}
        gameTo={gameTo}
        autoHalftimeEnabled={autoHalftimeEnabled}
        team1Name={team1Name}
        team2Name={team2Name}
        team1Color={team1Color}
        team2Color={team2Color}
      />

      {/* Player Stats Table */}
      {playerStats.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="chart-bar-stacked"
            size={scaleBySizeClass(48, sizeClass)}
            color={palette.textMuted}
          />
          <Text style={[styles.emptyText, { color: palette.textMuted }]}>
            {isSavedGame ? 'No player stats recorded for this game' : 'No stats recorded yet'}
          </Text>
        </View>
      ) : (
        <StatsTable
          playerStats={playerStats}
          events={events}
          team="team1"
          roster={roster}
          games={games}
          pointLines={pointLines}
          startingPossession={startingPossession}
          gameTo={gameTo}
          autoHalftimeEnabled={autoHalftimeEnabled}
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
      position: 'relative',
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
      fontWeight: '700',
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
    aggregateHero: {
      alignItems: isLandscape ? 'flex-start' : 'center',
      gap: 8,
    },
    aggregateLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    aggregateTeamName: {
      fontSize: scaleBySizeClass(24, sizeClass),
      fontWeight: '700',
      textAlign: isLandscape ? 'left' : 'center',
    },
    summaryBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
    },
    summaryBadgeText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '600',
    },
    topPerformersSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
    },
    topPerformersTitle: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 10,
      textAlign: 'left',
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
      fontWeight: '700',
      width: 20,
    },
    topPerformerName: {
      flex: 1,
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '600',
    },
    topPerformerPlusMinus: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '800',
      minWidth: 44,
      textAlign: 'right',
    },
    headerExportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    headerExportText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '600',
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
