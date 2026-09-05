import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { AdvancedPassConnection } from '@/lib/advancedTracking/advancedChemistryUtils';
import { Fonts } from '@/theme/theme';

const MIN_VISIBLE_BAR_PERCENT = 8;

interface AdvancedPassConnectionsProps {
  connections: AdvancedPassConnection[];
}

export default function AdvancedPassConnections({ connections }: AdvancedPassConnectionsProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  if (connections.length === 0) {
    return null;
  }

  const totalPasses = connections.reduce((total, connection) => total + connection.totalPasses, 0);
  const maxConnectionPasses = Math.max(
    ...connections.map((connection) => connection.totalPasses),
    1,
  );
  const topConnection = connections[0];

  return (
    <View style={styles.container}>
      <View style={styles.summaryDisplay}>
        <ThemedText style={[styles.summaryValue, { color: palette.accent }]}>
          {totalPasses}
        </ThemedText>
        <ThemedText style={[styles.summaryLabel, { color: palette.textMuted }]} numberOfLines={1}>
          {`Top Link: ${topConnection.participantName}`}
        </ThemedText>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.accent }]} />
          <ThemedText style={[styles.legendText, { color: palette.textMuted }]}>
            Caught from
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
          <ThemedText style={[styles.legendText, { color: palette.textMuted }]}>
            Threw to
          </ThemedText>
        </View>
      </View>

      <View style={styles.list}>
        {connections.map((connection) => {
          const totalWidthPercent = Math.max(
            MIN_VISIBLE_BAR_PERCENT,
            (connection.totalPasses / maxConnectionPasses) * 100,
          );

          return (
            <View key={connection.participantId} style={styles.row}>
              <View style={styles.rowHeader}>
                <ThemedText
                  style={[styles.partnerName, { color: palette.textInverse }]}
                  numberOfLines={1}>
                  {connection.participantName}
                </ThemedText>
                <View style={styles.countCluster}>
                  <ThemedText style={[styles.directionCount, { color: palette.accent }]}>
                    {connection.caughtFrom}
                  </ThemedText>
                  <ThemedText style={[styles.directionDivider, { color: palette.textMuted }]}>
                    /
                  </ThemedText>
                  <ThemedText style={[styles.directionCount, { color: palette.success }]}>
                    {connection.threwTo}
                  </ThemedText>
                  <ThemedText style={[styles.totalCount, { color: palette.textInverse }]}>
                    {connection.totalPasses}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.track, { backgroundColor: palette.overlay10 }]}>
                <View style={[styles.totalBar, { width: `${totalWidthPercent}%` }]}>
                  {connection.caughtFrom > 0 && (
                    <View
                      style={[
                        styles.caughtSegment,
                        {
                          backgroundColor: palette.accent,
                          flex: connection.caughtFrom,
                        },
                      ]}
                    />
                  )}
                  {connection.threwTo > 0 && (
                    <View
                      style={[
                        styles.threwSegment,
                        {
                          backgroundColor: palette.success,
                          flex: connection.threwTo,
                        },
                      ]}
                    />
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      padding: 16,
      gap: 12,
    },
    summaryDisplay: {
      alignItems: 'center',
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
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
    caughtSegment: {
      height: '100%',
    },
    threwSegment: {
      height: '100%',
    },
  });
}
