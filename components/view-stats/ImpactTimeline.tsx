import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
import { ImpactPoint } from '@/lib/statsUtils';
import { Circle } from '@shopify/react-native-skia';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

interface ImpactTimelineProps {
  data: ImpactPoint[];
}

export default function ImpactTimeline({ data }: ImpactTimelineProps) {
  const { palette } = useTheme();
  const { isLandscape } = useLayout();
  const hasImpact = data.some((d) => d.cumulativePlusMinus !== 0);

  if (!hasImpact && data.length <= 2) {
    return (
      <View style={[styles.container, { height: 200, justifyContent: 'center' }]}>
        <Text style={{ color: palette.textMuted, textAlign: 'center' }}>
          No impact recorded yet.
        </Text>
      </View>
    );
  }

  // Format data for chart - include description and score for tooltips
  const chartData = data.map((d, i) => ({
    x: d.eventIndex,
    y: d.cumulativePlusMinus,
    description: d.description ?? '',
    score: d.score,
  }));

  // Filter out Start/End events for the event log
  const eventLog = data.filter(
    (d) => d.description && d.description !== 'Start' && d.description !== 'End',
  );

  // Calculate min/max for display
  const minY = Math.min(...chartData.map((d) => d.y));
  const maxY = Math.max(...chartData.map((d) => d.y));
  const finalValue = chartData[chartData.length - 1]?.y ?? 0;

  // Calculate Y-axis domain (symmetric around 0, or at least include 0)
  const yMin = Math.min(minY, 0);
  const yMax = Math.max(maxY, 0);
  // Ensure some padding
  const yPadding = Math.max(Math.abs(yMin), Math.abs(yMax), 1);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: palette.textMuted }]}>GAME IMPACT</Text>

      {/* Current Value Display */}
      <View style={styles.valueDisplay}>
        <Text
          style={[
            styles.currentValue,
            {
              color:
                finalValue > 0
                  ? palette.success
                  : finalValue < 0
                    ? palette.danger
                    : palette.textMuted,
            },
          ]}>
          {finalValue > 0 ? '+' : ''}
          {finalValue}
        </Text>
        <Text style={[styles.valueLabel, { color: palette.textMuted }]}>Current +/-</Text>
      </View>

      {/* Chart with Y-axis labels */}
      <View style={styles.chartContainer}>
        {/* Y-Axis Labels */}
        <View style={styles.yAxis}>
          <Text style={[styles.axisLabel, { color: palette.success }]}>+{yPadding}</Text>
          <Text style={[styles.axisLabel, { color: palette.textMuted }]}>0</Text>
          <Text style={[styles.axisLabel, { color: palette.danger }]}>-{yPadding}</Text>
        </View>

        {/* Chart */}
        <View style={{ flex: 1, height: 150 }}>
          <CartesianChart
            data={chartData}
            xKey="x"
            yKeys={['y']}
            domain={{ y: [-yPadding, yPadding] }}
            axisOptions={{
              font: null,
              lineColor: palette.overlay10,
              labelColor: 'transparent',
            }}
            domainPadding={{ top: 20, bottom: 20, left: 10, right: 10 }}>
            {({ points }) => {
              // Color line based on final value: green (+), red (-), blue (0)
              const lineColor =
                finalValue > 0 ? palette.success : finalValue < 0 ? palette.danger : palette.accent;
              return (
                <>
                  <Line points={points.y} color={lineColor} strokeWidth={3} curveType="linear" />
                  {/* Dots at each data point */}
                  {points.y.map((point, i) => {
                    // Skip Start and End points for cleaner look
                    if (i === 0 || i === points.y.length - 1) return null;
                    if (point.x == null || point.y == null) return null;
                    const dotColor = chartData[i]?.description?.includes('+')
                      ? palette.success
                      : palette.danger;
                    return <Circle key={i} cx={point.x} cy={point.y} r={5} color={dotColor} />;
                  })}
                </>
              );
            }}
          </CartesianChart>
        </View>
      </View>

      {/* X-Axis Score Labels */}
      <View style={styles.xAxisLabel}>
        {(() => {
          // Get unique scores with their eventIndex positions (skip Start/End markers)
          const scorePositions: { score: string; eventIndex: number }[] = [];
          data.forEach((d) => {
            if (
              d.score &&
              d.description !== 'Start' &&
              d.description !== 'End' &&
              !scorePositions.some((s) => s.score === d.score)
            ) {
              scorePositions.push({ score: d.score, eventIndex: d.eventIndex });
            }
          });

          const minIdx = data[0]?.eventIndex ?? 0;
          const maxIdx = data[data.length - 1]?.eventIndex ?? 1;
          const range = maxIdx - minIdx || 1;

          // Calculate percentage positions for all scores
          const scoresWithPct = scorePositions.map((item) => ({
            ...item,
            pct: ((item.eventIndex - minIdx) / range) * 100,
          }));

          // Filter to avoid overlapping labels (minimum 10% gap)
          // Always keep first and last labels
          const MIN_GAP = isLandscape ? 5 : 8;
          const filteredScores: typeof scoresWithPct = [];

          scoresWithPct.forEach((item, i) => {
            const isFirst = i === 0;
            const isLast = i === scoresWithPct.length - 1;
            const lastShown = filteredScores[filteredScores.length - 1];

            if (isFirst) {
              filteredScores.push(item);
            } else if (isLast) {
              // Always show last, but remove previous if too close
              if (lastShown && item.pct - lastShown.pct < MIN_GAP && filteredScores.length > 1) {
                filteredScores.pop();
              }
              filteredScores.push(item);
            } else if (!lastShown || item.pct - lastShown.pct >= MIN_GAP) {
              filteredScores.push(item);
            }
          });

          return (
            <View style={styles.scoreLabelsPositioned}>
              {filteredScores.map((item, i) => (
                <View key={i} style={[styles.scoreLabelWrapper, { left: `${item.pct}%` }]}>
                  <Text style={[styles.scoreText, { color: palette.textMuted }]}>{item.score}</Text>
                </View>
              ))}
            </View>
          );
        })()}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
          <Text style={[styles.legendText, { color: palette.textMuted }]}>
            Goals/Assists/Blocks
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.danger }]} />
          <Text style={[styles.legendText, { color: palette.textMuted }]}>Turnovers</Text>
        </View>
      </View>

      {/* Event Log */}
      {eventLog.length > 0 && (
        <View style={styles.eventLog}>
          <Text style={[styles.eventLogTitle, { color: palette.textMuted }]}>EVENTS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventScroll}>
            {eventLog.map((event, i) => (
              <View key={i} style={[styles.eventItem, { backgroundColor: palette.overlay05 }]}>
                <Text style={[styles.eventScore, { color: palette.textMuted }]}>{event.score}</Text>
                <Text
                  style={[
                    styles.eventDesc,
                    { color: event.description?.includes('+') ? palette.success : palette.danger },
                  ]}>
                  {/* Extract just the event name before the parentheses */}
                  {event.description?.split(' (')[0] ?? ''}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  valueDisplay: {
    alignItems: 'center',
    marginBottom: 12,
  },
  currentValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  valueLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
  },
  yAxis: {
    width: 30,
    height: 150,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  axisLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
  },
  xAxisLabel: {
    width: '100%',
    marginTop: 4,
    paddingLeft: 30, // Match y-axis width
  },
  scoreLabelsPositioned: {
    position: 'relative',
    height: 16,
    marginHorizontal: 10, // Match chart's domainPadding left/right
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scoreLabelWrapper: {
    position: 'absolute',
    alignItems: 'center',
    width: 40,
    marginLeft: -20, // Half of width to center
  },
  eventLog: {
    width: '100%',
    marginTop: 12,
  },
  eventLogTitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  eventScroll: {
    flexGrow: 0,
  },
  eventItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  eventScore: {
    fontSize: 10,
    fontWeight: '600',
  },
  eventDesc: {
    fontSize: 12,
    fontWeight: '700',
  },
});
