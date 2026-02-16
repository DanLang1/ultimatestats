import { QuickEditPlayerRow } from '@/components/roster/QuickEditPlayerRow';
import { useTheme } from '@/context/ThemeContext';
import { MatchingType, Player, PlayerRole } from '@/lib/storage/types';
import { useLayout } from '@/hooks/useLayout';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface QuickEditPlayerListProps {
  roster: Player[];
  onEditPlayer: (player: Player) => void;
  onSetPlayerActive: (playerId: string, isActive: boolean) => void;
  onSetPlayerMatching: (playerId: string, matchingType: MatchingType | null) => void;
  onSetPlayerRole: (playerId: string, role: PlayerRole | null) => void;
}

export function QuickEditPlayerList({
  roster,
  onEditPlayer,
  onSetPlayerActive,
  onSetPlayerMatching,
  onSetPlayerRole,
}: QuickEditPlayerListProps) {
  const { isLandscape } = useLayout();
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

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  groupSection: {
    gap: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  groupCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  groupRows: {
    gap: 10,
  },
});
