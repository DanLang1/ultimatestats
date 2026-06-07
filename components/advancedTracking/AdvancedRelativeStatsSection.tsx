import { ThemedText } from '@/components/ThemedText';
import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { AdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import {
  getRoundedDecimalDelta,
  getRoundedPercentagePointDelta,
} from '@/lib/relativeStatsViewUtils';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type RelativeMode = 'avg' | 'max';

interface Metric {
  key: string;
  label: string;
  raw: number;
  teamAvg: number;
  teamMax: number;
  teamMin: number;
  higherIsBetter: boolean;
  formatValue: (v: number) => string;
}

interface AdvancedRelativeStatsSectionProps {
  participantId: string;
  allPlayerStats: AdvancedPlayerStats[];
  participantNames: Map<string, string>;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function hasMetric(metric: Metric | null): metric is Metric {
  return metric != null;
}

function isPercentageMetric(metric: Metric): boolean {
  return (
    metric.key === 'completionPct' ||
    metric.key === 'oEfficiency' ||
    metric.key === 'dEfficiency' ||
    metric.key === 'playingTimePct'
  );
}

function formatTeamAverage(metric: Metric): string {
  if (isPercentageMetric(metric) || metric.key === 'minutesPlayed') {
    return metric.formatValue(metric.teamAvg);
  }

  const rounded = Math.round(metric.teamAvg * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}

function buildMetrics(
  participantId: string,
  allStats: AdvancedPlayerStats[],
): Record<string, Metric[]> {
  const me = allStats.find((s) => s.participantId === participantId);
  if (!me) return {};

  const subjectStats = me;
  const active = allStats.filter((s) => s.pointsPlayed > 0);

  function metric(
    key: string,
    label: string,
    getValue: (s: AdvancedPlayerStats) => number | null,
    higherIsBetter: boolean,
    formatValue: (v: number) => string,
    comparisonPool: AdvancedPlayerStats[] = active,
  ): Metric | null {
    const raw = getValue(subjectStats);
    if (raw == null) return null;

    const values = comparisonPool.map(getValue).filter((value): value is number => value != null);
    const teamAvg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return {
      key,
      label,
      raw,
      teamAvg,
      teamMax: Math.max(...values, 0),
      teamMin: Math.min(...values, 0),
      higherIsBetter,
      formatValue,
    };
  }

  const int = (v: number) => String(Math.round(v));
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const dec1 = (v: number) => v.toFixed(1);

  const productionMetrics = [
    metric('goals', 'Goals', (s) => s.goals, true, int),
    metric('assists', 'Assists', (s) => s.assists, true, int),
    metric('hockeyAssists', 'Hockey Assists', (s) => s.hockeyAssists, true, int),
    metric('blocks', 'Blocks', (s) => s.blocks, true, int),
  ]
    .filter(hasMetric)
    .filter((m) => m.raw > 0 || m.teamMax > 0);

  const mistakeMetrics = [
    metric('throwaways', 'Throwaways', (s) => s.throwaways, false, int),
    metric('drops', 'Drops', (s) => s.drops, false, int),
  ]
    .filter(hasMetric)
    .filter((m) => m.raw > 0 || m.teamMax > 0);

  const impactMetrics = [
    metric(
      'plusMinus',
      '+/-',
      (s) => s.plusMinus,
      true,
      (v) => (v > 0 ? `+${Math.round(v)}` : String(Math.round(v))),
    ),
  ].filter(hasMetric);

  const throwingMetrics =
    active.filter((s) => s.throwAttempts > 0).length > 1
      ? [
          metric(
            'completionPct',
            'Completion %',
            (s) => s.completionPct,
            true,
            pct,
            active.filter((s) => s.throwAttempts > 0),
          ),
          metric(
            'throwAttempts',
            'Throw Attempts',
            (s) => s.throwAttempts,
            true,
            int,
            active.filter((s) => s.throwAttempts > 0),
          ),
        ]
          .filter(hasMetric)
          .filter((m) => m.raw > 0 || m.teamMax > 0)
      : [];

  const efficiencyMetrics = [
    ...(active.some((s) => s.oPoints > 0)
      ? [
          metric(
            'oEfficiency',
            'O-Efficiency',
            (s) => s.oEfficiency,
            true,
            pct,
            active.filter((s) => s.oPoints > 0),
          ),
        ]
      : []),
    ...(active.some((s) => s.dPoints > 0)
      ? [
          metric(
            'dEfficiency',
            'D-Efficiency',
            (s) => s.dEfficiency,
            true,
            pct,
            active.filter((s) => s.dPoints > 0),
          ),
        ]
      : []),
    metric('pointsPlayed', 'Points Played', (s) => s.pointsPlayed, true, int),
    ...(active.some((s) => s.playingTimePct != null)
      ? [
          metric(
            'playingTimePct',
            'Playing Time',
            (s) => s.playingTimePct,
            true,
            pct,
            active.filter((s) => s.playingTimePct != null),
          ),
        ]
      : []),
    ...(active.some((s) => s.pointDurationMs != null)
      ? [
          metric(
            'minutesPlayed',
            'Minutes Played',
            (s) => (s.pointDurationMs != null ? s.pointDurationMs / 60000 : null),
            true,
            dec1,
            active.filter((s) => s.pointDurationMs != null),
          ),
        ]
      : []),
  ].filter(hasMetric);

  const result: Record<string, Metric[]> = {};
  if (productionMetrics.length > 0) result['PRODUCTION'] = productionMetrics;
  if (mistakeMetrics.length > 0) result['MISTAKES'] = mistakeMetrics;
  if (impactMetrics.length > 0) result['IMPACT'] = impactMetrics;
  if (throwingMetrics.length > 0) result['THROWING'] = throwingMetrics;
  if (efficiencyMetrics.length > 0) result['EFFICIENCY'] = efficiencyMetrics;
  return result;
}

export default function AdvancedRelativeStatsSection({
  participantId,
  allPlayerStats,
  participantNames,
}: AdvancedRelativeStatsSectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { showAlert } = useAlert();
  const [mode, setMode] = useState<RelativeMode>('avg');

  const groups = buildMetrics(participantId, allPlayerStats);
  const subjectLabel = participantNames.get(participantId) ?? participantId;

  if (Object.keys(groups).length === 0) return null;

  const handleInfoPress = () => {
    showAlert({
      title: 'Relative to Team',
      message: 'Players who played at least one point are included in averages.',
    });
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
      ]}>
      <View style={styles.headerStack}>
        <View style={styles.titleRow}>
          <ThemedText style={[styles.title, { color: palette.textMuted }]}>
            RELATIVE TO TEAM
          </ThemedText>
          <Pressable onPress={handleInfoPress} hitSlop={8}>
            <MaterialCommunityIcons
              name="help-circle-outline"
              size={scaleBySizeClass(14, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
        </View>

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
              <ThemedText
                style={[
                  styles.toggleText,
                  { color: mode === 'avg' ? palette.accent : palette.textMuted },
                ]}>
                Team Avg
              </ThemedText>
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
              <ThemedText
                style={[
                  styles.toggleText,
                  { color: mode === 'max' ? palette.accent : palette.textMuted },
                ]}>
                Team Best
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.legendSlot}>
            {mode === 'avg' && (
              <View style={styles.legendItem}>
                <View style={[styles.legendMarker, { backgroundColor: palette.textInverse }]} />
                <ThemedText style={[styles.legendText, { color: palette.textMuted }]}>
                  = Team Avg
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>

      {Object.entries(groups).map(([groupName, metrics]) => (
        <View key={groupName} style={styles.group}>
          <ThemedText style={[styles.groupTitle, { color: palette.textMuted }]}>
            {groupName}
          </ThemedText>
          <View style={styles.groupRows}>
            {metrics.map((metric) => {
              const diff = isPercentageMetric(metric)
                ? getRoundedPercentagePointDelta(metric.raw, metric.teamAvg)
                : getRoundedDecimalDelta(metric.raw, metric.teamAvg);
              const isGood = diff > 0 ? metric.higherIsBetter : !metric.higherIsBetter && diff < 0;

              let barColor: string;
              if (diff > 0 && metric.higherIsBetter) {
                barColor = palette.success;
              } else if (diff < 0 && !metric.higherIsBetter) {
                barColor = palette.success;
              } else if (diff < 0 && metric.higherIsBetter) {
                barColor = palette.danger;
              } else if (diff > 0 && !metric.higherIsBetter) {
                barColor = palette.danger;
              } else {
                barColor = palette.accent;
              }

              let relativeColor: string;
              if (isGood) {
                relativeColor = palette.success;
              } else if (!isGood && diff !== 0) {
                relativeColor = palette.danger;
              } else {
                relativeColor = palette.textInverse;
              }

              const range = metric.teamMax - metric.teamMin;
              const isFlat = range <= 0;
              const rawPct = isFlat ? 0.5 : clamp01((metric.raw - metric.teamMin) / range);
              const avgPct = isFlat ? 0.5 : clamp01((metric.teamAvg - metric.teamMin) / range);

              const relativeLabel =
                mode === 'avg'
                  ? (() => {
                      const sign = diff > 0 ? '+' : '';
                      if (isPercentageMetric(metric)) {
                        return `${sign}${diff}pp`;
                      }
                      if (metric.key === 'minutesPlayed') {
                        return `${sign}${diff.toFixed(1)} min`;
                      }
                      return `${sign}${diff.toFixed(1)}`;
                    })()
                  : `${metric.formatValue(metric.raw)} / ${metric.formatValue(metric.teamMax)}`;

              const contextLabel =
                mode === 'avg'
                  ? `Team avg: ${formatTeamAverage(metric)}`
                  : `Team best: ${metric.formatValue(metric.teamMax)}`;

              return (
                <View key={metric.key} style={[styles.row, { borderColor: palette.overlay05 }]}>
                  <View style={styles.rowTop}>
                    <ThemedText style={[styles.metricLabel, { color: palette.textInverse }]}>
                      {metric.label}
                    </ThemedText>
                    <ThemedText style={[styles.relativeText, { color: relativeColor }]}>
                      {relativeLabel}
                    </ThemedText>
                  </View>

                  <View style={[styles.barTrack, { backgroundColor: palette.overlay10 }]}>
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
                    {mode === 'avg' && (
                      <View
                        style={[
                          styles.marker,
                          {
                            left: `${avgPct * 100}%`,
                            backgroundColor: palette.textInverse,
                            marginLeft: avgPct > 0.5 ? -scaleBySizeClass(2, sizeClass) : 0,
                          },
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.rowMeta}>
                    <ThemedText style={[styles.contextText, { color: palette.textMuted }]}>
                      {`${subjectLabel}: ${metric.formatValue(metric.raw)}`}
                    </ThemedText>
                    <ThemedText style={[styles.contextText, { color: palette.textMuted }]}>
                      {contextLabel}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    title: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    headerControlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: scaleBySizeClass(12, sizeClass),
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
      fontFamily: Fonts.bold,
    },
    legendSlot: {
      minHeight: scaleBySizeClass(24, sizeClass),
      justifyContent: 'center',
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
      fontFamily: Fonts.semiBold,
    },
    group: {
      gap: 8,
    },
    groupTitle: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
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
      fontFamily: Fonts.bold,
    },
    relativeText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.extraBold,
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
    rowMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    contextText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
