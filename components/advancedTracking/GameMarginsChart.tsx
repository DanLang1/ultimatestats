import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { getMarginRange } from '@/lib/marginChartUtils';

const CHART_HEIGHT = 96;
const VERTICAL_PADDING = 6;
const MAX_BAR_WIDTH = 16;
/** Share of each game's slot the bar fills, leaving the rest as the gap between bars. */
const BAR_FILL = 0.6;
const BAR_RADIUS = 3;
/** A tie has no height, so it draws as a short stub on the zero line. */
const TIE_BAR_HEIGHT = 2;

interface GameMarginsChartProps {
  /** Final margin per game, oldest first. */
  margins: number[];
  accessibilityLabel: string;
}

/** One bar per game: above the zero line for a win, below for a loss. */
export default function GameMarginsChart({ margins, accessibilityLabel }: GameMarginsChartProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const [width, setWidth] = useState(0);
  const height = scaleBySizeClass(CHART_HEIGHT, sizeClass);

  const { top, bottom } = getMarginRange(margins);
  const y = (margin: number) =>
    VERTICAL_PADDING + ((top - margin) * (height - 2 * VERTICAL_PADDING)) / (top - bottom);
  const zeroY = y(0);
  const slotWidth = width / margins.length;
  const barWidth = Math.min(MAX_BAR_WIDTH, slotWidth * BAR_FILL);

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {margins.map((margin, index) => {
            const barTop = Math.min(zeroY, y(margin));
            const barHeight = margin === 0 ? TIE_BAR_HEIGHT : Math.abs(y(margin) - zeroY);
            let fill = palette.textMuted;
            if (margin > 0) fill = palette.success;
            else if (margin < 0) fill = palette.danger;
            return (
              <Rect
                key={index}
                x={index * slotWidth + (slotWidth - barWidth) / 2}
                y={margin === 0 ? zeroY - TIE_BAR_HEIGHT / 2 : barTop}
                width={barWidth}
                height={barHeight}
                rx={BAR_RADIUS}
                fill={fill}
              />
            );
          })}
          <Line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke={palette.overlay20} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
