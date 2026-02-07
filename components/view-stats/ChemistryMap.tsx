import { useTheme } from '@/context/ThemeContext';
import { ChemistryConnection } from '@/lib/statsUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

interface ChemistryMapProps {
  playerName: string;
  connections: ChemistryConnection[];
}

export default function ChemistryMap({ playerName, connections }: ChemistryMapProps) {
  const { palette } = useTheme();
  // Filter top connections to avoid clutter
  const feeders = connections
    .filter((c) => c.goalsFrom > 0)
    .sort((a, b) => b.goalsFrom - a.goalsFrom)
    .slice(0, 4);

  const targets = connections
    .filter((c) => c.assistsTo > 0)
    .sort((a, b) => b.assistsTo - a.assistsTo)
    .slice(0, 4);

  const svgWidth = 320;
  const minNodeRadius = 16;
  const maxNodeRadius = 24;
  const centerNodeRadius = 22;
  const svgHeight = Math.max(feeders.length, targets.length, 1) * 60 + 50;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const columnOffset = 75;

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
      <Text style={[styles.title, { color: palette.textMuted }]}>CHEMISTRY</Text>

      {/* Summary Stat (Matches ImpactTimeline style) */}
      <View style={styles.summaryDisplay}>
        <Text style={[styles.summaryValue, { color: palette.accent }]}>
          {topConnection ? `${topConnection.count}` : '0'}
        </Text>
        <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>
          {topConnection ? `Top Link: ${topConnection.name.split(' ')[0]}` : 'Top Connection'}
        </Text>
      </View>

      {/* Column Headers */}
      <View style={[styles.columnHeaders, { width: svgWidth }]}>
        <View style={styles.columnHeader}>
          <Text style={[styles.headerText, { color: palette.textMuted }]}>
            {feeders.length > 0 ? 'CAUGHT GOALS FROM' : ''}
          </Text>
        </View>
        <View style={styles.columnHeader}>
          <Text style={[styles.headerText, { color: palette.textMuted }]}>
            {targets.length > 0 ? 'THREW ASSISTS TO' : ''}
          </Text>
        </View>
      </View>

      <Svg width={svgWidth} height={svgHeight}>
        {/* Connection Lines (draw first so they're behind nodes) */}
        {feeders.map((feeder, i) => {
          const y = centerY - ((feeders.length - 1) * 60) / 2 + i * 60;
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
          const y = centerY - ((targets.length - 1) * 60) / 2 + i * 60;
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
          fill="#FFF"
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle">
          {(() => {
            const firstName = playerName.split(' ')[0].toUpperCase();
            return firstName.length > 8 ? firstName.substring(0, 7) + '…' : firstName;
          })()}
        </SvgText>

        {/* Feeder Nodes (Left Side) */}
        {feeders.map((feeder, i) => {
          const y = centerY - ((feeders.length - 1) * 60) / 2 + i * 60;
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
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle">
                {feeder.goalsFrom}
              </SvgText>

              {/* Player Name to the left of node */}
              <SvgText
                x={x - nodeRadius - 6}
                y={y + 4}
                fill={palette.textMuted}
                fontSize="9"
                fontWeight="600"
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
          const y = centerY - ((targets.length - 1) * 60) / 2 + i * 60;
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
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle">
                {target.assistsTo}
              </SvgText>

              {/* Player Name to the right of node */}
              <SvgText
                x={x + nodeRadius + 6}
                y={y + 4}
                fill={palette.textMuted}
                fontSize="9"
                fontWeight="600"
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
          <Text style={[styles.legendText, { color: palette.textMuted }]}>Caught from them</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
          <Text style={[styles.legendText, { color: palette.textMuted }]}>Threw to them</Text>
        </View>
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
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  summaryDisplay: {
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
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
    fontSize: 10,
    fontWeight: 'bold',
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
    fontSize: 10,
    fontWeight: '500',
  },
});
