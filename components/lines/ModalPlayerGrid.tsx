import { PlayerChip } from '@/components/ui/PlayerChip';
import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
import { computePlayingTime, formatPlayingTime } from '@/lib/lineUtils';
import { Player, PointLineRecord } from '@/lib/storage/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

function sortPlayers(
  players: Player[],
  playingTime: Map<string, number>,
  direction: SortDirection,
  selectedIds?: Set<string>,
): Player[] {
  return [...players].sort((a, b) => {
    // If selectedIds provided, sort selected players first
    if (selectedIds) {
      const aSelected = selectedIds.has(a.id);
      const bSelected = selectedIds.has(b.id);
      if (aSelected !== bSelected) {
        return aSelected ? -1 : 1;
      }
    }

    // Sort by playing time
    const aPoints = playingTime.get(a.id) ?? 0;
    const bPoints = playingTime.get(b.id) ?? 0;
    if (aPoints !== bPoints) {
      return direction === 'asc' ? aPoints - bPoints : bPoints - aPoints;
    }
    return a.name.localeCompare(b.name);
  });
}

export type SortDirection = 'asc' | 'desc';

export interface ModalPlayerGridProps {
  roster: Player[];
  pointLines: PointLineRecord[];
  selectedIds: string[];
  onTogglePlayer: (playerId: string) => void;
  sortDirection?: SortDirection;
  /** Use modal-appropriate colors for chips and labels */
  useModalColors?: boolean;
  /** Whether a game is currently active (shows pts played) */
  gameActive?: boolean;
  /** Sort selected players to top (use for preset selection, not manual selection) */
  sortSelectedFirst?: boolean;
  /** Change this value to trigger a re-sort (e.g., increment on preset selection) */
  sortKey?: number;
  /** Current point number — excludes in-progress point from playing time count */
  currentPoint?: number;
}

type ColumnKey =
  | 'mmp-handler'
  | 'mmp-cutter'
  | 'mmp-hybrid'
  | 'fmp-handler'
  | 'fmp-cutter'
  | 'fmp-hybrid'
  | 'unassigned';

// Generic labels for single-gender teams
type GenericColumnKey = 'handler' | 'cutter' | 'hybrid' | 'unassigned';

const MIXED_COLUMN_LABELS: Record<ColumnKey, string> = {
  'mmp-handler': 'M Handler',
  'mmp-cutter': 'M Cutter',
  'mmp-hybrid': 'M Hybrid',
  'fmp-handler': 'F Handler',
  'fmp-cutter': 'F Cutter',
  'fmp-hybrid': 'F Hybrid',
  unassigned: 'Unassigned',
};

const GENERIC_COLUMN_LABELS: Record<GenericColumnKey, string> = {
  handler: 'Handler',
  cutter: 'Cutter',
  hybrid: 'Hybrid',
  unassigned: 'Unassigned',
};

function getColumnKey(player: Player): ColumnKey {
  if (!player.matchingType || !player.role) {
    return 'unassigned';
  }
  return `${player.matchingType}-${player.role}` as ColumnKey;
}

function getGenericColumnKey(player: Player): GenericColumnKey {
  if (!player.role) {
    return 'unassigned';
  }
  return player.role;
}

