import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { AdvancedImpactPoint } from '@/lib/advancedTracking/advancedImpactUtils';
import { Fonts } from '@/theme/theme';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, {
  Circle as SvgCircle,
  Line as SvgLine,
  Path as SvgPath,
  Text as SvgText,
} from 'react-native-svg';

const LABEL_GAP = 4;

type ScaleMode = 'event' | 'game';

interface AdvancedImpactTimelineProps {
  data: AdvancedImpactPoint[];
}

interface ChartPoint {
  x: number;
  y: number;
  yValue: number;
  description: string;
  score: string;
  onField: boolean;
  plusMinusDelta: number;
}

interface LineSegment {
  color: string;
  points: ChartPoint[];
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

const PART_TO_FULL: Record<string, string> = {
  GA: 'Goal + Assist',
  G: 'Goal',
  A: 'Assist',
  HA: 'Hockey Assist',
  C: 'Callahan',
  B: 'Block',
  Stl: 'Stall',
  StlC: 'Stall Conceded',
  T: 'Throwaway',
  D: 'Drop',
};

const PART_TO_ABBREV: Record<string, string> = {
  GA: 'GA',
  G: 'G',
  A: 'A',
  HA: 'HA',
  C: 'C',
  B: 'B',
  Stl: 'Stl',
  StlC: 'StlC',
  T: 'T',
  D: 'D',
};

function parsePart(part: string): { count: number; code: string } {
  const match = part.trim().match(/^(\d*)(.+)$/);
  if (!match) return { count: 1, code: part };
  return { count: match[1] ? parseInt(match[1], 10) : 1, code: match[2] };
}

function formatFullDescription(description: string): string {
  if (!description) return '';
  return description
    .split(',')
    .map((p) => {
      const { count, code } = parsePart(p);
      const base = PART_TO_FULL[code] ?? code;
      return count > 1 ? `${count} ${base}s` : base;
    })
    .join(', ');
}

function eventAbbrev(description: string): string | null {
  if (!description) return null;
  const { code } = parsePart(description.split(',')[0]);
  return (PART_TO_ABBREV[code] ?? code) || null;
}

function isPositiveImpactEvent(plusMinusDelta: number): boolean {
  return plusMinusDelta > 0;
}

function getImpactEventColor(
  plusMinusDelta: number,
  palette: ReturnType<typeof useTheme>['palette'],
): string {
  if (plusMinusDelta > 0) return palette.success;
  if (plusMinusDelta < 0) return palette.danger;
  return palette.accent;
}

function buildStepPath(points: ChartPoint[]): string {
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
  points: ChartPoint[],
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

function getAxisLabelTop(centerY: number, chartHeight: number, labelHeight: number): number {
  const desiredTop = centerY - labelHeight / 2;
  return Math.max(0, Math.min(chartHeight - labelHeight, desiredTop));
}

function formatImpactValue(value: number): string {
  const abs = Math.abs(value);
  return Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
}

function formatImpactAxisLabel(value: number): string {
  if (value === 0) return '0';
  return value > 0 ? `+${formatImpactValue(value)}` : `-${formatImpactValue(value)}`;
}

export default function AdvancedImpactTimeline({ data }: AdvancedImpactTimelineProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

  const [scaleMode, setScaleMode] = useState<ScaleMode>('event');

  const chartHeight = scaleBySizeClass(150, sizeClass);
  const pxPerEvent = scaleBySizeClass(55, sizeClass);
  const yAxisWidth = scaleBySizeClass(34, sizeClass);
  const labelWidth = scaleBySizeClass(52, sizeClass);
  const dotRadius = scaleBySizeClass(5, sizeClass);
  const strokeWidth = scaleBySizeClass(3, sizeClass);
  const axisLabelHeight = scaleBySizeClass(16, sizeClass);
  const labelFontSize = scaleBySizeClass(11, sizeClass);
  const labelAboveOffset = scaleBySizeClass(14, sizeClass);
  const labelBelowOffset = scaleBySizeClass(16, sizeClass);
  const domainPadLeft = scaleBySizeClass(10, sizeClass);
  const domainPadRight = scaleBySizeClass(36, sizeClass);
  const domainPadTop = scaleBySizeClass(32, sizeClass);
  const domainPadBottom = scaleBySizeClass(20, sizeClass);
  const toggleFontSize = scaleBySizeClass(10, sizeClass);
  const togglePaddingH = scaleBySizeClass(8, sizeClass);
  const togglePaddingV = scaleBySizeClass(3, sizeClass);
  const toggleRadius = scaleBySizeClass(6, sizeClass);
  const styles = createStyles(sizeClass, chartHeight, yAxisWidth, labelWidth, axisLabelHeight);

  const hasImpact = data.some((d) => d.cumulativePlusMinus !== 0);

  // Build chart data
  const startPoint: ChartPoint = {
    x: 0,
    y: 0,
    yValue: 0,
    description: 'Start',
    score: data[0]?.score ?? '0-0',
    onField: false,
    plusMinusDelta: 0,
  };

  const dataPoints: ChartPoint[] = data.map((d, index) => ({
    x: scaleMode === 'game' ? d.pointIndex : index + 1,
    y: d.cumulativePlusMinus,
    yValue: d.cumulativePlusMinus,
    description: d.description,
    score: d.score,
    onField: d.onField,
    plusMinusDelta: d.plusMinusDelta,
  }));

  const chartData = [startPoint, ...dataPoints];

  // Event log — only on-field events with descriptions
  const eventLog = data.filter((d) => d.onField && d.description.length > 0);

  // Calculate min/max/final
  const allY = chartData.map((d) => d.y);
  const axisMin = Math.floor(Math.min(...allY, 0));
  const axisMax = Math.ceil(Math.max(...allY, 0));
  const finalValue = chartData[chartData.length - 1]?.y ?? 0;
  let finalColor: string;
  if (finalValue > 0) {
    finalColor = palette.success;
  } else if (finalValue < 0) {
    finalColor = palette.danger;
  } else {
    finalColor = palette.textMuted;
  }

  // Scrollbar tracking
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  // Chart width
  const playerEventCount = chartData.length - 1;
  const playerMinWidth = playerEventCount * pxPerEvent;
  const gameEndIdx = data[data.length - 1]?.pointIndex ?? 1;
  const playerSpan = (chartData[chartData.length - 1]?.x ?? 1) - (chartData[0]?.x ?? 0);
  const spanRatio = gameEndIdx > 0 ? Math.max(playerSpan / gameEndIdx, 0.15) : 1;
  const minChartWidth =
    scaleMode === 'game' ? Math.max(playerMinWidth, playerMinWidth / spanRatio) : playerMinWidth;
  const chartScrollWidth = Math.max(viewportWidth || 300, minChartWidth);
  const needsScroll = viewportWidth > 0 && minChartWidth > viewportWidth;

  const maxScroll = Math.max(0, contentWidth - viewportWidth);
  const visibleRatio = contentWidth > 0 ? Math.min(1, viewportWidth / contentWidth) : 1;
  const indicatorThumbWidth = Math.max(26, Math.round(viewportWidth * visibleRatio));
  const indicatorTravel = viewportWidth - indicatorThumbWidth;
  const indicatorLeft = maxScroll > 0 ? (scrollX / maxScroll) * indicatorTravel : 0;

  const plotTop = domainPadTop;
  const plotBottom = chartHeight - domainPadBottom;
  const plotLeft = domainPadLeft;
  const plotRight = chartScrollWidth - domainPadRight;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;

  const minIdx = chartData[0]?.x ?? 0;
  const maxIdx =
    scaleMode === 'game'
      ? (data[data.length - 1]?.pointIndex ?? chartData[chartData.length - 1]?.x ?? 1)
      : (chartData[chartData.length - 1]?.x ?? 1);
  const xRange = maxIdx - minIdx || 1;
  const yRange = Math.max(axisMax - axisMin, 1);

  const getX = (value: number) => plotLeft + ((value - minIdx) / xRange) * plotWidth;
  const getY = (value: number) => plotBottom - clamp01((value - axisMin) / yRange) * plotHeight;

  // Rendered points for SVG
  const renderedPoints: ChartPoint[] = chartData.map((pt) => ({
    x: getX(pt.x),
    y: getY(pt.y),
    yValue: pt.yValue,
    description: pt.description,
    score: pt.score,
    onField: pt.onField,
    plusMinusDelta: pt.plusMinusDelta,
  }));

  const lineSegments = buildLineSegments(renderedPoints, palette);
  const visibleEventPoints = renderedPoints.slice(1);

  // Y-axis ticks
  const tickValues: number[] = [];
  for (let v = axisMin; v <= axisMax; v++) tickValues.push(v);

  // Score label positions — show each unique score once
  const scorePositions: { score: string; dataIndex: number; x: number }[] = [];
  chartData.forEach((pt, idx) => {
    if (
      pt.score &&
      pt.description !== 'Start' &&
      !scorePositions.some((sp) => sp.score === pt.score)
    ) {
      scorePositions.push({ score: pt.score, dataIndex: idx, x: getX(pt.x) });
    }
  });

  // Add an ending tick: game mode uses the final game point, event mode uses the player's last point.
  const endScore =
    scaleMode === 'game'
      ? (data[data.length - 1]?.score ?? '')
      : (chartData[chartData.length - 1]?.score ?? '');
  const endIdx =
    scaleMode === 'game'
      ? (data[data.length - 1]?.pointIndex ?? 0)
      : (chartData[chartData.length - 1]?.x ?? 0);
  const endX = getX(endIdx);
  if (endScore) {
    const dupIdx = scorePositions.findIndex((sp) => sp.score === endScore);
    if (dupIdx !== -1) scorePositions.splice(dupIdx, 1);
    scorePositions.push({ score: endScore, dataIndex: chartData.length - 1, x: endX });
  }

  // Fit score labels without overlapping
  const lastScorePos = scorePositions[scorePositions.length - 1];
  const visibleScorePositions: { score: string; dataIndex: number; x: number }[] = [];
  const reservedLeft = lastScorePos ? lastScorePos.x - labelWidth / 2 : Infinity;
  let lastLabelRight = -Infinity;
  scorePositions.forEach((item, i) => {
    if (i === scorePositions.length - 1) return;
    const left = item.x - labelWidth / 2;
    if (left < lastLabelRight + LABEL_GAP) return;
    if (left + labelWidth + LABEL_GAP > reservedLeft) return;
    lastLabelRight = left + labelWidth;
    visibleScorePositions.push(item);
  });
  if (lastScorePos) visibleScorePositions.push(lastScorePos);

  // Y-axis label candidates
  const axisLabelCandidates = [
    {
      key: 'max',
      value: axisMax,
      color: axisMax > 0 ? palette.success : palette.textMuted,
      label: formatImpactAxisLabel(axisMax),
      top: getAxisLabelTop(getY(axisMax), chartHeight, axisLabelHeight),
    },
    {
      key: 'neutral',
      value: 0,
      color: palette.textMuted,
      label: '0',
      top: getAxisLabelTop(getY(0), chartHeight, axisLabelHeight),
    },
    {
      key: 'min',
      value: axisMin,
      color: axisMin < 0 ? palette.danger : palette.textMuted,
      label: formatImpactAxisLabel(axisMin),
      top: getAxisLabelTop(getY(axisMin), chartHeight, axisLabelHeight),
    },
  ];
  const axisLabels = axisLabelCandidates.filter(
    (a, idx, arr) => arr.findIndex((b) => b.value === a.value) === idx,
  );

  if (!hasImpact && data.length <= 2) {
    return (
      <View style={[styles.container, { height: 200, justifyContent: 'center' }]}>
        <ThemedText style={{ color: palette.textMuted, textAlign: 'center' }}>
          No impact recorded yet.
        </ThemedText>
      </View>
    );
  }

  if (data.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <ThemedText style={[styles.title, { color: palette.textMuted }]}>GAME IMPACT</ThemedText>
        <View style={[styles.scaleToggle, { backgroundColor: palette.overlay08 }]}>
          {(['event', 'game'] as const).map((mode) => {
            const isActive = scaleMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setScaleMode(mode)}
                style={[
                  {
                    paddingHorizontal: togglePaddingH,
                    paddingVertical: togglePaddingV,
                    borderRadius: toggleRadius,
                  },
                  isActive && { backgroundColor: palette.overlay20 },
                ]}>
                <ThemedText
                  style={{
                    fontSize: toggleFontSize,
                    fontFamily: Fonts.semiBold,
                    color: isActive ? palette.textPrimary : palette.textMuted,
                  }}>
                  {mode === 'event' ? 'Event' : 'Game'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.valueDisplay}>
        <ThemedText style={[styles.currentValue, { color: finalColor }]}>
          {finalValue > 0 ? '+' : ''}
          {finalValue}
        </ThemedText>
        <ThemedText style={[styles.valueLabel, { color: palette.textMuted }]}>
          Current +/-
        </ThemedText>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.yAxis}>
          {axisLabels.map((al) => (
            <View key={al.key} style={[styles.axisLabelSlot, { top: al.top }]}>
              <ThemedText style={[styles.axisLabel, { color: al.color }]}>{al.label}</ThemedText>
            </View>
          ))}
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

                {visibleScorePositions.map((item) => (
                  <SvgLine
                    key={`v-${item.score}-${item.dataIndex}`}
                    x1={item.x}
                    y1={plotTop}
                    x2={item.x}
                    y2={plotBottom}
                    stroke={palette.overlay10}
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

                {visibleEventPoints.map((pt, i) => {
                  // On-field with description → colored dot + label
                  if (!pt.onField || !pt.description) return null;
                  const isPositive = isPositiveImpactEvent(pt.plusMinusDelta);
                  const dotColor = getImpactEventColor(pt.plusMinusDelta, palette);
                  const abbrev = eventAbbrev(pt.description);
                  const labelY = isPositive ? pt.y - labelAboveOffset : pt.y + labelBelowOffset;
                  return (
                    <React.Fragment key={`dot-${i}`}>
                      <SvgCircle cx={pt.x} cy={pt.y} r={dotRadius} fill={dotColor} />
                      {abbrev ? (
                        <SvgText
                          x={pt.x}
                          y={labelY}
                          fill={dotColor}
                          fontSize={labelFontSize}
                          fontFamily={Fonts.bold}
                          textAnchor="middle">
                          {abbrev}
                        </SvgText>
                      ) : null}
                    </React.Fragment>
                  );
                })}

                {visibleEventPoints.map((pt, i) => {
                  // Off-field or no-description → small gray dot
                  if (pt.onField && pt.description) return null;
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
              {visibleScorePositions.map((item) => (
                <View
                  key={`${item.score}-${item.dataIndex}`}
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
              return (
                <View key={i} style={[styles.eventItem, { backgroundColor: palette.overlay05 }]}>
                  <ThemedText style={[styles.eventScore, { color: palette.textMuted }]}>
                    {pt.score}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.eventDesc,
                      { color: getImpactEventColor(pt.plusMinusDelta, palette) },
                    ]}>
                    {formatFullDescription(pt.description ?? '')}
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
      gap: scaleBySizeClass(10, sizeClass),
      marginBottom: 8,
    },
    title: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    scaleToggle: {
      flexDirection: 'row',
      borderRadius: scaleBySizeClass(8, sizeClass),
      padding: scaleBySizeClass(2, sizeClass),
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
      fontSize: scaleBySizeClass(11, sizeClass),
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
