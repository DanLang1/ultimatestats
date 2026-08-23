import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/ThemedText';
import ChemistryConnectionsDisclosure from '@/components/view-stats/ChemistryConnectionsDisclosure';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { AdvancedChemistryConnection } from '@/lib/advancedTracking/advancedChemistryUtils';
import { CHEMISTRY_MAP_VISIBLE_CONNECTIONS } from '@/lib/constants';
import { Fonts } from '@/theme/theme';

interface AdvancedChemistryMapProps {
  participantName: string;
  connections: AdvancedChemistryConnection[];
}

export default function AdvancedChemistryMap({
  participantName,
  connections,
}: AdvancedChemistryMapProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const normalized = participantName.trim().replace(/\s+/g, ' ');
  const centerLabel =
    normalized.length > 8
      ? `${normalized.substring(0, 7).toUpperCase()}…`
      : normalized.toUpperCase();

  let centerLabelFontSize: number;
  if (normalized.length > 8) {
    centerLabelFontSize = scaleBySizeClass(8.5, sizeClass);
  } else if (normalized.length > 6) {
    centerLabelFontSize = scaleBySizeClass(9, sizeClass);
  } else {
    centerLabelFontSize = scaleBySizeClass(10, sizeClass);
  }

  const feeders = connections
    .filter((c) => c.goalsFrom > 0)
    .sort((a, b) => b.goalsFrom - a.goalsFrom)
    .slice(0, CHEMISTRY_MAP_VISIBLE_CONNECTIONS);

  const targets = connections
    .filter((c) => c.assistsTo > 0)
    .sort((a, b) => b.assistsTo - a.assistsTo)
    .slice(0, CHEMISTRY_MAP_VISIBLE_CONNECTIONS);

  const connectionDetails = connections.map((connection) => ({
    id: connection.participantId,
    name: connection.participantName,
    goalsFrom: connection.goalsFrom,
    assistsTo: connection.assistsTo,
    totalConnections: connection.totalConnections,
  }));

  if (feeders.length === 0 && targets.length === 0) {
    return null;
  }

  const svgWidth = getSizeClassValue({ small: 320, medium: 352, large: 384 }, sizeClass);
  const minNodeRadius = scaleBySizeClass(16, sizeClass);
  const maxNodeRadius = scaleBySizeClass(24, sizeClass);
  const centerNodeRadius = scaleBySizeClass(22, sizeClass);
  const rowSpacing = scaleBySizeClass(60, sizeClass);
  const svgHeight = Math.max(feeders.length, targets.length, 1) * rowSpacing + 50;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const columnOffset = scaleBySizeClass(75, sizeClass);

  const maxFeederCount = Math.max(...feeders.map((f) => f.goalsFrom), 1);
  const maxTargetCount = Math.max(...targets.map((t) => t.assistsTo), 1);

  const topConnection =
    connections.length > 0
      ? connections
          .map((c) => ({
            name: c.participantName,
            count: c.goalsFrom + c.assistsTo,
          }))
          .sort((a, b) => b.count - a.count)[0]
      : null;

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.title, { color: palette.textMuted }]}>CHEMISTRY</ThemedText>

      <View style={styles.summaryDisplay}>
        <ThemedText style={[styles.summaryValue, { color: palette.accent }]}>
          {topConnection ? String(topConnection.count) : '0'}
        </ThemedText>
        <ThemedText style={[styles.summaryLabel, { color: palette.textMuted }]}>
          {topConnection
            ? `Top Link: ${topConnection.name.length > 12 ? `${topConnection.name.substring(0, 12)}…` : topConnection.name}`
            : 'Top Connection'}
        </ThemedText>
      </View>

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
        {feeders.map((feeder, i) => {
          const y = centerY - ((feeders.length - 1) * rowSpacing) / 2 + i * rowSpacing;
          const x = centerX - columnOffset;
          const strokeWidth = Math.min(2 + feeder.goalsFrom, 6);
          const actualRadius =
            minNodeRadius + (feeder.goalsFrom / maxFeederCount) * (maxNodeRadius - minNodeRadius);

          return (
            <Line
              key={`line-feeder-${feeder.participantId}`}
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
          const actualRadius =
            minNodeRadius + (target.assistsTo / maxTargetCount) * (maxNodeRadius - minNodeRadius);

          return (
            <Line
              key={`line-target-${target.participantId}`}
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

        {feeders.map((feeder, i) => {
          const y = centerY - ((feeders.length - 1) * rowSpacing) / 2 + i * rowSpacing;
          const x = centerX - columnOffset;
          const nodeRadius =
            minNodeRadius + (feeder.goalsFrom / maxFeederCount) * (maxNodeRadius - minNodeRadius);

          return (
            <G key={`feeder-${feeder.participantId}`}>
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
              <SvgText
                x={x - nodeRadius - 6}
                y={y + 4}
                fill={palette.textMuted}
                fontSize={scaleBySizeClass(9, sizeClass)}
                fontFamily={Fonts.semiBold}
                textAnchor="end">
                {feeder.participantName.length > 10
                  ? feeder.participantName.substring(0, 10) + '…'
                  : feeder.participantName}
              </SvgText>
            </G>
          );
        })}

        {targets.map((target, i) => {
          const y = centerY - ((targets.length - 1) * rowSpacing) / 2 + i * rowSpacing;
          const x = centerX + columnOffset;
          const nodeRadius =
            minNodeRadius + (target.assistsTo / maxTargetCount) * (maxNodeRadius - minNodeRadius);

          return (
            <G key={`target-${target.participantId}`}>
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
              <SvgText
                x={x + nodeRadius + 6}
                y={y + 4}
                fill={palette.textMuted}
                fontSize={scaleBySizeClass(9, sizeClass)}
                fontFamily={Fonts.semiBold}
                textAnchor="start">
                {target.participantName.length > 10
                  ? target.participantName.substring(0, 10) + '…'
                  : target.participantName}
              </SvgText>
            </G>
          );
        })}
      </Svg>

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

      <ChemistryConnectionsDisclosure connections={connectionDetails} />
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
