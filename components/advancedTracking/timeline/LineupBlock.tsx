import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout, type SizeClass } from '@/hooks/useLayout';
import { hasItems } from '@/lib/utils';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface LineupBlockProps {
  sideLabel: string;
  players: { participantId: string; name: string; isSubIn: boolean; isInjuredOut: boolean }[];
}

export default function LineupBlock({ sideLabel, players }: LineupBlockProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  if (!hasItems(players)) return null;

  return (
    <View style={styles.lineupBlock}>
      <ThemedText style={[styles.lineupSideLabel, { color: palette.textMuted }]}>
        {sideLabel}
      </ThemedText>
      <View style={styles.lineupChips}>
        {players.map((p) => (
          <View
            key={p.participantId}
            style={[
              styles.lineupChip,
              {
                backgroundColor: palette.timelineLineupChipBg,
                borderColor: palette.timelineLineupChipBorder,
              },
            ]}>
            <ThemedText style={[styles.lineupChipText, { color: palette.textInverse }]}>
              {p.name}
            </ThemedText>
            {p.isSubIn && (
              <View style={[styles.lineupBadge, { backgroundColor: palette.warning }]}>
                <ThemedText style={[styles.lineupBadgeText, { color: palette.textOnAccent }]}>
                  IN
                </ThemedText>
              </View>
            )}
            {p.isInjuredOut && (
              <View style={[styles.lineupBadge, { backgroundColor: palette.danger }]}>
                <ThemedText style={[styles.lineupBadgeText, { color: palette.textOnAccent }]}>
                  OUT
                </ThemedText>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    lineupBlock: {
      gap: 6,
    },
    lineupSideLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    lineupChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    lineupChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    lineupChipText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    lineupBadge: {
      borderRadius: 999,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    lineupBadgeText: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.3,
    },
  });
}
