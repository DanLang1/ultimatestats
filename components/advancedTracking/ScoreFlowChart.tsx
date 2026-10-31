import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Line, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import type { ScoreFlowStep } from '@/lib/advancedTracking/scoreFlowUtils';

const CHART_HEIGHT = 96;
const VERTICAL_PADDING = 14;
/** Keeps a one- or two-point game from stretching each point to half the chart. */
const MIN_MARGIN_SPAN = 3;
const BREAK_DOT_RADIUS = 3.5;

interface ScoreFlowChartProps {
  steps: ScoreFlowStep[];
  /** Scrimmages have no side to credit, so leads and breaks stay neutral. */
  isNeutral: boolean;
  accessibilityLabel: string;
}

/** Step line of the score margin, shaded by who leads, with breaks marked as dots. */
export default function ScoreFlowChart({
  steps,
  isNeutral,
  accessibilityLabel,
}: ScoreFlowChartProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const [width, setWidth] = useState(0);
  const height = scaleBySizeClass(CHART_HEIGHT, sizeClass);

  const leadColor = isNeutral ? palette.textMuted : palette.success;
  const trailColor = isNeutral ? palette.textMuted : palette.danger;
  const { top, bottom } = getMarginRange(steps);
  const y = (margin: number) =>
    VERTICAL_PADDING + ((top - margin) * (height - 2 * VERTICAL_PADDING)) / (top - bottom);
  const zeroY = y(0);
  const stepWidth = width / steps.length;
  const x = (index: number) => index * stepWidth;

  // Point i holds its margin across [x(i), x(i + 1)].
  const linePath = steps.reduce(
    (path, step, index) => `${path} V${y(step.margin)} H${x(index + 1)}`,
    `M0,${zeroY}`,
  );
  const areaPath = `${linePath} V${zeroY} Z`;

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <ClipPath id="score-flow-lead">
              <Rect x={0} y={0} width={width} height={zeroY} />
            </ClipPath>
            <ClipPath id="score-flow-trail">
              <Rect x={0} y={zeroY} width={width} height={height - zeroY} />
            </ClipPath>
          </Defs>
          <Path d={areaPath} fill={leadColor} fillOpacity={0.18} clipPath="url(#score-flow-lead)" />
          <Path
            d={areaPath}
            fill={trailColor}
            fillOpacity={0.18}
            clipPath="url(#score-flow-trail)"
          />
          <Line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke={palette.overlay20} />
          <Path
            d={linePath}
            fill="none"
            stroke={palette.textMuted}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {steps.map((step, index) => {
            if (step.outcome !== 'break' && step.outcome !== 'broken') return null;
            return (
              <Circle
                key={index}
                cx={x(index) + stepWidth / 2}
                cy={y(step.margin)}
                r={BREAK_DOT_RADIUS}
                fill={step.outcome === 'break' ? leadColor : trailColor}
              />
            );
          })}
        </Svg>
      )}
    </View>
  );
}

/**
 * Margins the chart spans: only the range the game reached, always including the zero line, so a
 * one-sided game uses the full height instead of leaving the other half empty.
 */
function getMarginRange(steps: ScoreFlowStep[]): { top: number; bottom: number } {
  const margins = steps.map((step) => step.margin);
  const top = Math.max(0, ...margins);
  const bottom = Math.min(0, ...margins);
  const shortfall = Math.max(0, MIN_MARGIN_SPAN - (top - bottom));
  // Pad on the side the game leaned toward so the line keeps its direction.
  return top >= -bottom ? { top: top + shortfall, bottom } : { top, bottom: bottom - shortfall };
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
