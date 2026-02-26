import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface RoleBalanceBarProps {
  oPoints: number;
  dPoints: number;
  oLineHolds: number;
  dLineBreaks: number;
  sizeClass: SizeClass;
}

export default function RoleBalanceBar({
  oPoints,
  dPoints,
  oLineHolds,
  dLineBreaks,
  sizeClass,
}: RoleBalanceBarProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const dLineColor = palette.fmpColor;

  const totalPoints = oPoints + dPoints;
  if (totalPoints === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: palette.overlay05 }]}>
        <Text style={[styles.emptyText, { color: palette.textMuted }]}>No points played</Text>
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
        <Text style={[styles.roleLabel, { color: palette.accent }]}>O-Line</Text>
        <View style={styles.countRow}>
          <Text style={[styles.pointCount, { color: palette.textInverse }]}>{oPoints}</Text>
          <Text style={[styles.ptsLabel, { color: palette.textMuted }]}>
            {oPoints === 1 ? 'pt' : 'pts'}
          </Text>
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
          <Text style={[styles.effPercent, { color: palette.textInverse }]}>
            {oPoints > 0 ? `${oHoldPercent.toFixed(0)}%` : '—'}
          </Text>
          <Text style={[styles.effSub, { color: palette.textMuted }]}>
            {oLineHolds} {oLineHolds === 1 ? 'hold' : 'holds'}
          </Text>
        </View>
      </View>

      {/* D-LINE card */}
      <View
        style={[styles.roleCard, { backgroundColor: palette.overlay05, borderColor: dLineColor }]}>
        <Text style={[styles.roleLabel, { color: dLineColor }]}>D-Line</Text>
        <View style={styles.countRow}>
          <Text style={[styles.pointCount, { color: palette.textInverse }]}>{dPoints}</Text>
          <Text style={[styles.ptsLabel, { color: palette.textMuted }]}>
            {dPoints === 1 ? 'pt' : 'pts'}
          </Text>
        </View>
        <View style={[styles.barTrack, { backgroundColor: palette.overlay10 }]}>
          {dPoints > 0 && (
            <View
              style={[styles.barFill, { width: `${dBreakPercent}%`, backgroundColor: dLineColor }]}
            />
          )}
        </View>
        <View style={styles.effRow}>
          <Text style={[styles.effPercent, { color: palette.textInverse }]}>
            {dPoints > 0 ? `${dBreakPercent.toFixed(0)}%` : '—'}
          </Text>
          <Text style={[styles.effSub, { color: palette.textMuted }]}>
            {dLineBreaks} {dLineBreaks === 1 ? 'break' : 'breaks'}
          </Text>
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
      fontWeight: '500',
    },
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    roleCard: {
      flex: 1,
      minWidth: scaleBySizeClass(130, sizeClass),
      borderRadius: 14,
      borderWidth: 1,
      padding: scaleBySizeClass(12, sizeClass),
      gap: scaleBySizeClass(7, sizeClass),
    },
    roleLabel: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontWeight: '700',
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
      fontWeight: '800',
      lineHeight: scaleBySizeClass(32, sizeClass),
    },
    ptsLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
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
      fontWeight: '700',
    },
    effSub: {
      fontSize: scaleBySizeClass(10, sizeClass),
    },
  });
}
