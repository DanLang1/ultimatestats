import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polygon, Line as SvgLine } from 'react-native-svg';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { RoleStats } from '@/lib/basic/statsUtils';
import { Fonts } from '@/theme/theme';

interface RoleDiamondProps {
  roleStats: RoleStats;
}

export default function RoleDiamond({ roleStats }: RoleDiamondProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const { rawGoals, rawAssists, rawBlocks, rawTurnovers } = roleStats;

  const size = scaleBySizeClass(140, sizeClass);
  const styles = createStyles(sizeClass, size);
  const center = size / 2;
  const maxRadius = center - 20;

  // Use a shared raw-count scale so equal counts render equally on every axis.
  const scaleMax = Math.max(rawGoals, rawAssists, rawBlocks, rawTurnovers, 1);
  const goals = rawGoals / scaleMax;
  const assists = rawAssists / scaleMax;
  const blocks = rawBlocks / scaleMax;
  const turnovers = rawTurnovers / scaleMax;

  // Diamond layout:
  // Top: Goals
  // Right: Assists
  // Bottom: Turnovers
  // Left: Blocks
  const topY = center - goals * maxRadius;
  const rightX = center + assists * maxRadius;
  const bottomY = center + turnovers * maxRadius;
  const leftX = center - blocks * maxRadius;

  const points = `${center},${topY} ${rightX},${center} ${center},${bottomY} ${leftX},${center}`;

  // Max outline diamond
  const outlinePoints = [
    `${center},${center - maxRadius}`,
    `${center + maxRadius},${center}`,
    `${center},${center + maxRadius}`,
    `${center - maxRadius},${center}`,
  ].join(' ');

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.title, { color: palette.textMuted }]}>PROFILE</ThemedText>

      {/* Diamond with external labels */}
      <View style={styles.diamondWrapper}>
        {/* Left label: BLOCKS */}
        <ThemedText style={[styles.sideLabel, styles.leftLabel, { color: palette.textMuted }]}>
          BLOCKS{'\n'}({rawBlocks})
        </ThemedText>

        {/* SVG Diamond */}
        <View style={styles.diamondArea}>
          <Svg width={size} height={size}>
            {/* Axis lines */}
            <SvgLine
              x1={center}
              y1={center - maxRadius}
              x2={center}
              y2={center + maxRadius}
              stroke={palette.overlay10}
              strokeWidth="1"
            />
            <SvgLine
              x1={center - maxRadius}
              y1={center}
              x2={center + maxRadius}
              y2={center}
              stroke={palette.overlay10}
              strokeWidth="1"
            />

            {/* Max outline */}
            <Polygon
              points={outlinePoints}
              fill="none"
              stroke={palette.overlay10}
              strokeWidth="1"
              strokeDasharray="4,4"
            />

            {/* Player shape */}
            <Polygon
              points={points}
              fill={palette.accent}
              fillOpacity={0.3}
              stroke={palette.accent}
              strokeWidth="2"
            />

            {/* Center dot */}
            <Circle cx={center} cy={center} r="3" fill={palette.textMuted} />
          </Svg>

          <ThemedText style={[styles.topLabel, { color: palette.textMuted }]}>
            GOALS ({rawGoals})
          </ThemedText>
          <ThemedText style={[styles.bottomLabel, { color: palette.danger }]}>
            TURNS ({rawTurnovers})
          </ThemedText>
        </View>

        {/* Right label: ASSISTS */}
        <ThemedText style={[styles.sideLabel, styles.rightLabel, { color: palette.textMuted }]}>
          ASSISTS{'\n'}({rawAssists})
        </ThemedText>
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass, size: number) {
  return StyleSheet.create({
    container: {
      padding: 16,
      alignItems: 'center',
    },
    title: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    diamondWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    diamondArea: {
      width: size,
      height: size,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sideLabel: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    leftLabel: {
      marginRight: 4,
    },
    rightLabel: {
      marginLeft: 4,
    },
    topLabel: {
      position: 'absolute',
      top: 2,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
    },
    bottomLabel: {
      position: 'absolute',
      bottom: 2,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
    },
  });
}
