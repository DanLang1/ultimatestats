import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { ChemistryConnection } from '@/lib/basic/statsUtils';
import { Fonts } from '@/theme/theme';

interface ChemistryMapProps {
  playerName: string;
  connections: ChemistryConnection[];
}

export default function ChemistryMap({ playerName, connections }: ChemistryMapProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const normalizedPlayerName = playerName.trim().replace(/\s+/g, ' ');
  const centerLabel =
    normalizedPlayerName.length > 8
      ? `${normalizedPlayerName.substring(0, 7).toUpperCase()}…`
      : normalizedPlayerName.toUpperCase();
  let centerLabelFontSize: number;
  if (normalizedPlayerName.length > 8) {
    centerLabelFontSize = scaleBySizeClass(8.5, sizeClass);
  } else if (normalizedPlayerName.length > 6) {
    centerLabelFontSize = scaleBySizeClass(9, sizeClass);
  } else {
    centerLabelFontSize = scaleBySizeClass(10, sizeClass);
  }

  // Filter top connections to avoid clutter
  const feeders = connections
    .filter((c) => c.goalsFrom > 0)
    .sort((a, b) => b.goalsFrom - a.goalsFrom)
    .slice(0, 4);

  const targets = connections
    .filter((c) => c.assistsTo > 0)
    .sort((a, b) => b.assistsTo - a.assistsTo)
    .slice(0, 4);

  const svgWidth = getSizeClassValue({ small: 320, medium: 352, large: 384 }, sizeClass);
  const minNodeRadius = scaleBySizeClass(16, sizeClass);
  const maxNodeRadius = scaleBySizeClass(24, sizeClass);
  const centerNodeRadius = scaleBySizeClass(22, sizeClass);
  const rowSpacing = scaleBySizeClass(60, sizeClass);
  const svgHeight = Math.max(feeders.length, targets.length, 1) * rowSpacing + 50;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const columnOffset = scaleBySizeClass(75, sizeClass);

  // Calculate max count for scaling
  const maxFeederCount = Math.max(...feeders.map((f) => f.goalsFrom), 1);
  const maxTargetCount = Math.max(...targets.map((t) => t.assistsTo), 1);

  // Calculate summary stat: strongest connection
  const allConnections = [
    ...feeders.map((f) => ({ name: f.playerName, count: f.goalsFrom, type: 'Received' })),
    ...targets.map((t) => ({ name: t.playerName, count: t.assistsTo, type: 'Threw' })),
  ];
  const topConnection =
    allConnections.length > 0 ? allConnections.sort((a, b) => b.count - a.count)[0] : null;

  if (feeders.length === 0 && targets.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.title, { color: palette.textMuted }]}>CHEMISTRY</ThemedText>

      {/* Summary Stat (Matches ImpactTimeline style) */}
      <View style={styles.summaryDisplay}>
        <ThemedText style={[styles.summaryValue, { color: palette.accent }]}>
          {topConnection ? `${topConnection.count}` : '0'}
        </ThemedText>
        <ThemedText style={[styles.summaryLabel, { color: palette.textMuted }]}>
          {topConnection
            ? `Top Link: ${topConnection.name.length > 12 ? `${topConnection.name.substring(0, 12)}…` : topConnection.name}`
            : 'Top Connection'}
        </ThemedText>
      </View>

      {/* Column Headers */}
      <View style={[styles.columnHeaders, { width: svgWidth }]}>
        <View style={styles.columnHeader}>
          <ThemedText style={[styles.headerText, { color: palette.textMuted }]}>
            {feeders.length > 0 ? 'CAUGHT GOALS FROM' : ''}
          </ThemedText>
        </View>
        <View style={styles.columnHeader}>
          <ThemedText style={[styles.headerText, { color: palette.textMuted }]}>
            {targets.length > 0 ? 'THREW ASSISTS TO' : ''}
          </ThemedText>
        </View>
      </View>

      <Svg width={svgWidth} height={svgHeight}>
        {/* Connection Lines (draw first so they're behind nodes) */}
        {feeders.map((feeder, i) => {
          const y = centerY - ((feeders.length - 1) * rowSpacing) / 2 + i * rowSpacing;
          const x = centerX - columnOffset;
          const strokeWidth = Math.min(2 + feeder.goalsFrom, 6);
          // Calculate the actual node radius for this feeder (same formula as node drawing)
          const actualRadius =
            minNodeRadius + (feeder.goalsFrom / maxFeederCount) * (maxNodeRadius - minNodeRadius);

          return (
            <Line
              key={`line-feeder-${feeder.playerName}`}
              x1={x + actualRadius}
              y1={y}
              x2={centerX - centerNodeRadius}
              y2={centerY}
              stroke={palette.accent}
              strokeWidth={strokeWidth}
              opacity={0.4}
            />
          );
        })}

        {targets.map((target, i) => {
          const y = centerY - ((targets.length - 1) * rowSpacing) / 2 + i * rowSpacing;
          const x = centerX + columnOffset;
          const strokeWidth = Math.min(2 + target.assistsTo, 6);
          // Calculate the actual node radius for this target (same formula as node drawing)
          const actualRadius =
            minNodeRadius + (target.assistsTo / maxTargetCount) * (maxNodeRadius - minNodeRadius);

          return (
            <Line
              key={`line-target-${target.playerName}`}
              x1={centerX + centerNodeRadius}
              y1={centerY}
              x2={x - actualRadius}
              y2={y}
              stroke={palette.success}
              strokeWidth={strokeWidth}
              opacity={0.4}
            />
          );
        })}

        {/* Center Player Node */}
        <Circle cx={centerX} cy={centerY} r={centerNodeRadius} fill={palette.accent} />
        <SvgText
          x={centerX}
          y={centerY + 4}
          fill={palette.textOnAccent}
          fontSize={centerLabelFontSize}
          fontFamily={Fonts.bold}
          textAnchor="middle">
          {centerLabel}
        </SvgText>

        {/* Feeder Nodes (Left Side) */}
        {feeders.map((feeder, i) => {
          const y = centerY - ((feeders.length - 1) * rowSpacing) / 2 + i * rowSpacing;
          const x = centerX - columnOffset;
          // Scale node radius based on count
          const nodeRadius =
            minNodeRadius + (feeder.goalsFrom / maxFeederCount) * (maxNodeRadius - minNodeRadius);

          return (
            <G key={`feeder-${feeder.playerName}`}>
              {/* Node Circle with Count inside */}
              <Circle cx={x} cy={y} r={nodeRadius} fill={palette.accent} opacity={0.2} />
              <Circle
                cx={x}
                cy={y}
                r={nodeRadius}
                fill="none"
                stroke={palette.accent}
                strokeWidth="2"
              />
              <SvgText
                x={x}
                y={y + 5}
                fill={palette.accent}
                fontSize={scaleBySizeClass(14, sizeClass)}
                fontFamily={Fonts.bold}
                textAnchor="middle">
                {feeder.goalsFrom}
              </SvgText>

              {/* Player Name to the left of node */}
              <SvgText
                x={x - nodeRadius - 6}
                y={y + 4}
                fill={palette.textMuted}
                fontSize={scaleBySizeClass(9, sizeClass)}
                fontFamily={Fonts.semiBold}
                textAnchor="end">
                {feeder.playerName.length > 10
                  ? feeder.playerName.substring(0, 10) + '…'
                  : feeder.playerName}
              </SvgText>
            </G>
          );
        })}

        {/* Target Nodes (Right Side) */}
        {targets.map((target, i) => {
          const y = centerY - ((targets.length - 1) * rowSpacing) / 2 + i * rowSpacing;
          const x = centerX + columnOffset;
          // Scale node radius based on count
          const nodeRadius =
            minNodeRadius + (target.assistsTo / maxTargetCount) * (maxNodeRadius - minNodeRadius);

          return (
            <G key={`target-${target.playerName}`}>
              {/* Node Circle with Count inside */}
              <Circle cx={x} cy={y} r={nodeRadius} fill={palette.success} opacity={0.2} />
              <Circle
                cx={x}
                cy={y}
                r={nodeRadius}
                fill="none"
                stroke={palette.success}
                strokeWidth="2"
              />
              <SvgText
                x={x}
                y={y + 5}
                fill={palette.success}
                fontSize={scaleBySizeClass(14, sizeClass)}
                fontFamily={Fonts.bold}
                textAnchor="middle">
                {target.assistsTo}
              </SvgText>

              {/* Player Name to the right of node */}
              <SvgText
                x={x + nodeRadius + 6}
                y={y + 4}
                fill={palette.textMuted}
                fontSize={scaleBySizeClass(9, sizeClass)}
                fontFamily={Fonts.semiBold}
                textAnchor="start">
                {target.playerName.length > 10
                  ? target.playerName.substring(0, 10) + '…'
                  : target.playerName}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.accent }]} />
          <ThemedText style={[styles.legendText, { color: palette.textMuted }]}>
            Caught from them
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
          <ThemedText style={[styles.legendText, { color: palette.textMuted }]}>
            Threw to them
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      padding: 16,
      alignItems: 'center',
    },
    title: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 1.5,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    summaryDisplay: {
      alignItems: 'center',
      marginBottom: 12,
    },
    summaryValue: {
      fontSize: scaleBySizeClass(32, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    summaryLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
      marginTop: 2,
    },
    columnHeaders: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 0,
      marginBottom: 8,
    },
    columnHeader: {
      width: 100,
      alignItems: 'center',
    },
    headerText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
