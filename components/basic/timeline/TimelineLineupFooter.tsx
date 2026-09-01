import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { buildTimelineLineupEntries } from '@/lib/basic/timelineUtils';
import { getPlayerMatchingType, getPlayerName } from '@/lib/playerUtils';
import { Player, PointLineRecord } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';

interface TimelineLineupFooterProps {
  playerIds: string[];
  pointRecords: PointLineRecord[];
  roster: Player[];
  mmpColor: string;
  fmpColor: string;
  pointNumber: number;
  onEdit?: () => void;
}

export default function TimelineLineupFooter({
  playerIds,
  pointRecords,
  roster,
  mmpColor,
  fmpColor,
  pointNumber,
  onEdit,
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
          let chipLabelColor: string;
          if (matchType === 'mmp') {
            chipLabelColor = mmpColor;
          } else if (matchType === 'fmp') {
            chipLabelColor = fmpColor;
          } else {
            chipLabelColor = palette.textInverse;
          }

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
              <ThemedText style={[styles.lineupChipText, { color: chipLabelColor }]}>
                {getPlayerName(roster, playerId) ?? playerId}
              </ThemedText>
              {isSubIn && (
                <View
                  style={[
                    styles.lineupStateBadge,
                    {
                      backgroundColor: palette.warning,
                    },
                  ]}>
                  <ThemedText
                    style={[styles.lineupStateBadgeText, { color: palette.textOnAccent }]}>
                    SUB
                  </ThemedText>
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
                  <ThemedText
                    style={[styles.lineupStateBadgeText, { color: palette.textOnAccent }]}>
                    INJ
                  </ThemedText>
                </View>
              )}
            </View>
          );
        })}
      </View>
      {onEdit && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit point ${pointNumber} line`}
          testID={`edit-point-line-${pointNumber}`}
          hitSlop={8}
          onPress={onEdit}
          style={({ pressed }) => [
            styles.editButton,
            {
              backgroundColor: palette.accentOverlay10,
              borderColor: palette.accent,
            },
            pressed && styles.editButtonPressed,
          ]}>
          <MaterialCommunityIcons
            name="pencil-outline"
            size={scaleBySizeClass(14, sizeClass)}
            color={palette.accent}
          />
          <ThemedText style={[styles.editButtonText, { color: palette.accent }]}>EDIT</ThemedText>
        </Pressable>
      )}
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
      fontFamily: Fonts.semiBold,
    },
    lineupStateBadge: {
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    lineupStateBadgeText: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.4,
    },
    editButton: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: 4,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    editButtonPressed: {
      opacity: 0.7,
    },
    editButtonText: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
    },
  });
}
