import TimelineInteractiveRow from '@/components/timeline/TimelineInteractiveRow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getPlayerMatchingType, getPlayerName } from '@/lib/playerUtils';
import { Player } from '@/lib/storage/types';
import { DisplayTurnover } from '@/lib/timelineUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TimelineTurnoverRowProps {
  turnover: DisplayTurnover;
  roster: Player[];
  mmpColor: string;
  fmpColor: string;
  relativeTime?: string;
  canEditTime: boolean;
  onEditTime: () => void;
  canLongPress: boolean;
  onLongPress: () => void;
}

export default function TimelineTurnoverRow({
  turnover,
  roster,
  mmpColor,
  fmpColor,
  relativeTime,
  canEditTime,
  onEditTime,
  canLongPress,
  onLongPress,
}: TimelineTurnoverRowProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const isOpponent = turnover.team === 'team2';
  const turnoverPlayerName = getPlayerName(roster, turnover.playerId);
  const turnoverPlayer2Name = getPlayerName(roster, turnover.player2Id ?? null);
  const turnoverMatchingType = getPlayerMatchingType(roster, turnover.playerId);
  const turnover2MatchingType = getPlayerMatchingType(roster, turnover.player2Id ?? null);

  const label =
    turnover.type === 'block'
      ? 'Block'
      : turnover.type === 'drop'
        ? 'Drop'
        : turnover.type === 'fiftyfifty'
          ? '50/50'
          : 'Throwaway';

  const bgColor = turnover.type === 'block' ? palette.success + '20' : palette.danger + '20';

  return (
    <TimelineInteractiveRow
      canTap={canEditTime}
      onTap={onEditTime}
      canLongPress={canLongPress}
      onLongPress={onLongPress}>
      <View
        style={[
          styles.eventRow,
          {
            backgroundColor: isOpponent
              ? turnover.type === 'block'
                ? palette.danger + '20'
                : palette.success + '20'
              : bgColor,
          },
          canLongPress && {
            borderColor: isOpponent
              ? turnover.type === 'block'
                ? palette.danger
                : palette.success
              : turnover.type === 'block'
                ? palette.success
                : palette.danger,
            borderWidth: 1,
          },
        ]}>
        <Text style={[styles.eventLabel, { color: palette.textInverse }]}>
          {isOpponent
            ? turnover.type === 'block'
              ? 'OPP BLOCK'
              : 'OPP TURN'
            : label.toUpperCase()}
        </Text>
        {!isOpponent && (
          <>
            {turnover.type === 'fiftyfifty' && turnoverPlayer2Name && (
              <Text style={[styles.eventLabel, { color: palette.textInverse, opacity: 0.7 }]}>
                Thr:
              </Text>
            )}
            <Text
              style={[
                styles.eventPlayer,
                {
                  color:
                    turnoverMatchingType === 'mmp'
                      ? mmpColor
                      : turnoverMatchingType === 'fmp'
                        ? fmpColor
                        : palette.textInverse,
                  flexShrink: turnover.type === 'fiftyfifty' && turnoverPlayer2Name ? 1 : 0,
                  maxWidth:
                    turnover.type === 'fiftyfifty' && turnoverPlayer2Name ? '40%' : undefined,
                },
              ]}
              numberOfLines={1}>
              {turnoverPlayerName || 'Unknown'}
            </Text>
          </>
        )}
        {turnover.type === 'fiftyfifty' && turnoverPlayer2Name && (
          <>
            <Text
              style={[
                styles.eventLabel,
                {
                  color: isOpponent ? palette.textMuted : palette.textInverse,
                  opacity: 0.7,
                },
              ]}>
              Drop:
            </Text>
            <Text
              style={[
                styles.eventPlayer,
                {
                  color: isOpponent
                    ? palette.textMuted
                    : turnover2MatchingType === 'mmp'
                      ? mmpColor
                      : turnover2MatchingType === 'fmp'
                        ? fmpColor
                        : palette.textInverse,
                  opacity: 0.9,
                  flexShrink: 1,
                  maxWidth: '40%',
                },
              ]}
              numberOfLines={1}>
              {turnoverPlayer2Name}
            </Text>
          </>
        )}
        {relativeTime && (
          <Text style={[styles.eventTimestamp, { color: palette.textMuted }]}>{relativeTime}</Text>
        )}
      </View>
    </TimelineInteractiveRow>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    eventLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    eventPlayer: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '500',
      maxWidth: 100,
      flexShrink: 1,
    },
    eventTimestamp: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '500',
      marginLeft: 4,
      opacity: 0.7,
    },
  });
}
