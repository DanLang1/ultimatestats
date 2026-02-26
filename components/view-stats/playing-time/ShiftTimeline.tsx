import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import { PointEvents } from '@/lib/timelineUtils';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface ShiftTimelineProps {
  pointEvents: PointEvents[];
  finalLines: Map<number, Set<string>>;
  playerId: string;
  timingEnabled: boolean;
  sizeClass: SizeClass;
}

export default function ShiftTimeline({
  pointEvents,
  finalLines,
  playerId,
  timingEnabled,
  sizeClass,
}: ShiftTimelineProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);

  if (pointEvents.length === 0) {
    return null;
  }

  // Calculate maximum size to ensure container is tall enough
  const maxRadius = timingEnabled
    ? scaleBySizeClass(16, sizeClass)
    : scaleBySizeClass(8, sizeClass);
  const containerHeight = maxRadius * 2 + scaleBySizeClass(24, sizeClass); // + padding

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: palette.textMuted }]}>SHIFT TIMELINE</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { minHeight: containerHeight }]}>
        {pointEvents.map((point, index) => {
          const played = finalLines.get(point.pointNumber)?.has(playerId);
          const isOLine = point.offensiveTeam === 'team1';
          const won = point.scoringTeam === 'team1';

          let radius = scaleBySizeClass(4, sizeClass); // Default for unplayed
          let color = palette.overlay20;
          let opacity = 1;
          let borderWidth = 0;
          let borderColor = 'transparent';

          if (played) {
            color = isOLine ? palette.accent : palette.warning;
            opacity = won || point.isInProgress ? 1 : 0.5;

            // Border to highlight wins
            if (won) {
              borderWidth = scaleBySizeClass(2, sizeClass);
              borderColor = palette.textInverse;
            }

            // Size based on duration
            if (timingEnabled && point.pointDurationMs) {
              const minutes = point.pointDurationMs / 60000;
              // Map 0-5 minutes to 0-8 extra radius
              const extraSize = Math.min(minutes * 1.5, 8);
              radius = scaleBySizeClass(8 + extraSize, sizeClass);
            } else {
              radius = scaleBySizeClass(8, sizeClass);
            }
          }

          const size = radius * 2;

          return (
            <View key={point.pointNumber} style={styles.pointContainer}>
              {/* Track segment connecting points */}
              <View style={[styles.trackSegment, { backgroundColor: palette.overlay10 }]} />
              <View
                style={[
                  styles.bubble,
                  {
                    width: size,
                    height: size,
                    borderRadius: radius,
                    backgroundColor: color,
                    opacity,
                    borderWidth,
                    borderColor,
                    // Elevate played points slightly above the track
                    zIndex: played ? 10 : 1,
                  },
                ]}
              />
              {/* Point number indicator for reference if it's the first or last or every 5th */}
              {(index === 0 || index === pointEvents.length - 1 || point.pointNumber % 5 === 0) && (
                <Text style={[styles.pointLabel, { color: palette.textMuted }]}>
                  {point.pointNumber}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.accent }]} />
          <Text style={[styles.legendText, { color: palette.textMuted }]}>O-Line Hold</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.accent, opacity: 0.5 }]} />
          <Text style={[styles.legendText, { color: palette.textMuted }]}>O-Line Broken</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.warning }]} />
          <Text style={[styles.legendText, { color: palette.textMuted }]}>D-Line Break</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.warning, opacity: 0.5 }]} />
          <Text style={[styles.legendText, { color: palette.textMuted }]}>D-Line Held</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      gap: 8,
      flex: 1,
    },
    title: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '700',
      letterSpacing: 1,
    },
    scrollContent: {
      alignItems: 'center',
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      position: 'relative',
      flexGrow: 1,
      justifyContent: 'flex-start',
    },
    trackSegment: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: scaleBySizeClass(2, sizeClass),
      top: '50%',
      marginTop: scaleBySizeClass(-1, sizeClass),
      zIndex: 0,
    },
    pointContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      minWidth: scaleBySizeClass(24, sizeClass),
      height: '100%',
    },
    bubble: {
      // Dynamic styles applied inline
    },
    pointLabel: {
      position: 'absolute',
      bottom: scaleBySizeClass(-20, sizeClass),
      fontSize: scaleBySizeClass(9, sizeClass),
      fontWeight: '600',
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: scaleBySizeClass(12, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
      borderTopWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      justifyContent: 'center',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(4, sizeClass),
    },
    legendDot: {
      width: scaleBySizeClass(8, sizeClass),
      height: scaleBySizeClass(8, sizeClass),
      borderRadius: scaleBySizeClass(4, sizeClass),
    },
    legendText: {
      fontSize: scaleBySizeClass(10, sizeClass),
    },
  });
}
