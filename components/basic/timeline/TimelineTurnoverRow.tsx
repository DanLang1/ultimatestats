import { StyleSheet, View } from 'react-native';

import TimelineInteractiveRow from '@/components/basic/timeline/TimelineInteractiveRow';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { DisplayTurnover } from '@/lib/basic/timelineUtils';
import { getPlayerMatchingType, getPlayerName } from '@/lib/playerUtils';
import { MatchingType, Player } from '@/lib/storage/types';
import { TurnoverType } from '@/store/basic/gameStore.types';
import { Fonts, Palette } from '@/theme/theme';

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

  const label = getTurnoverLabel(turnover.type);
  const eventBgColor = getEventBackgroundColor(turnover.type, isOpponent, palette);
  const longPressBorderColor = getLongPressBorderColor(turnover.type, isOpponent, palette);
  const displayLabel = getDisplayLabel(turnover.type, isOpponent, label);
  const playerColor = getPlayerColor(turnoverMatchingType, mmpColor, fmpColor, palette.textInverse);
  const player2Color = isOpponent
    ? palette.textMuted
    : getPlayerColor(turnover2MatchingType, mmpColor, fmpColor, palette.textInverse);

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

function getTurnoverLabel(type: TurnoverType): string {
  if (type === 'block') return 'Block';
  if (type === 'drop') return 'Drop';
  if (type === 'fiftyfifty') return '50/50';
  return 'Throwaway';
}

function getDisplayLabel(type: TurnoverType, isOpponent: boolean, label: string): string {
  if (!isOpponent) return label.toUpperCase();
  if (type === 'block') return 'OPP BLOCK';
  return 'OPP TURN';
}

function getEventBackgroundColor(
  type: TurnoverType,
  isOpponent: boolean,
  palette: Palette,
): string {
  const ownColor = type === 'block' ? palette.success : palette.danger;
  const opponentColor = type === 'block' ? palette.danger : palette.success;
  return `${isOpponent ? opponentColor : ownColor}20`;
}

function getLongPressBorderColor(
  type: TurnoverType,
  isOpponent: boolean,
  palette: Palette,
): string {
  if (isOpponent) return type === 'block' ? palette.danger : palette.success;
  return type === 'block' ? palette.success : palette.danger;
}

function getPlayerColor(
  matchingType: MatchingType | null,
  mmpColor: string,
  fmpColor: string,
  fallbackColor: string,
): string {
  if (matchingType === 'mmp') return mmpColor;
  if (matchingType === 'fmp') return fmpColor;
  return fallbackColor;
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
