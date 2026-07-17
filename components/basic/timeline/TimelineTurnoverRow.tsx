import React from 'react';
import { StyleSheet, View } from 'react-native';

import TimelineInteractiveRow from '@/components/basic/timeline/TimelineInteractiveRow';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { DisplayTurnover } from '@/lib/basic/timelineUtils';
import { getPlayerMatchingType, getPlayerName } from '@/lib/playerUtils';
import { Player } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';

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

  let label: string;
  if (turnover.type === 'block') {
    label = 'Block';
  } else if (turnover.type === 'drop') {
    label = 'Drop';
  } else if (turnover.type === 'fiftyfifty') {
    label = '50/50';
  } else {
    label = 'Throwaway';
  }

  const bgColor = turnover.type === 'block' ? palette.success + '20' : palette.danger + '20';

  let eventBgColor: string;
  if (isOpponent) {
    eventBgColor = turnover.type === 'block' ? palette.danger + '20' : palette.success + '20';
  } else {
    eventBgColor = bgColor;
  }

  let longPressBorderColor: string;
  if (isOpponent) {
    longPressBorderColor = turnover.type === 'block' ? palette.danger : palette.success;
  } else {
    longPressBorderColor = turnover.type === 'block' ? palette.success : palette.danger;
  }

  let displayLabel: string;
  if (isOpponent) {
    displayLabel = turnover.type === 'block' ? 'OPP BLOCK' : 'OPP TURN';
  } else {
    displayLabel = label.toUpperCase();
  }

  let playerColor: string;
  if (turnoverMatchingType === 'mmp') {
    playerColor = mmpColor;
  } else if (turnoverMatchingType === 'fmp') {
    playerColor = fmpColor;
  } else {
    playerColor = palette.textInverse;
  }

  let player2Color: string;
  if (isOpponent) {
    player2Color = palette.textMuted;
  } else if (turnover2MatchingType === 'mmp') {
    player2Color = mmpColor;
  } else if (turnover2MatchingType === 'fmp') {
    player2Color = fmpColor;
  } else {
    player2Color = palette.textInverse;
  }

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
            backgroundColor: eventBgColor,
          },
          canLongPress && {
            borderColor: longPressBorderColor,
            borderWidth: 1,
          },
        ]}>
        <ThemedText style={[styles.eventLabel, { color: palette.textInverse }]}>
          {displayLabel}
        </ThemedText>
        {!isOpponent && (
          <>
            {turnover.type === 'fiftyfifty' && turnoverPlayer2Name && (
              <ThemedText style={[styles.eventLabel, { color: palette.textInverse, opacity: 0.7 }]}>
                Thr:
              </ThemedText>
            )}
            <ThemedText
              style={[
                styles.eventPlayer,
                {
                  color: playerColor,
                  flexShrink: turnover.type === 'fiftyfifty' && turnoverPlayer2Name ? 1 : 0,
                  maxWidth:
                    turnover.type === 'fiftyfifty' && turnoverPlayer2Name ? '40%' : undefined,
                },
              ]}
              numberOfLines={1}>
              {turnoverPlayerName || 'Unknown'}
            </ThemedText>
          </>
        )}
        {turnover.type === 'fiftyfifty' && turnoverPlayer2Name && (
          <>
            <ThemedText
              style={[
                styles.eventLabel,
                {
                  color: isOpponent ? palette.textMuted : palette.textInverse,
                  opacity: 0.7,
                },
              ]}>
              Drop:
            </ThemedText>
            <ThemedText
              style={[
                styles.eventPlayer,
                {
                  color: player2Color,
                  opacity: 0.9,
                  flexShrink: 1,
                  maxWidth: '40%',
                },
              ]}
              numberOfLines={1}>
              {turnoverPlayer2Name}
            </ThemedText>
          </>
        )}
        {relativeTime && (
          <ThemedText style={[styles.eventTimestamp, { color: palette.textMuted }]}>
            {relativeTime}
          </ThemedText>
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
      fontFamily: Fonts.bold,
      letterSpacing: 0.3,
    },
    eventPlayer: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      maxWidth: 100,
      flexShrink: 1,
    },
    eventTimestamp: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      marginLeft: 4,
      opacity: 0.7,
    },
  });
}
