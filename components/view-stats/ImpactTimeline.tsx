import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { ImpactPoint } from '@/lib/statsUtils';
import { Circle, matchFont, Text as SkiaText } from '@shopify/react-native-skia';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

const FONT_FAMILY = Platform.select({
  ios: 'Helvetica',
  android: 'sans-serif',
  default: 'sans-serif',
});

/** Maps an event description to a single letter abbreviation. */
function eventAbbrev(description: string | undefined): string | null {
  if (!description) return null;
  const d = description.toLowerCase();
  if (d.startsWith('callahan')) return 'C';
  if (d.startsWith('goal')) return 'G';
  if (d.startsWith('assist')) return 'A';
  if (d.startsWith('block')) return 'B';
  if (d.startsWith('drop') || d.startsWith('50/50 drop')) return 'D';
  if (d.startsWith('throwaway') || d.startsWith('50/50 throw')) return 'T';
  return null;
}

function isPositiveImpactEvent(description: string | undefined): boolean {
  if (!description) return false;
  const d = description.toLowerCase();
  return (
    d.startsWith('callahan') ||
    d.startsWith('goal') ||
    d.startsWith('assist') ||
    d.startsWith('block')
  );
}

interface ImpactTimelineProps {
  data: ImpactPoint[];
}

export default function ImpactTimeline({ data }: ImpactTimelineProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const chartHeight = scaleBySizeClass(150, sizeClass);
  const pxPerEvent = scaleBySizeClass(55, sizeClass);
  const yAxisWidth = scaleBySizeClass(30, sizeClass);
  const labelWidth = scaleBySizeClass(52, sizeClass);
  const dotRadius = scaleBySizeClass(5, sizeClass);
  const strokeWidth = scaleBySizeClass(3, sizeClass);
  const labelFontSize = scaleBySizeClass(11, sizeClass);
  const labelAboveOffset = scaleBySizeClass(14, sizeClass);
  const labelBelowOffset = scaleBySizeClass(16, sizeClass);
  const labelFont = matchFont({
    fontFamily: FONT_FAMILY,
    fontSize: labelFontSize,
    fontWeight: '700',
  });
  const domainPadLeft = scaleBySizeClass(10, sizeClass);
  const domainPadRight = scaleBySizeClass(36, sizeClass);
  const domainPadTop = scaleBySizeClass(32, sizeClass);
  const domainPadBottom = scaleBySizeClass(20, sizeClass);
  const styles = createStyles(sizeClass, chartHeight, yAxisWidth, labelWidth);
  const hasImpact = data.some((d) => d.cumulativePlusMinus !== 0);

  // Format data for chart — exclude the trailing End marker so the chart
  // stops at the last real event rather than showing a flat tail.
  const chartData = data
    .filter((d) => d.description !== 'End')
    .map((d) => ({
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

  // Scrollbar tracking state (must be declared before chartScrollWidth uses viewportWidth)
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  // Width of the scrollable chart area: at least PX_PER_EVENT per event so
  // all points have breathing room on large games.  Fills the viewport
  // when content is short (e.g. few events on a tablet).
  const eventCount = chartData.length - 1; // exclude Start
  const minChartWidth = eventCount * pxPerEvent;
  const chartScrollWidth = Math.max(viewportWidth || 300, minChartWidth);
  const needsScroll = viewportWidth > 0 && minChartWidth > viewportWidth;

  // Custom scrollbar derived values
  const maxScroll = Math.max(0, contentWidth - viewportWidth);
  const visibleRatio = contentWidth > 0 ? Math.min(1, viewportWidth / contentWidth) : 1;
  const indicatorThumbWidth = Math.max(26, Math.round(viewportWidth * visibleRatio));
  const indicatorTravel = viewportWidth - indicatorThumbWidth;
  const indicatorLeft = maxScroll > 0 ? (scrollX / maxScroll) * indicatorTravel : 0;
  if (!hasImpact && data.length <= 2) {
    return (
      <View style={[styles.container, { height: 200, justifyContent: 'center' }]}>
        <Text style={{ color: palette.textMuted, textAlign: 'center' }}>
          No impact recorded yet.
        </Text>
      </View>
    );
  }
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
        {/* Y-Axis Labels — fixed, does not scroll */}
        <View style={styles.yAxis}>
          <Text style={[styles.axisLabel, { color: palette.success }]}>+{yPadding}</Text>
          <Text style={[styles.axisLabel, { color: palette.textMuted }]}>0</Text>
          <Text style={[styles.axisLabel, { color: palette.danger }]}>-{yPadding}</Text>
        </View>

        {/* Scrollable chart + x-axis labels */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
          onContentSizeChange={(w) => setContentWidth(w)}
          onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
          style={styles.chartScroll}>
          <View style={{ width: chartScrollWidth }}>
            {/* Chart */}
            <View style={{ height: chartHeight }}>
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
                domainPadding={{
                  top: domainPadTop,
                  bottom: domainPadBottom,
                  left: domainPadLeft,
                  right: domainPadRight,
                }}>
                {({ points }) => {
                  type Pt = (typeof points.y)[number];

                  // Split into color segments based on sign of cumulative +/-,
                  // sharing the boundary point between adjacent segments so the
                  // line stays connected through zero crossings.
                  const segments: { pts: Pt[]; color: string }[] = [];

                  for (let i = 0; i < points.y.length; i++) {
                    const dataY = chartData[i]?.y ?? 0;
                    let color: string;
                    if (dataY > 0) {
                      color = palette.success;
                    } else if (dataY < 0) {
                      color = palette.danger;
                    } else {
                      // y === 0: inherit the previous segment's color so crossings
                      // read as continuations of the prior trend, not a third state.
                      // Falls back to accent only for the opening Start point.
                      color = segments[segments.length - 1]?.color ?? palette.accent;
                    }

                    const last = segments[segments.length - 1];
                    if (!last || last.color !== color) {
                      // New segment — share the previous point so segments connect
                      const newPts: Pt[] = last ? [points.y[i - 1], points.y[i]] : [points.y[i]];
                      segments.push({ pts: newPts, color });
                    } else {
                      last.pts.push(points.y[i]);
                    }
                  }

                  return (
                    <>
                      {segments.map((seg, i) => (
                        <Line
                          key={i}
                          points={seg.pts}
                          color={seg.color}
                          strokeWidth={strokeWidth}
                          curveType="linear"
                        />
                      ))}
                      {/* Dots + letter labels at each data point */}
                      {points.y.map((point, i) => {
                        // Skip the Start marker (index 0) — End is no longer in chartData
                        if (i === 0) return null;
                        if (point.x == null || point.y == null) return null;
                        const isPositive = isPositiveImpactEvent(chartData[i]?.description);
                        const dotColor = isPositive ? palette.success : palette.danger;
                        const abbrev = eventAbbrev(chartData[i]?.description);
                        // Place label above dot for positive events, below for negative
                        const labelY = isPositive
                          ? point.y - labelAboveOffset
                          : point.y + labelBelowOffset;
                        const labelX = point.x - labelFontSize * 0.35;
                        return (
                          <React.Fragment key={i}>
                            <Circle cx={point.x} cy={point.y} r={dotRadius} color={dotColor} />
                            {abbrev && labelFont && (
                              <SkiaText
                                x={labelX}
                                y={labelY}
                                text={abbrev}
                                font={labelFont}
                                color={dotColor}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </>
                  );
                }}
              </CartesianChart>
            </View>

            {/* X-Axis Score Labels — scrolls with the chart */}
            {(() => {
              // Unique scores keyed by score string (skip Start/End)
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

              const minIdx = chartData[0]?.x ?? 0;
              const maxIdx = chartData[chartData.length - 1]?.x ?? 1;
              const range = maxIdx - minIdx || 1;
              const drawableWidth = chartScrollWidth - domainPadLeft - domainPadRight;

              const LABEL_GAP = 4; // minimum gap between adjacent labels
              let lastLabelRight = -Infinity;

              return (
                <View style={styles.scoreLabelsPositioned}>
                  {scorePositions.map((item, i) => {
                    // Pixel position matching the chart's x-axis layout
                    const px =
                      domainPadLeft +
                      ((item.eventIndex - minIdx) / range) * drawableWidth -
                      labelWidth / 2; // center label on event
                    // Skip if this label overlaps the previous rendered one
                    if (px < lastLabelRight + LABEL_GAP) return null;
                    lastLabelRight = px + labelWidth;
                    return (
                      <View key={i} style={[styles.scoreLabelWrapper, { left: px }]}>
                        <Text
                          numberOfLines={1}
                          style={[styles.scoreText, { color: palette.textMuted }]}>
                          {item.score}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })()}
          </View>
        </ScrollView>
      </View>

      {/* Custom scrollbar indicator */}
      {needsScroll && (
        <View style={[styles.indicatorWrap, { paddingLeft: yAxisWidth }]}>
          <View
            style={[
              styles.indicatorTrack,
              { backgroundColor: palette.overlay20, width: viewportWidth },
            ]}>
            <View
              style={[styles.indicatorThumb, { left: indicatorLeft, width: indicatorThumbWidth }]}>
              <View style={[styles.thumbPoint, { backgroundColor: palette.accent }]} />
              <View style={[styles.thumbCore, { backgroundColor: palette.accent }]} />
              <View style={[styles.thumbPoint, { backgroundColor: palette.accent }]} />
            </View>
          </View>
        </View>
      )}

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
          <Text style={[styles.legendText, { color: palette.textMuted }]}>Drops/Throwaways</Text>
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
                    {
                      color: isPositiveImpactEvent(event.description)
                        ? palette.success
                        : palette.danger,
                    },
                  ]}>
                  {event.description ?? ''}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function createStyles(
  sizeClass: SizeClass,
  chartHeight: number,
  yAxisWidth: number,
  labelWidth: number,
) {
  return StyleSheet.create({
    container: {
      padding: scaleBySizeClass(16, sizeClass),
      alignItems: 'center',
    },
    title: {
      fontSize: scaleBySizeClass(12, sizeClass),
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
      fontSize: scaleBySizeClass(32, sizeClass),
      fontWeight: '800',
    },
    valueLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
      marginTop: 2,
    },
    chartContainer: {
      flexDirection: 'row',
      width: '100%',
      alignItems: 'flex-start',
    },
    yAxis: {
      width: yAxisWidth,
      height: chartHeight,
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingRight: scaleBySizeClass(4, sizeClass),
    },
    chartScroll: {
      flex: 1,
    },
    axisLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
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
      width: scaleBySizeClass(8, sizeClass),
      height: scaleBySizeClass(8, sizeClass),
      borderRadius: scaleBySizeClass(4, sizeClass),
    },
    legendText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '500',
    },
    scoreLabelsPositioned: {
      height: scaleBySizeClass(20, sizeClass),
      marginTop: scaleBySizeClass(4, sizeClass),
    },
    scoreText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '700',
    },
    scoreLabelWrapper: {
      position: 'absolute',
      alignItems: 'center',
      width: labelWidth,
    },
    eventLog: {
      width: '100%',
      marginTop: 12,
    },
    eventLogTitle: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    eventScroll: {
      flexGrow: 0,
    },
    eventItem: {
      paddingHorizontal: scaleBySizeClass(10, sizeClass),
      paddingVertical: scaleBySizeClass(6, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
      marginRight: scaleBySizeClass(8, sizeClass),
      alignItems: 'center',
      minWidth: scaleBySizeClass(60, sizeClass),
    },
    eventScore: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '600',
    },
    eventDesc: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '700',
    },
    indicatorWrap: {
      alignItems: 'flex-start',
      width: '100%',
      marginTop: scaleBySizeClass(6, sizeClass),
    },
    indicatorTrack: {
      height: scaleBySizeClass(2, sizeClass),
      borderRadius: 999,
      overflow: 'hidden',
    },
    indicatorThumb: {
      position: 'absolute',
      top: scaleBySizeClass(-2, sizeClass),
      height: scaleBySizeClass(6, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
    },
    thumbCore: {
      flex: 1,
      height: scaleBySizeClass(2, sizeClass),
      borderRadius: 999,
      marginHorizontal: scaleBySizeClass(-1, sizeClass),
    },
    thumbPoint: {
      width: scaleBySizeClass(6, sizeClass),
      height: scaleBySizeClass(6, sizeClass),
      transform: [{ rotate: '45deg' }],
      borderRadius: scaleBySizeClass(1, sizeClass),
    },
  });
}
