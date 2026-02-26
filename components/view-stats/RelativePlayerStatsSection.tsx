import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  clamp01,
  formatRawValue,
  getContextLabel,
  getMetricTone,
  getRelativeLabel,
  getSampleWarningLabel,
  RelativeMode,
  RelativeRowMetric,
} from '@/lib/relativeStatsViewUtils';
import {
  computeRelativePlayerStats,
  computeRelativePlayingTimeStats,
  PlayerStats,
  RelativePlayerMetric,
  RelativePlayerMetricKey,
  RelativePlayingTimeMetric,
  RelativePlayingTimeMetricKey,
} from '@/lib/statsUtils';
import { GameEvent, Player, PointLineRecord, SavedGame } from '@/lib/storage';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type RelativeEventRow = RelativePlayerMetric & { category: 'event' };
type RelativePlayingTimeRow = RelativePlayingTimeMetric & { category: 'playingTime' };

interface RelativePlayerStatsSectionProps {
  playerId: string;
  allPlayerStats: PlayerStats[];
  events: GameEvent[];
  pointLines?: PointLineRecord[] | null;
  startingPossession?: 'team1' | 'team2' | null;
  gameTo?: number;
  games?: SavedGame[] | null;
  roster?: Player[] | null;
}

const PRODUCTION_KEYS: RelativePlayerMetricKey[] = ['assists', 'goals', 'blocks'];
const MISTAKE_KEYS: RelativePlayerMetricKey[] = ['throwaways', 'drops', 'totalTurnovers'];
const IMPACT_KEYS: RelativePlayerMetricKey[] = ['plusMinus'];
const PLAYING_TIME_KEYS: RelativePlayingTimeMetricKey[] = [
  'pointsPlayed',
  'pointWinRate',
  'oEfficiency',
  'dEfficiency',
  'minutesPlayed',
  'playingTimePercent',
];

export default function RelativePlayerStatsSection({
  playerId,
  allPlayerStats,
  events,
  pointLines,
  startingPossession,
  gameTo = 15,
  games,
  roster,
}: RelativePlayerStatsSectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const [mode, setMode] = useState<RelativeMode>('avg');

  const eventMetrics = computeRelativePlayerStats(
    playerId,
    allPlayerStats,
    roster ?? undefined,
  ).map((metric) => ({
    ...metric,
    category: 'event' as const,
  }));
  const playingTimeMetrics = computeRelativePlayingTimeStats(
    playerId,
    pointLines,
    events,
    startingPossession ?? null,
    gameTo,
  ).map((metric) => ({ ...metric, category: 'playingTime' as const }));

  if (!eventMetrics.length && !playingTimeMetrics.length) {
    return null;
  }

  const eventByKey = new Map(eventMetrics.map((metric) => [metric.key, metric]));
  const productionMetrics = PRODUCTION_KEYS.map((key) => eventByKey.get(key))
    .filter((metric): metric is RelativeEventRow => !!metric)
    .filter((metric) => metric.raw > 0);
  const mistakeMetrics = MISTAKE_KEYS.map((key) => eventByKey.get(key))
    .filter((metric): metric is RelativeEventRow => !!metric)
    .filter((metric) => metric.raw > 0);
  const impactMetrics = IMPACT_KEYS.map((key) => eventByKey.get(key)).filter(
    (metric): metric is RelativeEventRow => !!metric,
  );

  const ptByKey = new Map(playingTimeMetrics.map((metric) => [metric.key, metric]));
  const ptMetrics = PLAYING_TIME_KEYS.map((key) => ptByKey.get(key)).filter(
    (metric): metric is RelativePlayingTimeRow => !!metric,
  );

  const trackedGameCount = games?.filter((game) => (game.pointLines?.length ?? 0) > 0).length ?? 0;
  const totalGameCount = games?.length ?? 0;
  const showPartialCoverageNote =
    totalGameCount > 1 && trackedGameCount > 0 && trackedGameCount < totalGameCount;
  const subjectLabel = allPlayerStats.find((stats) => stats.id === playerId)?.name ?? 'Player';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
      ]}>
      <View style={styles.headerStack}>
        <Text style={[styles.title, { color: palette.textMuted }]}>RELATIVE TO TEAM</Text>

        <View style={styles.headerControlsRow}>
          <View
            style={[
              styles.toggle,
              { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
            ]}>
            <Pressable
              onPress={() => setMode('avg')}
              style={[
                styles.toggleButton,
                mode === 'avg' && {
                  backgroundColor: palette.accentOverlay15,
                  borderColor: palette.accentOverlay30,
                },
              ]}>
              <Text
                style={[
                  styles.toggleText,
                  { color: mode === 'avg' ? palette.accent : palette.textMuted },
                ]}>
                Team Avg
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('max')}
              style={[
                styles.toggleButton,
                mode === 'max' && {
                  backgroundColor: palette.accentOverlay15,
                  borderColor: palette.accentOverlay30,
                },
              ]}>
              <Text
                style={[
                  styles.toggleText,
                  { color: mode === 'max' ? palette.accent : palette.textMuted },
                ]}>
                Team Best
              </Text>
            </Pressable>
          </View>

          <View style={styles.legendSlot}>
            {mode === 'avg' && (
              <View style={styles.legendItem}>
                <View style={[styles.legendMarker, { backgroundColor: palette.textInverse }]} />
                <Text style={[styles.legendText, { color: palette.textMuted }]}>= Team Avg</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {renderGroup('PRODUCTION', productionMetrics, mode, styles, palette, sizeClass, subjectLabel)}
      {renderGroup('MISTAKES', mistakeMetrics, mode, styles, palette, sizeClass, subjectLabel)}
      {renderGroup('IMPACT', impactMetrics, mode, styles, palette, sizeClass, subjectLabel)}

      {ptMetrics.length > 0 && (
        <>
          <View style={[styles.sectionDivider, { backgroundColor: palette.overlay10 }]} />
          {showPartialCoverageNote && (
            <Text style={[styles.sampleNote, { color: palette.textMuted }]}>
              Playing-time comparisons are based on line data in {trackedGameCount}/{totalGameCount}{' '}
              selected games.
            </Text>
          )}
          {renderGroup('PLAYING TIME', ptMetrics, mode, styles, palette, sizeClass, subjectLabel)}
        </>
      )}
    </View>
  );
}

