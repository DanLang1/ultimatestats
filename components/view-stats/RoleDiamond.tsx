import { RoleStats } from '@/lib/statsUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polygon, Line as SvgLine, Text as SvgText } from 'react-native-svg';

interface RoleDiamondProps {
  roleStats: RoleStats;
  palette: any;
}

export default function RoleDiamond({ roleStats, palette }: RoleDiamondProps) {
  const { goals, assists, blocks, turnovers } = roleStats;

  const size = 140;
  const center = size / 2;
  const maxRadius = center - 20;

  // Values are already normalized 0-1 from getRoleStats
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
      <Text style={[styles.title, { color: palette.textMuted }]}>PROFILE</Text>

      {/* Diamond with external labels */}
      <View style={styles.diamondWrapper}>
        {/* Left label: BLOCKS */}
        <Text style={[styles.sideLabel, styles.leftLabel, { color: palette.textMuted }]}>
          BLOCKS
        </Text>

        {/* SVG Diamond */}
        <View style={{ width: size, height: size }}>
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

            {/* Top/Bottom labels stay in SVG since they don't overlap */}
            <SvgText
              x={center}
              y={12}
              fill={palette.textMuted}
              fontSize="9"
              fontWeight="600"
              textAnchor="middle">
              GOALS
            </SvgText>
            <SvgText
              x={center}
              y={size - 4}
              fill={palette.danger}
              fontSize="9"
              fontWeight="600"
              textAnchor="middle">
              TURNS
            </SvgText>
          </Svg>
        </View>

        {/* Right label: ASSISTS */}
        <Text style={[styles.sideLabel, styles.rightLabel, { color: palette.textMuted }]}>
          ASSISTS
        </Text>
      </View>
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
  diamondWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  leftLabel: {
    marginRight: 4,
  },
  rightLabel: {
    marginLeft: 4,
  },
});
