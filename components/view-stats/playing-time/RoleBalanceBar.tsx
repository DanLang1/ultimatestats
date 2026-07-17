import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface RoleBalanceBarProps {
  oPoints: number;
  dPoints: number;
  oLineHolds: number;
  dLineBreaks: number;
}

export default function RoleBalanceBar({
  oPoints,
  dPoints,
  oLineHolds,
  dLineBreaks,
}: RoleBalanceBarProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const dLineColor = palette.dLineAccent;

  const totalPoints = oPoints + dPoints;
  if (totalPoints === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: palette.overlay05 }]}>
        <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
          No points played
        </ThemedText>
      </View>
    );
  }

  const oHoldPercent = oPoints > 0 ? (oLineHolds / oPoints) * 100 : 0;
  const dBreakPercent = dPoints > 0 ? (dLineBreaks / dPoints) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* O-LINE card */}
      <View
        style={[
          styles.roleCard,
          { backgroundColor: palette.overlay05, borderColor: palette.accent },
        ]}>
        <ThemedText style={[styles.roleLabel, { color: palette.accent }]}>O-Line</ThemedText>
        <View style={styles.countRow}>
          <ThemedText style={[styles.pointCount, { color: palette.textInverse }]}>
            {oPoints}
          </ThemedText>
          <ThemedText style={[styles.ptsLabel, { color: palette.textMuted }]}>
            {oPoints === 1 ? 'pt' : 'pts'}
          </ThemedText>
        </View>
        <View style={[styles.barTrack, { backgroundColor: palette.overlay10 }]}>
          {oPoints > 0 && (
            <View
              style={[
                styles.barFill,
                { width: `${oHoldPercent}%`, backgroundColor: palette.accent },
              ]}
            />
          )}
        </View>
        <View style={styles.effRow}>
          <ThemedText style={[styles.effPercent, { color: palette.textInverse }]}>
            {oPoints > 0 ? `${oHoldPercent.toFixed(0)}%` : '—'}
          </ThemedText>
          <ThemedText style={[styles.effSub, { color: palette.textMuted }]}>
            {oLineHolds} {oLineHolds === 1 ? 'hold' : 'holds'}
          </ThemedText>
        </View>
      </View>

      {/* D-LINE card */}
      <View
        style={[styles.roleCard, { backgroundColor: palette.overlay05, borderColor: dLineColor }]}>
        <ThemedText style={[styles.roleLabel, { color: dLineColor }]}>D-Line</ThemedText>
        <View style={styles.countRow}>
          <ThemedText style={[styles.pointCount, { color: palette.textInverse }]}>
            {dPoints}
          </ThemedText>
          <ThemedText style={[styles.ptsLabel, { color: palette.textMuted }]}>
            {dPoints === 1 ? 'pt' : 'pts'}
          </ThemedText>
        </View>
        <View style={[styles.barTrack, { backgroundColor: palette.overlay10 }]}>
          {dPoints > 0 && (
            <View
              style={[styles.barFill, { width: `${dBreakPercent}%`, backgroundColor: dLineColor }]}
            />
          )}
        </View>
        <View style={styles.effRow}>
          <ThemedText style={[styles.effPercent, { color: palette.textInverse }]}>
            {dPoints > 0 ? `${dBreakPercent.toFixed(0)}%` : '—'}
          </ThemedText>
          <ThemedText style={[styles.effSub, { color: palette.textMuted }]}>
            {dLineBreaks} {dLineBreaks === 1 ? 'break' : 'breaks'}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    emptyContainer: {
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      ...(sizeClass !== 'small' && { justifyContent: 'center' as const }),
    },
    roleCard: {
      flex: 1,
      minWidth: scaleBySizeClass(130, sizeClass),
      maxWidth: 320,
      borderRadius: 14,
      borderWidth: 1,
      padding: scaleBySizeClass(12, sizeClass),
      gap: scaleBySizeClass(7, sizeClass),
    },
    roleLabel: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    countRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    pointCount: {
      fontSize: scaleBySizeClass(28, sizeClass),
      fontFamily: Fonts.extraBold,
      lineHeight: scaleBySizeClass(32, sizeClass),
    },
    ptsLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    barTrack: {
      height: scaleBySizeClass(5, sizeClass),
      borderRadius: 999,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 999,
    },
    effRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    effPercent: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
    effSub: {
      fontSize: scaleBySizeClass(10, sizeClass),
    },
  });
}
