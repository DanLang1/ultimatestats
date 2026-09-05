import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  aggregatePlayingTimeStats,
  computePerPointStats,
  computePlayingTimeStats,
  computeRates,
  formatMinutesPlayed,
} from '@/lib/basic/playingTimeStatsUtils';
import { GameEvent, PointLineRecord, SavedGame } from '@/lib/storage';
import { Fonts } from '@/theme/theme';

import PlayingTimeGauge from './playing-time/PlayingTimeGauge';
import RoleBalanceBar from './playing-time/RoleBalanceBar';
import StatsGrid from './StatsGrid';
import StatsSectionCard from './StatsSectionCard';

interface PlayingTimeSectionProps {
  playerId: string;
  events: GameEvent[];
  pointLines?: PointLineRecord[] | null;
  games?: SavedGame[] | null;
  startingPossession?: 'team1' | 'team2' | null;
  gameTo?: number;
  autoHalftimeEnabled?: boolean;
  goals?: number;
  assists?: number;
  blocks?: number;
  turnovers?: number;
  throwaways?: number;
  drops?: number;
}

export default function PlayingTimeSection({
  playerId,
  events,
  pointLines,
  games,
  startingPossession,
  gameTo = 15,
  autoHalftimeEnabled = true,
  goals = 0,
  assists = 0,
  blocks = 0,
  turnovers = 0,
  throwaways = 0,
  drops = 0,
}: PlayingTimeSectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  let playingTimeStats: ReturnType<typeof aggregatePlayingTimeStats> | null;
  if (games && games.length > 0) {
    playingTimeStats = aggregatePlayingTimeStats(games);
  } else if (pointLines?.length) {
    playingTimeStats = computePlayingTimeStats(
      pointLines,
      events,
      startingPossession ?? null,
      gameTo,
      {
        autoHalftimeEnabled,
      },
    );
  } else {
    playingTimeStats = null;
  }

  if (!playingTimeStats || playingTimeStats.size === 0) {
    return null;
  }

  const stats = playingTimeStats.get(playerId);
  if (!stats) {
    return null;
  }

  const rates = computeRates(stats);

  const {
    goalsPerPoint,
    assistsPerPoint,
    blocksPerPoint,
    turnoversPerPoint,
    throwawaysPerPoint,
    dropsPerPoint,
  } = computePerPointStats(
    stats.pointsPlayed,
    goals,
    assists,
    blocks,
    turnovers,
    throwaways,
    drops,
  );

  const hasTiming = stats.minutesPlayed !== undefined && stats.minutesPlayed > 0;
  const totalPlayingTimeLabel = hasTiming ? formatMinutesPlayed(stats.minutesPlayed) : '—';
  const avgPerPointLabel = stats.avgPointDurationMs
    ? `${Math.round(stats.avgPointDurationMs / 1000)}s`
    : '—';

  return (
    <StatsSectionCard title="Playing time">
      <View style={styles.content}>
        <View style={styles.overviewRow}>
          <PlayingTimeGauge
            percentage={stats.playingTimePercent ?? 0}
            centerLabel={stats.pointsPlayed.toString()}
            centerSubLabel="Points"
            color={palette.accent}
          />

          <View style={styles.heroDetails}>
            <ThemedText style={[styles.heroSubtext, { color: palette.textMuted }]}>
              Played {stats.playingTimePercent?.toFixed(0) ?? '0'}% of team points
            </ThemedText>
          </View>
        </View>

        <StatsGrid
          variant="summary"
          columns={3}
          stats={[
            { label: 'Time played', value: totalPlayingTimeLabel, sublabel: 'min:sec' },
            { label: 'Avg point duration', value: avgPerPointLabel },
            { label: 'Points won while playing', value: `${rates.pointWinRate.toFixed(0)}%` },
          ]}
        />

        <View style={styles.roleSection}>
          <ThemedText style={[styles.sectionLabel, { color: palette.textMuted }]}>
            O/D performance
          </ThemedText>
          <RoleBalanceBar
            oEfficiency={stats.oPoints > 0 ? stats.oLineHolds / stats.oPoints : null}
            dEfficiency={stats.dPoints > 0 ? stats.dLineBreaks / stats.dPoints : null}
            oPoints={stats.oPoints}
            dPoints={stats.dPoints}
            oLineHolds={stats.oLineHolds}
            dLineBreaks={stats.dLineBreaks}
          />
        </View>

        <View style={styles.perPointSection}>
          <ThemedText style={[styles.sectionLabel, { color: palette.textMuted }]}>
            Per point
          </ThemedText>
          <StatsGrid
            variant="summary"
            columns={3}
            stats={[
              { label: 'Goals', value: goalsPerPoint.toFixed(2) },
              { label: 'Assists', value: assistsPerPoint.toFixed(2) },
              { label: 'Blocks', value: blocksPerPoint.toFixed(2) },
              { label: 'Turnovers', value: turnoversPerPoint.toFixed(2) },
              { label: 'Throwaways', value: throwawaysPerPoint.toFixed(2) },
              { label: 'Drops', value: dropsPerPoint.toFixed(2) },
            ]}
          />
        </View>
      </View>
    </StatsSectionCard>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    content: { gap: 16 },
    overviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    heroDetails: {
      flex: 1,
      gap: 6,
    },
    heroSubtext: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    roleSection: {
      gap: 8,
    },
    perPointSection: {
      gap: 8,
    },
    sectionLabel: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.5,
    },
  });
}