function renderGroup(
  title: string,
  metrics: RelativeRowMetric[],
  mode: RelativeMode,
  styles: ReturnType<typeof createStyles>,
  palette: ReturnType<typeof useTheme>['palette'],
  sizeClass: SizeClass,
  subjectLabel: string,
) {
  if (!metrics.length) {
    return null;
  }

  return (
    <View style={styles.group}>
      <View style={styles.groupHeaderRow}>
        <Text style={[styles.groupTitle, { color: palette.textMuted }]}>{title}</Text>
      </View>

      <View style={styles.groupRows}>
        {metrics.map((metric) => {
          const tone = getMetricTone(metric);
          const barColor =
            tone === 'good' ? palette.success : tone === 'bad' ? palette.danger : palette.accent;

          const relativeColor =
            tone === 'good'
              ? palette.success
              : tone === 'bad'
                ? palette.danger
                : palette.textInverse;

          const isDiverging = mode === 'avg';
          const range = metric.teamMax - metric.teamMin;
          const isFlat = range <= 0;
          const sampleWarning = getSampleWarningLabel(metric);

          const rawPct = isFlat ? 0.5 : clamp01((metric.raw - metric.teamMin) / range);
          const avgPct = isFlat ? 0.5 : clamp01((metric.teamAvg - metric.teamMin) / range);

          let barContent = null;

          barContent = (
            <>
              <View
                style={[
                  styles.barFill,
                  {
                    position: 'absolute',
                    width: `${rawPct * 100}%`,
                    left: 0,
                    backgroundColor: barColor,
                  },
                ]}
              />
              {isDiverging && (
                <View
                  style={[
                    styles.marker,
                    {
                      left: `${avgPct * 100}%`,
                      backgroundColor: palette.textInverse,
                      // If the marker is at the right edge, push it left so it's not clipped.
                      marginLeft: avgPct > 0.5 ? -scaleBySizeClass(2, sizeClass) : 0,
                    },
                  ]}
                />
              )}
            </>
          );

          return (
            <View
              key={`${metric.category}-${metric.key}`}
              style={[styles.row, { borderColor: palette.overlay05 }]}>
              <View style={styles.rowTop}>
                <Text style={[styles.metricLabel, { color: palette.textInverse }]}>
                  {metric.label}
                </Text>

                <Text style={[styles.relativeText, { color: relativeColor }]}>
                  {getRelativeLabel(metric, mode)}
                </Text>
              </View>

              {'detail' in metric && metric.detail && !!metric.detail && (
                <Text style={[styles.detailText, { color: palette.textMuted }]}>
                  {metric.detail}
                </Text>
              )}
              {sampleWarning && (
                <Text style={[styles.detailText, { color: palette.textMuted }]}>
                  {sampleWarning}
                </Text>
              )}

              <View
                style={[
                  styles.barTrack,
                  {
                    backgroundColor: palette.overlay10,
                  },
                ]}>
                {barContent}
              </View>

              <View style={styles.rowMeta}>
                <Text style={[styles.contextText, { color: palette.textMuted }]}>
                  {`${subjectLabel}: ${formatRawValue(metric)}`}
                </Text>
                <Text style={[styles.contextText, { color: palette.textMuted }]}>
                  {getContextLabel(metric, mode)}
                </Text>
              </View>
            </View>
          );
        })}
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
      gap: 14,
    },
    headerStack: {
      gap: scaleBySizeClass(8, sizeClass),
    },
    title: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    headerControlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      gap: scaleBySizeClass(12, sizeClass),
    },
    legendSlot: {
      minHeight: scaleBySizeClass(24, sizeClass),
      justifyContent: 'center',
    },
    subtitle: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
      marginTop: 2,
    },
    toggle: {
      flexDirection: 'row',
      borderRadius: 10,
      borderWidth: 1,
      padding: 2,
      gap: 2,
    },
    toggleButton: {
      borderRadius: 8,
      borderWidth: 0,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    toggleText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '700',
    },
    sampleNote: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '500',
      lineHeight: scaleBySizeClass(14, sizeClass),
    },
    sectionDivider: {
      height: 1,
      borderRadius: 999,
    },
    group: {
      gap: 8,
    },
    groupHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    groupTitle: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '700',
      letterSpacing: 1,
    },
    groupRows: {
      gap: 8,
    },
    row: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
      gap: 8,
    },
    rowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    metricLabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontWeight: '700',
    },
    rowMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    relativeText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '800',
    },
    contextText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
    },
    detailText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
    },
    barTrack: {
      height: scaleBySizeClass(8, sizeClass),
      borderRadius: 999,
      overflow: 'hidden',
      position: 'relative',
    },
    barFill: {
      height: '100%',
      borderRadius: 999,
      minWidth: scaleBySizeClass(2, sizeClass),
    },
    marker: {
      position: 'absolute',
      width: scaleBySizeClass(3, sizeClass),
      height: '100%',
      borderRadius: scaleBySizeClass(2, sizeClass),
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
    },
    legendMarker: {
      width: scaleBySizeClass(3, sizeClass),
      height: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(2, sizeClass),
    },
    legendText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
    },
  });
}
