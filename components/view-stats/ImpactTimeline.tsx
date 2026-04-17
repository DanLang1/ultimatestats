import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { ImpactPoint } from '@/lib/statsUtils';
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

/** Maps an event description to a single letter abbreviation. */
function eventAbbrev(description: string | undefined): string | null {
  if (!description) return null;
  const d = description.toLowerCase();
  if (d.startsWith('goal + assist')) return 'GA';
  if (d.startsWith('callahan')) return 'C';
  if (d.startsWith('goal')) return 'G';
  if (d.startsWith('assist')) return 'A';
  if (d.startsWith('block')) return 'B';
  if (d.startsWith('50/50 self')) return 'FF';
  if (d.startsWith('drop') || d.startsWith('50/50 drop')) return 'D';
  if (d.startsWith('throwaway') || d.startsWith('50/50 throw')) return 'T';
  return null;
}

function isPositiveImpactEvent(description: string | undefined): boolean {
  if (!description) return false;
  const d = description.toLowerCase();
  if (d.startsWith('drop') || d.startsWith('throwaway') || d.startsWith('50/50')) {
    return false;
  }
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

function normalizeImpactValue(value: number): number {
  return Number(value.toFixed(2));
}

function buildImpactTickValues(axisMin: number, axisMax: number): number[] {
  const tickValues: number[] = [];

  for (let value = axisMin; value <= axisMax; value += 1) {
    tickValues.push(value);
  }

  return tickValues;
}

function formatImpactValue(value: number): string {
  const normalized = normalizeImpactValue(Math.abs(value));
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
}

function formatImpactAxisLabel(value: number): string {
  if (value === 0) return '0';
  const prefix = value > 0 ? '+' : '-';
  return `${prefix}${formatImpactValue(value)}`;
}

interface RenderedImpactPoint {
  description: string;
  score?: string;
  x: number;
  y: number;
  yValue: number;
}

interface ImpactLineSegment {
  color: string;
  points: RenderedImpactPoint[];
}

function getAxisLabelTop(centerY: number, chartHeight: number, labelHeight: number): number {
  const desiredTop = centerY - labelHeight / 2;
  return Math.max(0, Math.min(chartHeight - labelHeight, desiredTop));
}

function buildStepPath(points: RenderedImpactPoint[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  const commands = [`M ${first.x},${first.y}`];
  for (const point of rest) {
    commands.push(`H ${point.x}`);
    commands.push(`V ${point.y}`);
  }
  return commands.join(' ');
}

function buildImpactLineSegments(
  points: RenderedImpactPoint[],
  palette: ReturnType<typeof useTheme>['palette'],
): ImpactLineSegment[] {
  const segments: ImpactLineSegment[] = [];

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    let color: string;

    if (point.yValue > 0) {
      color = palette.success;
    } else if (point.yValue < 0) {
      color = palette.danger;
    } else {
      color = segments[segments.length - 1]?.color ?? palette.accent;
    }

    const lastSegment = segments[segments.length - 1];

    if (!lastSegment || lastSegment.color !== color) {
      const nextPoints = lastSegment ? [points[i - 1], point] : [point];
      segments.push({ color, points: nextPoints });
    } else {
      lastSegment.points.push(point);
    }
  }

  return segments.filter((segment) => segment.points.length > 1);
}

export default function ImpactTimeline({ data }: ImpactTimelineProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
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
  const [scaleMode, setScaleMode] = useState<ScaleMode>('event');

  // Format data for chart — exclude the trailing End marker so the chart
  // stops at the last real event rather than showing a flat tail.
  const chartData = data
    .filter((d) => d.description !== 'End')
    .map((d, index) => ({
      // Event mode: sequential index for even spacing.
      // Game mode: eventIndex for proportional game-timeline positioning.
      x: scaleMode === 'game' ? d.eventIndex : index,
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
  let finalValueColor: string;
  if (finalValue > 0) {
    finalValueColor = palette.success;
  } else if (finalValue < 0) {
    finalValueColor = palette.danger;
  } else {
    finalValueColor = palette.textMuted;
  }

  // Calculate Y-axis domain (symmetric around 0, or at least include 0)
  const axisMin = Math.floor(Math.min(minY, 0));
  const axisMax = Math.ceil(Math.max(maxY, 0));
  const yTickValues = buildImpactTickValues(axisMin, axisMax);

  // Scrollbar tracking state (must be declared before chartScrollWidth uses viewportWidth)
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  // Width of the scrollable chart area: at least PX_PER_EVENT per event so
  // all points have breathing room on large games.  Fills the viewport
  // when content is short (e.g. few events on a tablet).
  const playerEventCount = chartData.length - 1; // exclude Start
  const playerMinWidth = playerEventCount * pxPerEvent;

  // In game mode, widen the chart so the player's event cluster still gets
  // at least pxPerEvent spacing.  Without this, events clustered early in a
  // long game get compressed into a tiny sliver.
  const gameEndIdx = data[data.length - 1]?.eventIndex ?? 1;
  const playerSpan = (chartData[chartData.length - 1]?.x ?? 1) - (chartData[0]?.x ?? 0);
  const spanRatio = gameEndIdx > 0 ? Math.max(playerSpan / gameEndIdx, 0.15) : 1;
  const minChartWidth =
    scaleMode === 'game' ? Math.max(playerMinWidth, playerMinWidth / spanRatio) : playerMinWidth;
  const chartScrollWidth = Math.max(viewportWidth || 300, minChartWidth);
  const needsScroll = viewportWidth > 0 && minChartWidth > viewportWidth;

  // Custom scrollbar derived values
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
  const yRange = Math.max(axisMax - axisMin, 1);
  const minIdx = chartData[0]?.x ?? 0;
  // In game mode, use the End marker's eventIndex so the X-axis spans the full game.
  const maxIdx =
    scaleMode === 'game'
      ? (data[data.length - 1]?.eventIndex ?? chartData[chartData.length - 1]?.x ?? 1)
      : (chartData[chartData.length - 1]?.x ?? 1);
  const xRange = maxIdx - minIdx || 1;

  const getX = (value: number) => plotLeft + ((value - minIdx) / xRange) * plotWidth;
  const getY = (value: number) => plotBottom - ((value - axisMin) / yRange) * plotHeight;

  const renderedChartPoints: RenderedImpactPoint[] = chartData.map((point) => ({
    x: getX(point.x),
    y: getY(point.y),
    yValue: point.y,
    description: point.description,
    score: point.score,
  }));

  const lineSegments = buildImpactLineSegments(renderedChartPoints, palette);
  const visibleEventPoints = renderedChartPoints.filter((_, index) => index !== 0);

  const scorePositions: { score: string; eventIndex: number; x: number }[] = [];
  chartData.forEach((point) => {
    if (
      point.score &&
      point.description !== 'Start' &&
      !scorePositions.some((scorePoint) => scorePoint.score === point.score)
    ) {
      scorePositions.push({
        score: point.score,
        eventIndex: point.x,
        x: getX(point.x),
      });
    }
  });

  // Add an ending tick: game mode shows the final game score, event mode
  // shows the score at the player's last event.
  const endScore =
    scaleMode === 'game' ? data[data.length - 1]?.score : chartData[chartData.length - 1]?.score;
  const endIdx =
    scaleMode === 'game'
      ? (data[data.length - 1]?.eventIndex ?? 0)
      : (chartData[chartData.length - 1]?.x ?? 0);
  if (endScore) {
    // Remove any earlier entry with the same score so the end tick takes
    // priority at the rightmost position.
    const dupIdx = scorePositions.findIndex((sp) => sp.score === endScore);
    if (dupIdx !== -1) scorePositions.splice(dupIdx, 1);
    scorePositions.push({ score: endScore, eventIndex: endIdx, x: getX(endIdx) });
  }

  // Always reserve the last score label, then fill in earlier labels that fit.
  const lastScorePos = scorePositions[scorePositions.length - 1];
  const visibleScorePositions: { score: string; eventIndex: number; x: number }[] = [];
  const reservedLeft = lastScorePos ? lastScorePos.x - labelWidth / 2 : Infinity;
  let lastLabelRight = -Infinity;

  scorePositions.forEach((item, i) => {
    if (i === scorePositions.length - 1) return; // handle last separately
    const left = item.x - labelWidth / 2;
    if (left < lastLabelRight + LABEL_GAP) return;
    if (left + labelWidth + LABEL_GAP > reservedLeft) return;
    lastLabelRight = left + labelWidth;
    visibleScorePositions.push(item);
  });

  if (lastScorePos) {
    visibleScorePositions.push(lastScorePos);
  }

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
    (label, index, labels) =>
      labels.findIndex((candidate) => candidate.value === label.value) === index,
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

      {/* Current Value Display */}
      <View style={styles.valueDisplay}>
        <ThemedText
          style={[
            styles.currentValue,
            {
              color: finalValueColor,
            },
          ]}>
          {finalValue > 0 ? '+' : ''}
          {finalValue}
        </ThemedText>
        <ThemedText style={[styles.valueLabel, { color: palette.textMuted }]}>
          Current +/-
        </ThemedText>
      </View>

      {/* Chart with Y-axis labels */}
      <View style={styles.chartContainer}>
        {/* Y-Axis Labels — fixed, does not scroll */}
        <View style={styles.yAxis}>
          {axisLabels.map((axisLabel) => (
            <View key={axisLabel.key} style={[styles.axisLabelSlot, { top: axisLabel.top }]}>
              <ThemedText style={[styles.axisLabel, { color: axisLabel.color }]}>
                {axisLabel.label}
              </ThemedText>
            </View>
          ))}
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
              <Svg width={chartScrollWidth} height={chartHeight}>
                {yTickValues.map((value) => (
                  <SvgLine
                    key={`h-${value}`}
                    x1={plotLeft}
                    y1={getY(value)}
                    x2={plotRight}
                    y2={getY(value)}
                    stroke={value === 0 ? palette.overlay20 : palette.overlay10}
                    strokeWidth={1}
                  />
                ))}

                {visibleScorePositions.map((item) => (
                  <SvgLine
                    key={`v-${item.score}-${item.eventIndex}`}
                    x1={item.x}
                    y1={plotTop}
                    x2={item.x}
                    y2={plotBottom}
                    stroke={palette.overlay10}
                    strokeWidth={1}
                  />
                ))}

                {lineSegments.map((segment, index) => (
                  <SvgPath
                    key={`segment-${index}`}
                    d={buildStepPath(segment.points)}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}

                {visibleEventPoints.map((point, index) => {
                  const isPositive = isPositiveImpactEvent(point.description);
                  const dotColor = isPositive ? palette.success : palette.danger;
                  const abbrev = eventAbbrev(point.description);
                  const labelY = isPositive
                    ? point.y - labelAboveOffset
                    : point.y + labelBelowOffset;

                  return (
                    <React.Fragment key={`point-${index}-${point.x}`}>
                      <SvgCircle cx={point.x} cy={point.y} r={dotRadius} fill={dotColor} />
                      {abbrev ? (
                        <SvgText
                          x={point.x}
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
              </Svg>
            </View>

            {/* X-Axis Score Labels — scrolls with the chart */}
            <View style={styles.scoreLabelsPositioned}>
              {visibleScorePositions.map((item) => (
                <View
                  key={`${item.score}-${item.eventIndex}`}
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

      {/* Event Log */}
      {eventLog.length > 0 && (
        <View style={styles.eventLog}>
          <ThemedText style={[styles.eventLogTitle, { color: palette.textMuted }]}>
            EVENTS
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventScroll}>
            {eventLog.map((event, i) => (
              <View key={i} style={[styles.eventItem, { backgroundColor: palette.overlay05 }]}>
                <ThemedText style={[styles.eventScore, { color: palette.textMuted }]}>
                  {event.score}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.eventDesc,
                    {
                      color: isPositiveImpactEvent(event.description)
                        ? palette.success
                        : palette.danger,
                    },
                  ]}>
                  {event.description ?? ''}
                </ThemedText>
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
    chartScroll: {
      flex: 1,
    },
    axisLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      lineHeight: axisLabelHeight,
      textAlign: 'right',
      includeFontPadding: false,
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
    scoreLabelsPositioned: {
      height: scaleBySizeClass(20, sizeClass),
      marginTop: scaleBySizeClass(4, sizeClass),
    },
    scoreText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
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
