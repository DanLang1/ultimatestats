import React from 'react';
import { StyleSheet, View } from 'react-native';

import { QuickEditPlayerRow } from '@/components/roster/QuickEditPlayerRow';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MatchingType, Player, PlayerRole } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';

interface QuickEditPlayerListProps {
  roster: Player[];
  onEditPlayer: (player: Player) => void;
  onSetPlayerActive: (playerId: string, isActive: boolean) => void;
  onSetPlayerMatching: (playerId: string, matchingType: MatchingType | null) => void;
  onSetPlayerNumber: (playerId: string, number: string) => Promise<boolean>;
  onSetPlayerRole: (playerId: string, role: PlayerRole | null) => void;
}

export function QuickEditPlayerList({
  roster,
  onEditPlayer,
  onSetPlayerActive,
  onSetPlayerMatching,
  onSetPlayerNumber,
  onSetPlayerRole,
}: QuickEditPlayerListProps) {
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { palette } = useTheme();

  const activePlayers = roster.filter((player) => player.isActive);
  const inactivePlayers = roster.filter((player) => !player.isActive);

  const matchingGroups: { key: string; label: string; players: Player[] }[] = [
    {
      key: 'fmp',
      label: 'FMP',
      players: activePlayers.filter((player) => player.matchingType === 'fmp'),
    },
    {
      key: 'mmp',
      label: 'MMP',
      players: activePlayers.filter((player) => player.matchingType === 'mmp'),
    },
    {
      key: 'unset',
      label: 'Unset',
      players: activePlayers.filter((player) => player.matchingType === null),
    },
  ];

  const renderPlayerRow = (player: Player) => (
    <QuickEditPlayerRow
      key={`${player.id}-${player.number ?? ''}`}
      player={player}
      isLandscape={isLandscape}
      onEditPlayer={() => onEditPlayer(player)}
      onSetActive={(isActive) => onSetPlayerActive(player.id, isActive)}
      onSetMatching={(matchingType) => onSetPlayerMatching(player.id, matchingType)}
      onSetNumber={(number) => onSetPlayerNumber(player.id, number)}
      onSetRole={(role) => onSetPlayerRole(player.id, role)}
    />
  );

  return (
    <View style={styles.list}>
      {matchingGroups.map((group) =>
        group.players.length > 0 ? (
          <View key={group.key} style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <ThemedText style={[styles.groupLabel, { color: palette.textMuted }]}>
                {group.label}
              </ThemedText>
              <ThemedText style={[styles.groupCount, { color: palette.textMuted }]}>
                {group.players.length}
              </ThemedText>
            </View>
            <View style={styles.groupRows}>{group.players.map(renderPlayerRow)}</View>
          </View>
        ) : null,
      )}

      {inactivePlayers.length > 0 && (
        <View style={styles.groupSection}>
          <View style={styles.groupHeader}>
            <ThemedText style={[styles.groupLabel, { color: palette.textMuted }]}>
              Inactive
            </ThemedText>
            <ThemedText style={[styles.groupCount, { color: palette.textMuted }]}>
              {inactivePlayers.length}
            </ThemedText>
          </View>
          <View style={styles.groupRows}>{inactivePlayers.map(renderPlayerRow)}</View>
        </View>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    list: {
      gap: scaleBySizeClass(10, sizeClass),
    },
    groupSection: {
      gap: scaleBySizeClass(8, sizeClass),
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: scaleBySizeClass(2, sizeClass),
    },
    groupLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(0.6, sizeClass, { rounding: 'none' }),
      textTransform: 'uppercase',
    },
    groupCount: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    groupRows: {
      gap: scaleBySizeClass(10, sizeClass),
    },
  });
}
