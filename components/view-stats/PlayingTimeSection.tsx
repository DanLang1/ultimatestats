import React from 'react';
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
import PlayingTimePill from './PlayingTimePill';

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
  let scoreRateColor: string;
  if (rates.pointWinRate >= 60) {
    scoreRateColor = palette.success;
  } else if (rates.pointWinRate <= 40) {
    scoreRateColor = palette.danger;
  } else {
    scoreRateColor = palette.textInverse;
  }

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
  const totalPlayingTimeLabel = hasTiming ? formatMinutesPlayed(stats.minutesPlayed!) : '—';
  const avgPerPointLabel = stats.avgPointDurationMs
    ? `${Math.round(stats.avgPointDurationMs / 1000)}s`
    : '—';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
      ]}>
      <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
        PLAYING TIME
      </ThemedText>

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

          <View style={styles.heroMetricsRow}>
            <PlayingTimePill
              label="Total PT (min)"
              value={totalPlayingTimeLabel}
              align="left"
              compact
            />
            <PlayingTimePill label="Avg / pt" value={avgPerPointLabel} align="left" compact />
            <PlayingTimePill
              label="Score Rate"
              value={`${rates.pointWinRate.toFixed(0)}%`}
              color={scoreRateColor}
              align="left"
              compact
            />
          </View>
        </View>
      </View>

      <View style={styles.roleSection}>
        <ThemedText style={[styles.sectionLabel, { color: palette.textMuted }]}>
          LINE BALANCE
        </ThemedText>
        <RoleBalanceBar
          oPoints={stats.oPoints}
          dPoints={stats.dPoints}
          oLineHolds={stats.oLineHolds}
          dLineBreaks={stats.dLineBreaks}
        />
      </View>

      <View style={styles.perPointSection}>
        <ThemedText style={[styles.sectionLabel, { color: palette.textMuted }]}>
          PER POINT
        </ThemedText>
        <View style={styles.pillGrid}>
          <PlayingTimePill label="Goals" value={goalsPerPoint.toFixed(2)} />
          <PlayingTimePill label="Assists" value={assistsPerPoint.toFixed(2)} />
          <PlayingTimePill label="Blocks" value={blocksPerPoint.toFixed(2)} />
          <PlayingTimePill label="TO" value={turnoversPerPoint.toFixed(2)} />
          <PlayingTimePill label="TA" value={throwawaysPerPoint.toFixed(2)} />
          <PlayingTimePill label="Drops" value={dropsPerPoint.toFixed(2)} />
        </View>
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginTop: 16,
      gap: 14,
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      textTransform: 'uppercase',
      alignSelf: 'center',
    },
    overviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      ...(sizeClass !== 'small' && { alignSelf: 'center' as const }),
    },
    heroDetails: {
      ...(sizeClass === 'small' && { flex: 1 }),
      gap: 6,
    },
    heroSubtext: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    heroMetricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 2,
    },
    roleSection: {
      gap: 8,
    },
    perPointSection: {
      gap: 8,
    },
    sectionLabel: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.5,
      ...(sizeClass !== 'small' && { alignSelf: 'center' as const }),
    },
    pillGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      ...(sizeClass !== 'small' && { justifyContent: 'center' as const }),
    },
  });
}
