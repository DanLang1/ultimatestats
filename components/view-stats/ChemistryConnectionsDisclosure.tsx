import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { CHEMISTRY_MAP_VISIBLE_CONNECTIONS } from '@/lib/constants';
import { Fonts } from '@/theme/theme';

const MIN_VISIBLE_BAR_PERCENT = 8;

export interface ChemistryConnectionDisplay {
  id: string;
  name: string;
  goalsFrom: number;
  assistsTo: number;
  totalConnections: number;
}

interface ChemistryConnectionsDisclosureProps {
  connections: ChemistryConnectionDisplay[];
}

export default function ChemistryConnectionsDisclosure({
  connections,
}: ChemistryConnectionsDisclosureProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasAdditionalConnections = connections.length > CHEMISTRY_MAP_VISIBLE_CONNECTIONS;
  if (!hasAdditionalConnections) {
    return null;
  }

  const rankedConnections = [...connections].sort(
    (a, b) => b.totalConnections - a.totalConnections,
  );
  const maxConnectionCount = Math.max(
    ...rankedConnections.map((connection) => connection.totalConnections),
    1,
  );
  const connectionCount = rankedConnections.length;
  const toggleLabel = isExpanded
    ? 'Hide all chemistry connections'
    : `View all ${connectionCount} chemistry connections`;

  return (
    <View style={styles.container}>
      <Pressable
        testID="chemistry-connections-toggle"
        accessibilityRole="button"
        accessibilityLabel={toggleLabel}
        accessibilityState={{ expanded: isExpanded }}
        onPress={() => setIsExpanded((current) => !current)}
        style={({ pressed }) => [
          styles.toggle,
          {
            backgroundColor: 'transparent',
            borderColor: isExpanded ? palette.accent : palette.overlay15,
          },
          pressed && styles.togglePressed,
        ]}>
        <ThemedText style={[styles.toggleContext, { color: palette.textMuted }]}>
          {isExpanded
            ? `Showing all ${connectionCount}`
            : `Showing top ${CHEMISTRY_MAP_VISIBLE_CONNECTIONS}`}
        </ThemedText>
        <View style={styles.toggleAction}>
          <ThemedText style={[styles.toggleActionText, { color: palette.accent }]}>
            {isExpanded ? 'Show less' : `View all ${connectionCount}`}
          </ThemedText>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={scaleBySizeClass(18, sizeClass)}
            color={palette.accent}
          />
        </View>
      </Pressable>

      {isExpanded && (
        <View testID="chemistry-connections-list" style={styles.list}>
          {rankedConnections.map((connection) => {
            const totalWidthPercent = Math.max(
              MIN_VISIBLE_BAR_PERCENT,
              (connection.totalConnections / maxConnectionCount) * 100,
            );

            return (
              <View
                key={connection.id}
                testID={`chemistry-connection-${connection.id}`}
                style={styles.row}>
                <View style={styles.rowHeader}>
                  <ThemedText
                    style={[styles.partnerName, { color: palette.textInverse }]}
                    numberOfLines={1}>
                    {connection.name}
                  </ThemedText>
                  <View style={styles.countCluster}>
                    <ThemedText style={[styles.directionCount, { color: palette.accent }]}>
                      {connection.goalsFrom}
                    </ThemedText>
                    <ThemedText style={[styles.directionDivider, { color: palette.textMuted }]}>
                      /
                    </ThemedText>
                    <ThemedText style={[styles.directionCount, { color: palette.success }]}>
                      {connection.assistsTo}
                    </ThemedText>
                    <ThemedText style={[styles.totalCount, { color: palette.textInverse }]}>
                      {connection.totalConnections}
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.track, { backgroundColor: palette.overlay10 }]}>
                  <View style={[styles.totalBar, { width: `${totalWidthPercent}%` }]}>
                    {connection.goalsFrom > 0 && (
                      <View
                        style={[
                          styles.connectionSegment,
                          { backgroundColor: palette.accent, flex: connection.goalsFrom },
                        ]}
                      />
                    )}
                    {connection.assistsTo > 0 && (
                      <View
                        style={[
                          styles.connectionSegment,
                          { backgroundColor: palette.success, flex: connection.assistsTo },
                        ]}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      width: '100%',
      gap: 12,
      marginTop: 16,
    },
    toggle: {
      minHeight: scaleBySizeClass(44, sizeClass),
      paddingHorizontal: 12,
      borderWidth: 1,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    togglePressed: {
      opacity: 0.8,
    },
    toggleContext: {
      flex: 1,
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    toggleAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    toggleActionText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
    },
    list: {
      gap: 12,
    },
    row: {
      gap: 6,
    },
    rowHeader: {
      minHeight: scaleBySizeClass(22, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    partnerName: {
      flex: 1,
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    countCluster: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    directionCount: {
      minWidth: scaleBySizeClass(14, sizeClass),
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      textAlign: 'center',
    },
    directionDivider: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    totalCount: {
      minWidth: scaleBySizeClass(28, sizeClass),
      marginLeft: 6,
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.extraBold,
      textAlign: 'right',
    },
    track: {
      height: scaleBySizeClass(10, sizeClass),
      borderRadius: 999,
      overflow: 'hidden',
    },
    totalBar: {
      height: '100%',
      flexDirection: 'row',
      borderRadius: 999,
      overflow: 'hidden',
    },
    connectionSegment: {
      height: '100%',
    },
  });
}
