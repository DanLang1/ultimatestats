import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { AdvancedImpactPoint } from '@/lib/advancedTracking/advancedImpactUtils';
import { Fonts } from '@/theme/theme';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, {
  Circle as SvgCircle,
  Line as SvgLine,
  Path as SvgPath,
  Text as SvgText,
} from 'react-native-svg';

interface AdvancedImpactTimelineProps {
  data: AdvancedImpactPoint[];
}

interface RenderedPoint {
  x: number;
  y: number;
  yValue: number;
  description: string;
  score: string;
  onField: boolean;
}

interface LineSegment {
  color: string;
  points: RenderedPoint[];
}

function buildStepPath(points: RenderedPoint[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  const commands = [`M ${first.x},${first.y}`];
  for (const pt of rest) {
    commands.push(`H ${pt.x}`);
    commands.push(`V ${pt.y}`);
  }
  return commands.join(' ');
}

function buildLineSegments(
  points: RenderedPoint[],
  palette: ReturnType<typeof useTheme>['palette'],
): LineSegment[] {
  const segments: LineSegment[] = [];
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    let color: string;
    if (pt.yValue > 0) {
      color = palette.success;
    } else if (pt.yValue < 0) {
      color = palette.danger;
    } else {
      color = segments[segments.length - 1]?.color ?? palette.accent;
    }
    const last = segments[segments.length - 1];
    if (!last || last.color !== color) {
      const nextPoints = last ? [points[i - 1], pt] : [pt];
      segments.push({ color, points: nextPoints });
    } else {
      last.points.push(pt);
    }
  }
  return segments.filter((s) => s.points.length > 1);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export default function AdvancedImpactTimeline({ data }: AdvancedImpactTimelineProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

  const chartHeight = scaleBySizeClass(150, sizeClass);
  const pxPerPoint = scaleBySizeClass(44, sizeClass);
  const yAxisWidth = scaleBySizeClass(34, sizeClass);
  const labelWidth = scaleBySizeClass(44, sizeClass);
  const dotRadius = scaleBySizeClass(5, sizeClass);
  const strokeWidth = scaleBySizeClass(3, sizeClass);
  const axisLabelHeight = scaleBySizeClass(16, sizeClass);
  const labelFontSize = scaleBySizeClass(10, sizeClass);
  const labelAboveOffset = scaleBySizeClass(14, sizeClass);
  const labelBelowOffset = scaleBySizeClass(16, sizeClass);
  const padLeft = scaleBySizeClass(8, sizeClass);
  const padRight = scaleBySizeClass(24, sizeClass);
  const padTop = scaleBySizeClass(28, sizeClass);
  const padBottom = scaleBySizeClass(20, sizeClass);
  const styles = createStyles(sizeClass, chartHeight, yAxisWidth, labelWidth, axisLabelHeight);

  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const finalValue = data[data.length - 1]?.cumulativePlusMinus ?? 0;
  let finalColor: string;
  if (finalValue > 0) {
    finalColor = palette.success;
  } else if (finalValue < 0) {
    finalColor = palette.danger;
  } else {
    finalColor = palette.textMuted;
  }

  const allY = data.map((d) => d.cumulativePlusMinus);
  const axisMin = Math.floor(Math.min(...allY, 0));
  const axisMax = Math.ceil(Math.max(...allY, 0));
  const yRange = Math.max(axisMax - axisMin, 1);

  const chartScrollWidth = Math.max(viewportWidth || 300, data.length * pxPerPoint);
  const needsScroll = viewportWidth > 0 && data.length * pxPerPoint > viewportWidth;

  const maxScroll = Math.max(0, contentWidth - viewportWidth);
  const visibleRatio = contentWidth > 0 ? Math.min(1, viewportWidth / contentWidth) : 1;
  const indicatorThumbWidth = Math.max(26, Math.round(viewportWidth * visibleRatio));
  const indicatorTravel = viewportWidth - indicatorThumbWidth;
  const indicatorLeft = maxScroll > 0 ? (scrollX / maxScroll) * indicatorTravel : 0;

  const plotTop = padTop;
  const plotBottom = chartHeight - padBottom;
  const plotLeft = padLeft;
  const plotRight = chartScrollWidth - padRight;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;

  const xStep = plotWidth / Math.max(data.length - 1, 1);
  const getX = (i: number) => plotLeft + i * xStep;
  const getY = (v: number) => plotBottom - clamp01((v - axisMin) / yRange) * plotHeight;

  // Build a leading "Start" point at 0
  const startPoint: RenderedPoint = {
    x: getX(0),
    y: getY(0),
    yValue: 0,
    description: '',
    score: data[0]
      ? `${parseInt(data[0].score.split('-')[0], 10) > 0 ? data[0].score : '0-0'}`
      : '0-0',
    onField: false,
  };

  const renderedPoints: RenderedPoint[] = [
    startPoint,
    ...data.map((pt, i) => ({
      x: getX(i + 1),
      y: getY(pt.cumulativePlusMinus),
      yValue: pt.cumulativePlusMinus,
      description: pt.description,
      score: pt.score,
      onField: pt.onField,
    })),
  ];

  const lineSegments = buildLineSegments(renderedPoints, palette);
  const eventPoints = renderedPoints.slice(1);

  // Score labels — show when score changes
  const scoreLabelPositions: { score: string; x: number }[] = [];
  let lastScore = '';
  for (const pt of renderedPoints) {
    if (pt.score !== lastScore) {
      scoreLabelPositions.push({ score: pt.score, x: pt.x });
      lastScore = pt.score;
    }
  }

  const tickValues: number[] = [];
  for (let v = axisMin; v <= axisMax; v++) tickValues.push(v);

  const axisLabelCandidates = [
    {
      key: 'max',
      value: axisMax,
      color: axisMax > 0 ? palette.success : palette.textMuted,
      label: axisMax > 0 ? `+${axisMax}` : String(axisMax),
    },
    { key: 'neutral', value: 0, color: palette.textMuted, label: '0' },
    {
      key: 'min',
      value: axisMin,
      color: axisMin < 0 ? palette.danger : palette.textMuted,
      label: axisMin < 0 ? `${axisMin}` : String(axisMin),
    },
  ].filter((a, idx, arr) => arr.findIndex((b) => b.value === a.value) === idx);

  const eventLog = data.filter((d) => d.onField && d.description.length > 0);

  if (data.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <ThemedText style={[styles.title, { color: palette.textMuted }]}>GAME IMPACT</ThemedText>
      </View>

      <View style={styles.valueDisplay}>
        <ThemedText style={[styles.currentValue, { color: finalColor }]}>
          {finalValue > 0 ? `+${finalValue}` : String(finalValue)}
        </ThemedText>
        <ThemedText style={[styles.valueLabel, { color: palette.textMuted }]}>Final +/-</ThemedText>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.yAxis}>
          {axisLabelCandidates.map((al) => {
            const top = Math.max(
              0,
              Math.min(chartHeight - axisLabelHeight, getY(al.value) - axisLabelHeight / 2),
            );
            return (
              <View key={al.key} style={[styles.axisLabelSlot, { top }]}>
                <ThemedText style={[styles.axisLabel, { color: al.color }]}>{al.label}</ThemedText>
              </View>
            );
          })}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
          onContentSizeChange={(w) => setContentWidth(w)}
          onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
          style={styles.chartScroll}>
          <View style={{ width: chartScrollWidth }}>
            <View style={{ height: chartHeight }}>
              <Svg width={chartScrollWidth} height={chartHeight}>
                {tickValues.map((v) => (
                  <SvgLine
                    key={`h-${v}`}
                    x1={plotLeft}
                    y1={getY(v)}
                    x2={plotRight}
                    y2={getY(v)}
                    stroke={v === 0 ? palette.overlay20 : palette.overlay10}
                    strokeWidth={1}
                  />
                ))}

                {lineSegments.map((seg, i) => (
                  <SvgPath
                    key={`seg-${i}`}
                    d={buildStepPath(seg.points)}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}

                {eventPoints.map((pt, i) => {
                  if (!pt.onField || !pt.description) return null;
                  const isPositive = pt.yValue >= (renderedPoints[i]?.yValue ?? 0);
                  const dotColor = isPositive ? palette.success : palette.danger;
                  const abbrev = pt.description.split(',')[0].trim();
                  const labelY = isPositive ? pt.y - labelAboveOffset : pt.y + labelBelowOffset;
                  return (
                    <React.Fragment key={`dot-${i}`}>
                      <SvgCircle cx={pt.x} cy={pt.y} r={dotRadius} fill={dotColor} />
                      <SvgText
                        x={pt.x}
                        y={labelY}
                        fill={dotColor}
                        fontSize={labelFontSize}
                        fontFamily={Fonts.bold}
                        textAnchor="middle">
                        {abbrev}
                      </SvgText>
                    </React.Fragment>
                  );
                })}

                {eventPoints.map((pt, i) => {
                  if (pt.onField || pt.description) return null;
                  return (
                    <SvgCircle
                      key={`off-${i}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={dotRadius * 0.6}
                      fill={palette.overlay20}
                    />
                  );
                })}
              </Svg>
            </View>

            <View style={styles.scoreLabelsPositioned}>
              {scoreLabelPositions.map((item, i) => (
                <View
                  key={`${item.score}-${i}`}
                  style={[styles.scoreLabelWrapper, { left: item.x - labelWidth / 2 }]}>
                  <ThemedText
                    numberOfLines={1}
                    style={[styles.scoreText, { color: palette.textMuted }]}>
                    {item.score}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

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

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
          <ThemedText style={[styles.legendText, { color: palette.textMuted }]}>
            Goals/Assists/Blocks
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.danger }]} />
          <ThemedText style={[styles.legendText, { color: palette.textMuted }]}>
            Drops/Throwaways
          </ThemedText>
        </View>
      </View>

      {eventLog.length > 0 && (
        <View style={styles.eventLog}>
          <ThemedText style={[styles.eventLogTitle, { color: palette.textMuted }]}>
            EVENTS
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventScroll}>
            {eventLog.map((pt, i) => {
              let eventColor: string;
              if (pt.plusMinusDelta > 0) {
                eventColor = palette.success;
              } else if (pt.plusMinusDelta < 0) {
                eventColor = palette.danger;
              } else {
                eventColor = palette.textMuted;
              }
              return (
                <View key={i} style={[styles.eventItem, { backgroundColor: palette.overlay05 }]}>
                  <ThemedText style={[styles.eventScore, { color: palette.textMuted }]}>
                    {pt.score}
                  </ThemedText>
                  <ThemedText style={[styles.eventDesc, { color: eventColor }]}>
                    {pt.description}
                  </ThemedText>
                </View>
              );
            })}
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
  axisLabelHeight: number,
) {
  return StyleSheet.create({
    container: {
      padding: scaleBySizeClass(16, sizeClass),
      alignItems: 'center',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    valueDisplay: {
      alignItems: 'center',
      marginBottom: 12,
    },
    currentValue: {
      fontSize: scaleBySizeClass(32, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    valueLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
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
      position: 'relative',
    },
    axisLabelSlot: {
      position: 'absolute',
      right: scaleBySizeClass(4, sizeClass),
      height: axisLabelHeight,
      justifyContent: 'center',
    },
    axisLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      lineHeight: axisLabelHeight,
      textAlign: 'right',
      includeFontPadding: false,
    },
    chartScroll: {
      flex: 1,
    },
    scoreLabelsPositioned: {
      height: scaleBySizeClass(20, sizeClass),
      marginTop: scaleBySizeClass(4, sizeClass),
    },
    scoreLabelWrapper: {
      position: 'absolute',
      alignItems: 'center',
      width: labelWidth,
    },
    scoreText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
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
      fontFamily: Fonts.semiBold,
    },
    eventLog: {
      width: '100%',
      marginTop: 12,
    },
    eventLogTitle: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.bold,
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
      fontFamily: Fonts.semiBold,
    },
    eventDesc: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
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