export function ModalPlayerGrid({
  roster,
  pointLines,
  selectedIds,
  onTogglePlayer,
  sortDirection = 'asc',
  useModalColors: useModalColorsProp = true,
  gameActive = false,
  sortSelectedFirst = false,
  sortKey = 0,
  currentPoint,
}: ModalPlayerGridProps) {
  const { palette } = useTheme();
  const { isLandscape } = useLayout();
  const styles = baseStyles;

  // Determine colors based on context
  const labelColor = useModalColorsProp ? palette.modalTextMuted : palette.textMuted;
  const emptyTextColor = useModalColorsProp ? palette.modalTextMuted : palette.textMuted;

  const playingTime = computePlayingTime(pointLines, currentPoint);
  const selectedSet = new Set(selectedIds);

  // Use ref to store sorted roster - only re-sort when sortKey changes
  const sortedRosterRef = useRef<Player[]>([]);
  const lastSortKeyRef = useRef<number>(-1);

  if (sortKey !== lastSortKeyRef.current || sortedRosterRef.current.length === 0) {
    sortedRosterRef.current = sortPlayers(
      roster,
      playingTime,
      sortDirection,
      sortSelectedFirst ? selectedSet : undefined,
    );
    lastSortKeyRef.current = sortKey;
  }

  const sortedRoster = sortedRosterRef.current;

  // Group players by column
  const columns = new Map<ColumnKey, Player[]>();
  for (const player of sortedRoster) {
    const key = getColumnKey(player);
    if (!columns.has(key)) {
      columns.set(key, []);
    }
    columns.get(key)!.push(player);
  }

  const renderPlayerChip = (player: Player) => (
    <PlayerChip
      key={player.id}
      name={player.name}
      selected={selectedSet.has(player.id)}
      matchingType={player.matchingType}
      subtitle={gameActive ? formatPlayingTime(player.id, playingTime) : undefined}
      showCheckIcon
      compact
      useModalColors={useModalColorsProp}
      onPress={() => onTogglePlayer(player.id)}
    />
  );

  // Check which matching types exist in the roster
  const hasMmpPlayers = roster.some((p) => p.matchingType === 'mmp');
  const hasFmpPlayers = roster.some((p) => p.matchingType === 'fmp');
  const isMixedTeam = hasMmpPlayers && hasFmpPlayers;

  // For single-gender teams, group by role only
  const genericColumns = new Map<GenericColumnKey, Player[]>();
  if (!isMixedTeam) {
    for (const player of sortedRoster) {
      const key = getGenericColumnKey(player);
      if (!genericColumns.has(key)) {
        genericColumns.set(key, []);
      }
      genericColumns.get(key)!.push(player);
    }
  }

  const columnStyle = isLandscape ? styles.columnLandscape : styles.columnPortrait;

  const renderMixedColumn = (key: ColumnKey) => {
    const players = columns.get(key) ?? [];
    return (
      <View key={key} style={columnStyle}>
        <Text style={[styles.columnLabel, { color: labelColor }]}>{MIXED_COLUMN_LABELS[key]}</Text>
        <View style={styles.columnChips}>{players.map(renderPlayerChip)}</View>
      </View>
    );
  };

  const renderGenericColumn = (key: GenericColumnKey) => {
    const players = genericColumns.get(key) ?? [];
    return (
      <View key={key} style={columnStyle}>
        <Text style={[styles.columnLabel, { color: labelColor }]}>
          {GENERIC_COLUMN_LABELS[key]}
        </Text>
        <View style={styles.columnChips}>{players.map(renderPlayerChip)}</View>
      </View>
    );
  };

  // Render a single category split into two columns for compactness
  const renderSplitColumn = (players: Player[], label: string) => {
    const midpoint = Math.ceil(players.length / 2);
    const leftPlayers = players.slice(0, midpoint);
    const rightPlayers = players.slice(midpoint);

    return (
      <View style={styles.splitColumnWrapper}>
        <Text style={[styles.columnLabel, { color: labelColor }]}>{label}</Text>
        <View style={styles.splitColumnsRow}>
          <View style={styles.splitColumn}>{leftPlayers.map(renderPlayerChip)}</View>
          <View style={styles.splitColumn}>{rightPlayers.map(renderPlayerChip)}</View>
        </View>
      </View>
    );
  };

  if (roster.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="account-group-outline" size={40} color={emptyTextColor} />
        <Text style={[styles.emptyText, { color: emptyTextColor }]}>No active players</Text>
        <Text style={[styles.emptyHint, { color: emptyTextColor }]}>
          Add players in Edit Roster
        </Text>
      </View>
    );
  }

  // Single-gender team: show generic columns (only those with players)
  if (!isMixedTeam) {
    const activeKeys: GenericColumnKey[] = ['handler', 'cutter', 'hybrid', 'unassigned'];
    const activeGenericColumns = activeKeys.filter((k) => (genericColumns.get(k)?.length ?? 0) > 0);
    const isSingleColumn = activeGenericColumns.length === 1;

    // For single column, split into two columns for compactness
    if (isSingleColumn) {
      const key = activeGenericColumns[0];
      const players = genericColumns.get(key) ?? [];
      return (
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled>
          {renderSplitColumn(players, GENERIC_COLUMN_LABELS[key])}
        </ScrollView>
      );
    }

    return (
      <ScrollView
        key={isLandscape ? 'landscape' : 'portrait'}
        style={styles.container}
        showsVerticalScrollIndicator
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled>
        <View style={styles.multiColumn}>{activeGenericColumns.map(renderGenericColumn)}</View>
      </ScrollView>
    );
  }

  // Mixed team: show only columns with players
  const primaryKeys: ColumnKey[] = ['mmp-handler', 'fmp-handler', 'fmp-cutter', 'mmp-cutter'];
  const activePrimaryColumns = primaryKeys.filter((k) => (columns.get(k)?.length ?? 0) > 0);
  const isSinglePrimary = activePrimaryColumns.length === 1;

  const secondaryKeys: ColumnKey[] = ['mmp-hybrid', 'fmp-hybrid', 'unassigned'];
  const activeSecondaryColumns = secondaryKeys.filter((k) => (columns.get(k)?.length ?? 0) > 0);
  const isSingleSecondary = activeSecondaryColumns.length === 1;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator
      contentContainerStyle={styles.scrollContent}
      nestedScrollEnabled>
      {/* Main columns */}
      {activePrimaryColumns.length > 0 &&
        (isSinglePrimary ? (
          renderSplitColumn(
            columns.get(activePrimaryColumns[0]) ?? [],
            MIXED_COLUMN_LABELS[activePrimaryColumns[0]],
          )
        ) : (
          <View style={styles.multiColumn}>{activePrimaryColumns.map(renderMixedColumn)}</View>
        ))}

      {/* Secondary columns */}
      {activeSecondaryColumns.length > 0 &&
        (isSingleSecondary ? (
          <View style={styles.secondarySplitWrapper}>
            {renderSplitColumn(
              columns.get(activeSecondaryColumns[0]) ?? [],
              MIXED_COLUMN_LABELS[activeSecondaryColumns[0]],
            )}
          </View>
        ) : (
          <View style={[styles.multiColumn, styles.secondaryMargin]}>
            {activeSecondaryColumns.map(renderMixedColumn)}
          </View>
        ))}
    </ScrollView>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingVertical: 4,
    paddingBottom: 12,
  },
  multiColumn: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    rowGap: 12,
  },
  secondaryMargin: {
    marginTop: 14,
  },
  splitColumnWrapper: {
    gap: 5,
  },
  splitColumnsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  splitColumn: {
    flex: 1,
    gap: 6,
    alignItems: 'stretch',
  },
  secondarySplitWrapper: {
    marginTop: 14,
  },
  columnLandscape: {
    flex: 1,
    gap: 5,
  },
  columnPortrait: {
    flex: 1,
    minWidth: '45%',
    gap: 5,
  },
  columnLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  columnChips: {
    gap: 6,
    alignItems: 'stretch',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 13,
  },
});
