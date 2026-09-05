import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface RoleBalanceBarProps {
  oPoints: number;
  dPoints: number;
  oLineHolds?: number;
  dLineBreaks?: number;
  oEfficiency: number | null;
  dEfficiency: number | null;
}

export default function RoleBalanceBar({
  oPoints,
  dPoints,
  oLineHolds,
  dLineBreaks,
  oEfficiency,
  dEfficiency,
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

  const oHoldPercent = oEfficiency == null ? null : oEfficiency * 100;
  const dBreakPercent = dEfficiency == null ? null : dEfficiency * 100;

  return (
    <View style={styles.container}>
      {/* O-LINE card */}
      <View style={styles.roleCard}>
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
          {oHoldPercent != null && (
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
            {oHoldPercent != null ? `${oHoldPercent.toFixed(0)}%` : '—'}
          </ThemedText>
          <ThemedText style={[styles.effSub, { color: palette.textMuted }]}>
            {oLineHolds == null
              ? 'Hold rate'
              : `${oLineHolds} ${oLineHolds === 1 ? 'hold' : 'holds'}`}
          </ThemedText>
        </View>
        {oPoints === 0 && (
          <ThemedText style={[styles.effSub, { color: palette.textMuted }]}>
            No O-line points
          </ThemedText>
        )}
      </View>

      {/* D-LINE card */}
      <View style={styles.roleCard}>
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
          {dBreakPercent != null && (
            <View
              style={[styles.barFill, { width: `${dBreakPercent}%`, backgroundColor: dLineColor }]}
            />
          )}
        </View>
        <View style={styles.effRow}>
          <ThemedText style={[styles.effPercent, { color: palette.textInverse }]}>
            {dBreakPercent != null ? `${dBreakPercent.toFixed(0)}%` : '—'}
          </ThemedText>
          <ThemedText style={[styles.effSub, { color: palette.textMuted }]}>
            {dLineBreaks == null
              ? 'Break rate'
              : `${dLineBreaks} ${dLineBreaks === 1 ? 'break' : 'breaks'}`}
          </ThemedText>
        </View>
        {dPoints === 0 && (
          <ThemedText style={[styles.effSub, { color: palette.textMuted }]}>
            No D-line points
          </ThemedText>
        )}
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
    },
    roleCard: {
      flex: 1,
      minWidth: scaleBySizeClass(130, sizeClass),
      borderRadius: 14,

      paddingVertical: scaleBySizeClass(8, sizeClass),
      gap: scaleBySizeClass(7, sizeClass),
    },
    roleLabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
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
      flexWrap: 'wrap',
      gap: 4,
    },
    effPercent: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
    effSub: {
      fontSize: scaleBySizeClass(13, sizeClass),
    },
  });
}
