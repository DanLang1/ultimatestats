import { QuickEditPlayerRow } from '@/components/roster/QuickEditPlayerRow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MatchingType, Player, PlayerRole } from '@/lib/storage/types';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface QuickEditPlayerListProps {
  roster: Player[];
  onEditPlayer: (player: Player) => void;
  onSetPlayerActive: (playerId: string, isActive: boolean) => void;
  onSetPlayerMatching: (playerId: string, matchingType: MatchingType | null) => void;
  onSetPlayerRole: (playerId: string, role: PlayerRole | null) => void;
  sizeClass?: SizeClass;
}

export function QuickEditPlayerList({
  roster,
  onEditPlayer,
  onSetPlayerActive,
  onSetPlayerMatching,
  onSetPlayerRole,
  sizeClass,
}: QuickEditPlayerListProps) {
  const layout = useLayout();
  const isLandscape = layout.isLandscape;
  const resolvedSizeClass = sizeClass ?? layout.sizeClass;
  const styles = createStyles(resolvedSizeClass);
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
      key={player.id}
      player={player}
      isLandscape={isLandscape}
      sizeClass={resolvedSizeClass}
      onEditPlayer={() => onEditPlayer(player)}
      onSetActive={(isActive) => onSetPlayerActive(player.id, isActive)}
      onSetMatching={(matchingType) => onSetPlayerMatching(player.id, matchingType)}
      onSetRole={(role) => onSetPlayerRole(player.id, role)}
    />
  );

  return (
    <View style={styles.list}>
      {matchingGroups.map((group) =>
        group.players.length > 0 ? (
          <View key={group.key} style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <Text style={[styles.groupLabel, { color: palette.textMuted }]}>{group.label}</Text>
              <Text style={[styles.groupCount, { color: palette.textMuted }]}>
                {group.players.length}
              </Text>
            </View>
            <View style={styles.groupRows}>{group.players.map(renderPlayerRow)}</View>
          </View>
        ) : null,
      )}

      {inactivePlayers.length > 0 && (
        <View style={styles.groupSection}>
          <View style={styles.groupHeader}>
            <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Inactive</Text>
            <Text style={[styles.groupCount, { color: palette.textMuted }]}>
              {inactivePlayers.length}
            </Text>
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
      fontWeight: '700',
      letterSpacing: scaleBySizeClass(0.6, sizeClass, { rounding: 'none' }),
      textTransform: 'uppercase',
    },
    groupCount: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
    },
    groupRows: {
      gap: scaleBySizeClass(10, sizeClass),
    },
  });
}
