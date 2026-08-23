import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout, type SizeClass } from '@/hooks/useLayout';
import type { AdvancedTimelineLinePlayer } from '@/lib/advancedTracking/advancedTimelineUtils';
import { hasItems } from '@/lib/utils';
import { Fonts } from '@/theme/theme';

interface LineupBlockProps {
  players: AdvancedTimelineLinePlayer[];
}

export default function LineupBlock({ players }: LineupBlockProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  if (!hasItems(players)) return null;
  const showFinalStateBadges = players.some((player) => !player.isActiveAtEnd);

  return (
    <View style={styles.lineupBlock}>
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
            {showFinalStateBadges && (
              <View
                style={[
                  styles.lineupBadge,
                  { backgroundColor: p.isActiveAtEnd ? palette.success : palette.danger },
                ]}>
                <ThemedText style={[styles.lineupBadgeText, { color: palette.textOnAccent }]}>
                  {p.isActiveAtEnd ? 'IN' : 'OUT'}
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
      flexDirection: 'row',
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
