import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { AdvancedImpactPoint } from '@/lib/advancedTracking/advancedImpactUtils';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface AdvancedPointPresenceStripProps {
  impactPoints: AdvancedImpactPoint[];
}

type SegmentType = 'Hold' | 'Break' | 'Opp Hold' | 'Broken' | 'Off';

export default function AdvancedPointPresenceStrip({
  impactPoints,
}: AdvancedPointPresenceStripProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  if (impactPoints.length === 0) return null;

  const segColorMap: Record<SegmentType, string> = {
    Hold: palette.success,
    Break: palette.dLineAccent,
    'Opp Hold': palette.warning,
    Broken: palette.danger,
    Off: palette.overlay15,
  };

  const legendOrder: SegmentType[] = ['Hold', 'Break', 'Opp Hold', 'Broken', 'Off'];
  const usedTypes = new Set<SegmentType>();

  const segments = impactPoints.map((pt) => {
    let segType: SegmentType;
    if (!pt.onField) {
      segType = 'Off';
    } else if (pt.state === 'hold') {
      segType = 'Hold';
    } else if (pt.state === 'break') {
      segType = 'Break';
    } else if (pt.state === 'opp_hold') {
      segType = 'Opp Hold';
    } else if (pt.state === 'broken') {
      segType = 'Broken';
    } else {
      segType = 'Off';
    }
    usedTypes.add(segType);
    return { pointIndex: pt.pointIndex, segType };
  });

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: palette.textMuted }]}>GAME BREAKDOWN</ThemedText>

      <View style={styles.bar}>
        {segments.map(({ pointIndex, segType }, i) => (
          <React.Fragment key={pointIndex}>
            <View style={[styles.segment, { backgroundColor: segColorMap[segType] }]} />
            {i < segments.length - 1 && (
              <View style={[styles.divider, { backgroundColor: palette.overlay08 }]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <View style={styles.legend}>
        {legendOrder
          .filter((type) => usedTypes.has(type))
          .map((type) => (
            <React.Fragment key={type}>
              <View style={[styles.legendSwatch, { backgroundColor: segColorMap[type] }]} />
              <ThemedText style={[styles.legendText, { color: palette.textMuted }]}>
                {type}
              </ThemedText>
            </React.Fragment>
          ))}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  const barH = scaleBySizeClass(20, sizeClass);
  return StyleSheet.create({
    container: {
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    label: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    bar: {
      flexDirection: 'row',
      height: barH,
      borderRadius: barH / 2,
      overflow: 'hidden',
    },
    segment: {
      flex: 1,
      height: barH,
    },
    divider: {
      height: barH,
      width: 1,
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    legendSwatch: {
      width: scaleBySizeClass(10, sizeClass),
      height: scaleBySizeClass(10, sizeClass),
      borderRadius: 2,
    },
    legendText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      marginRight: 6,
    },
  });
}
