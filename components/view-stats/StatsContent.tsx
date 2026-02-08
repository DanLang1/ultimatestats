import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { useTheme } from '@/context/ThemeContext';
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
  games?: SavedGame[];
  pointLines?: PointLineRecord[];
}

export default function StatsContent({
  team1Name,
  team1Score,
  team2Score,
  events,
  roster,
  isSavedGame,
  aggregateInfo,
  startingPossession = null,
  gameTo = 15,
  games,
  pointLines,
}: StatsContentProps) {
  const { palette } = useTheme();
  const playerStats = computePlayerStats(events, 'team1', roster);
  const goalCount = events.filter((e) => e.type === 'goal' && e.team === 'team1').length;
  const topPerformers = playerStats.filter((p) => p.plusMinus > 0).slice(0, 3);

  return (
    <>
      {/* Team Summary Card */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
        ]}>
        <View style={styles.summaryColumns}>
          {/* Left Column: Team Info */}
          <View style={styles.summaryLeft}>
            <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>MY TEAM</Text>
            <Text style={[styles.summaryTeamName, { color: palette.textInverse }]}>
              {team1Name}
            </Text>
            {aggregateInfo ? (
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
              <ScoreBadge score1={team1Score} score2={team2Score} size="large" />
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
            )}
          </View>

          {/* Right Column: Top Performers */}
          {topPerformers.length > 0 && (
            <View style={[styles.summaryRight, { borderLeftColor: palette.overlay10 }]}>
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
          )}
        </View>
      </View>

      {/* Team Stats Section */}
      <TeamStatsSection events={events} startingPossession={startingPossession} gameTo={gameTo} />

      {/* Player Stats Table */}
      {playerStats.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="chart-bar-stacked" size={48} color={palette.textMuted} />
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
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    position: 'relative',
  },
  summaryColumns: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
  },
  summaryLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  summaryRight: {
    flex: 1,
    paddingLeft: 16,
    borderLeftWidth: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryTeamName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  topPerformersTitle: {
    fontSize: 10,
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
    fontSize: 12,
    fontWeight: '700',
    width: 20,
  },
  topPerformerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  topPerformerPlusMinus: {
    fontSize: 14,
    fontWeight: '800',
    minWidth: 44,
    textAlign: 'right',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
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
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
