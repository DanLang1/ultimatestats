import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  computePerPointStats,
  computePlayingTimeStats,
  computeRates,
  formatMinutesPlayed,
} from '@/lib/playingTimeStatsUtils';
import { GameEvent, PointLineRecord } from '@/lib/storage';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PlayingTimePill from './PlayingTimePill';
import PlayingTimeGauge from './playing-time/PlayingTimeGauge';
import RoleBalanceBar from './playing-time/RoleBalanceBar';

interface PlayingTimeSectionProps {
  playerId: string;
  events: GameEvent[];
  pointLines?: PointLineRecord[] | null;
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

  if (!pointLines?.length) {
    return null;
  }

  const playingTimeStats = computePlayingTimeStats(
    pointLines,
    events,
    startingPossession ?? null,
    gameTo,
    { autoHalftimeEnabled },
  );

  const stats = playingTimeStats.get(playerId);
  if (!stats) {
    return null;
  }

  const rates = computeRates(stats);
  const scoreRateColor =
    rates.pointWinRate >= 60
      ? palette.success
      : rates.pointWinRate <= 40
        ? palette.danger
        : palette.textInverse;

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
      <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>PLAYING TIME</Text>

      <View style={styles.overviewRow}>
        <PlayingTimeGauge
          percentage={stats.playingTimePercent ?? 0}
          centerLabel={stats.pointsPlayed.toString()}
          centerSubLabel="Points"
          color={palette.accent}
          sizeClass={sizeClass}
        />

        <View style={styles.heroDetails}>
          <Text style={[styles.heroSubtext, { color: palette.textMuted }]}>
            Played {stats.playingTimePercent?.toFixed(0) ?? '0'}% of team points
          </Text>

          <View style={styles.heroMetricsRow}>
            <PlayingTimePill
              label="Total PT"
              value={totalPlayingTimeLabel}
              align="left"
              compact
              sizeClass={sizeClass}
            />
            <PlayingTimePill
              label="Avg / pt"
              value={avgPerPointLabel}
              align="left"
              compact
              sizeClass={sizeClass}
            />
            <PlayingTimePill
              label="Score Rate"
              value={`${rates.pointWinRate.toFixed(0)}%`}
              color={scoreRateColor}
              align="left"
              compact
              sizeClass={sizeClass}
            />
          </View>
        </View>
      </View>

      <View style={styles.roleSection}>
        <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>LINE BALANCE</Text>
        <RoleBalanceBar
          oPoints={stats.oPoints}
          dPoints={stats.dPoints}
          oLineHolds={stats.oLineHolds}
          dLineBreaks={stats.dLineBreaks}
          sizeClass={sizeClass}
        />
      </View>

      <View style={styles.perPointSection}>
        <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>PER POINT</Text>
        <View style={styles.pillGrid}>
          <PlayingTimePill label="Goals" value={goalsPerPoint.toFixed(2)} sizeClass={sizeClass} />
          <PlayingTimePill
            label="Assists"
            value={assistsPerPoint.toFixed(2)}
            sizeClass={sizeClass}
          />
          <PlayingTimePill label="Blocks" value={blocksPerPoint.toFixed(2)} sizeClass={sizeClass} />
          <PlayingTimePill label="TO" value={turnoversPerPoint.toFixed(2)} sizeClass={sizeClass} />
          <PlayingTimePill label="TA" value={throwawaysPerPoint.toFixed(2)} sizeClass={sizeClass} />
          <PlayingTimePill label="Drops" value={dropsPerPoint.toFixed(2)} sizeClass={sizeClass} />
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
      fontWeight: '700',
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
      fontWeight: '500',
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
      fontWeight: '600',
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
