import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getPlayerMatchingType, getPlayerName } from '@/lib/playerUtils';
import { Player, PointLineRecord } from '@/lib/storage/types';
import { buildTimelineLineupEntries } from '@/lib/timelineUtils';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TimelineLineupFooterProps {
  playerIds: string[];
  pointRecords: PointLineRecord[];
  roster: Player[];
  mmpColor: string;
  fmpColor: string;
}

export default function TimelineLineupFooter({
  playerIds,
  pointRecords,
  roster,
  mmpColor,
  fmpColor,
}: TimelineLineupFooterProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const lineupEntries = buildTimelineLineupEntries(playerIds, pointRecords);

  return (
    <View
      style={[
        styles.lineupFooter,
        {
          backgroundColor: 'transparent',
          borderTopColor: palette.border,
        },
      ]}>
      <View style={styles.lineupHeader}>
        <MaterialCommunityIcons
          name="account-group-outline"
          size={scaleBySizeClass(16, sizeClass)}
          color={palette.accent}
        />
      </View>
      <View style={styles.lineupChipsWrapper}>
        {lineupEntries.map(({ playerId, isSubIn, isInjuredOut }) => {
          const matchType = getPlayerMatchingType(roster, playerId);
          const chipLabelColor =
            matchType === 'mmp' ? mmpColor : matchType === 'fmp' ? fmpColor : palette.textInverse;

          return (
            <View
              key={playerId}
              style={[
                styles.lineupChip,
                {
                  backgroundColor: palette.timelineLineupChipBg,
                  borderColor: palette.timelineLineupChipBorder,
                },
              ]}>
              <Text style={[styles.lineupChipText, { color: chipLabelColor }]}>
                {getPlayerName(roster, playerId) ?? playerId}
              </Text>
              {isSubIn && (
                <View
                  style={[
                    styles.lineupStateBadge,
                    {
                      backgroundColor: palette.warning,
                    },
                  ]}>
                  <Text style={[styles.lineupStateBadgeText, { color: palette.textOnAccent }]}>
                    SUB
                  </Text>
                </View>
              )}
              {isInjuredOut && (
                <View
                  style={[
                    styles.lineupStateBadge,
                    {
                      backgroundColor: palette.danger,
                    },
                  ]}>
                  <Text style={[styles.lineupStateBadgeText, { color: palette.textOnAccent }]}>
                    INJ
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    lineupFooter: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderTopWidth: 1,
      borderBottomLeftRadius: 14,
      borderBottomRightRadius: 14,
    },
    lineupHeader: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: 4,
    },
    lineupChipsWrapper: {
      flex: 1,
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
      paddingVertical: 6,
    },
    lineupChipText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
    },
    lineupStateBadge: {
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    lineupStateBadgeText: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontWeight: '700',
      letterSpacing: 0.4,
    },
  });
}
