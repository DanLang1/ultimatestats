import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { PlayerChip, PlayerChipRestriction } from '@/components/ui/PlayerChip';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { computePlayingTime, formatPlayingTime, sortByPlayerNumber } from '@/lib/lineUtils';
import { Player, PointLineRecord } from '@/lib/storage/types';
import type { LinePlayerSortOrder } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

const EMPTY_UNAVAILABLE_NAMES: string[] = [];

function sortPlayers(
  players: Player[],
  playingTime: Map<string, number>,
  direction: SortDirection,
): Player[] {
  if (direction === 'number') {
    return sortByPlayerNumber(players);
  }
  return [...players].sort((a, b) => {
    if (direction === 'points') {
      const aPoints = playingTime.get(a.id) ?? 0;
      const bPoints = playingTime.get(b.id) ?? 0;
      if (aPoints !== bPoints) return bPoints - aPoints;
    }
    return a.name.localeCompare(b.name);
  });
}

export type SortDirection = LinePlayerSortOrder;

export interface ModalPlayerGridProps {
  roster: Player[];
  focusIds?: ReadonlySet<string>;
  focusLabel?: string;
  balanced?: boolean;
  showMatchingType?: boolean;
  unavailableNames?: string[];
  showOtherPlayers?: boolean;
  onToggleOtherPlayers?: () => void;
  pointLines: PointLineRecord[];
  selectedIds: string[];
  onTogglePlayer: (playerId: string) => void;
  sortDirection?: SortDirection;
  /** Use modal-appropriate colors for chips and labels */
  useModalColors?: boolean;
  /** Whether a game is currently active (shows pts played) */
  gameActive?: boolean;
  /** Current point number — excludes in-progress point from playing time count */
  currentPoint?: number;
  playerRestrictions?: ReadonlyMap<string, PlayerChipRestriction>;
  playerStatusLabels?: ReadonlyMap<string, string>;
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

const BALANCED_SECTION_KEYS: GenericColumnKey[] = ['handler', 'cutter', 'hybrid', 'unassigned'];

function getColumnKey(player: Player): ColumnKey {
  if (!player.matchingType || !player.role) {
    return 'unassigned';
  }
  return `${player.matchingType}-${player.role}`;
}

function getGenericColumnKey(player: Player): GenericColumnKey {
  if (!player.role) {
    return 'unassigned';
  }
  return player.role;
}

function getMatchingTypeLabel(player: Player): string | undefined {
  if (player.matchingType === 'mmp') return 'MMP';
  if (player.matchingType === 'fmp') return 'FMP';
  return undefined;
}

function groupPlayersByRole(players: Player[]): [GenericColumnKey, Player[]][] {
  const playersByRole = new Map<GenericColumnKey, Player[]>();
  for (const player of players) {
    const key = getGenericColumnKey(player);
    const sectionPlayers = playersByRole.get(key);
    if (sectionPlayers) {
      sectionPlayers.push(player);
    } else {
      playersByRole.set(key, [player]);
    }
  }

  return BALANCED_SECTION_KEYS.flatMap((role) => {
    const sectionPlayers = playersByRole.get(role);
    return sectionPlayers == null ? [] : [[role, sectionPlayers] as const];
  });
}

export function ModalPlayerGrid({
  roster,
  focusIds,
  focusLabel = 'Roster',
  balanced = false,
  showMatchingType = false,
  unavailableNames = EMPTY_UNAVAILABLE_NAMES,
  showOtherPlayers = false,
  onToggleOtherPlayers,
  pointLines,
  selectedIds,
  onTogglePlayer,
  sortDirection = 'alpha',
  useModalColors: useModalColorsProp = true,
  gameActive = false,
  currentPoint,
  playerRestrictions,
  playerStatusLabels,
}: ModalPlayerGridProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  // Determine colors based on context
  const labelColor = useModalColorsProp ? palette.modalTextMuted : palette.textMuted;
  const emptyTextColor = useModalColorsProp ? palette.modalTextMuted : palette.textMuted;

  const playingTime = computePlayingTime(pointLines, currentPoint);
  const selectedSet = new Set(selectedIds);

  const sortedRoster = sortPlayers(roster, playingTime, sortDirection);

  const renderPlayerChip = (player: Player) => {
    const subtitle = [
      playerStatusLabels?.get(player.id),
      balanced && showMatchingType ? getMatchingTypeLabel(player) : undefined,
      gameActive ? formatPlayingTime(player.id, playingTime) : undefined,
    ]
      .filter((value): value is string => value != null)
      .join(' · ');

    return (
      <PlayerChip
        key={player.id}
        name={player.name}
        number={player.number}
        selected={selectedSet.has(player.id)}
        matchingType={player.matchingType}
        subtitle={subtitle || undefined}
        compact={!balanced}
        selectionCard={balanced}
        restriction={playerRestrictions?.get(player.id)}
        useModalColors={useModalColorsProp}
        onPress={() => onTogglePlayer(player.id)}
      />
    );
  };

  const renderTwoColumnChips = (players: Player[]) => {
    const midpoint = Math.ceil(players.length / 2);
    return (
      <View style={styles.splitColumnsRow}>
        <View style={styles.splitColumn}>{players.slice(0, midpoint).map(renderPlayerChip)}</View>
        <View style={styles.splitColumn}>{players.slice(midpoint).map(renderPlayerChip)}</View>
      </View>
    );
  };

  if (roster.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="account-group-outline"
          size={scaleBySizeClass(40, sizeClass)}
          color={emptyTextColor}
        />
        <ThemedText style={[styles.emptyText, { color: emptyTextColor }]}>
          No active players
        </ThemedText>
        <ThemedText style={[styles.emptyHint, { color: emptyTextColor }]}>
          Add players in Edit Roster
        </ThemedText>
      </View>
    );
  }

  if (balanced) {
    const focusedPlayers = sortedRoster.filter((player) => !focusIds || focusIds.has(player.id));
    const otherPlayers = sortedRoster.filter((player) => focusIds && !focusIds.has(player.id));
    const otherSelectedCount = otherPlayers.filter((player) => selectedSet.has(player.id)).length;
    const focusedSelectedCount = focusedPlayers.filter((player) =>
      selectedSet.has(player.id),
    ).length;
    const otherLabel = `Other players · ${otherPlayers.length}${otherSelectedCount > 0 ? ` · ${otherSelectedCount} selected` : ''}`;
    const renderRoleGroups = (players: Player[], groupKey: string) =>
      groupPlayersByRole(players).map(([role, sectionPlayers]) => (
        <View key={`${groupKey}-${role}`} collapsable={false} style={styles.balancedSection}>
          <ThemedText style={[styles.balancedSectionLabel, { color: labelColor }]}>
            {GENERIC_COLUMN_LABELS[role]}
          </ThemedText>
          {renderTwoColumnChips(sectionPlayers)}
        </View>
      ));

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeading}>
          <ThemedText style={[styles.focusLabel, { color: labelColor }]}>{focusLabel}</ThemedText>
          <ThemedText style={[styles.focusCount, { color: labelColor }]}>
            {focusedSelectedCount} of {focusedPlayers.length} selected
          </ThemedText>
        </View>
        <View key="focused" collapsable={false} style={styles.balancedSections}>
          {renderRoleGroups(focusedPlayers, 'focused')}
        </View>
        {otherPlayers.length > 0 && (
          <Pressable
            testID="line-select-show-all-players"
            accessibilityLabel={otherLabel}
            accessibilityRole="button"
            accessibilityState={{ expanded: showOtherPlayers }}
            onPress={onToggleOtherPlayers}
            style={({ pressed }) => [
              styles.otherPlayers,
              { borderColor: palette.border },
              pressed && { opacity: 0.7 },
            ]}>
            <ThemedText style={[styles.focusLabel, { color: labelColor }]}>{otherLabel}</ThemedText>
            <MaterialCommunityIcons
              name={showOtherPlayers ? 'chevron-up' : 'chevron-down'}
              size={scaleBySizeClass(20, sizeClass)}
              color={labelColor}
            />
          </Pressable>
        )}
        {showOtherPlayers && (
          <View key="other" collapsable={false} style={styles.balancedSections}>
            {renderRoleGroups(otherPlayers, 'other')}
          </View>
        )}
        {unavailableNames.length > 0 && (
          <ThemedText style={[styles.unavailableText, { color: labelColor }]}>
            Unavailable for this line: {unavailableNames.join(', ')}
          </ThemedText>
        )}
      </ScrollView>
    );
  }

  const columns = new Map<ColumnKey, Player[]>();
  for (const player of sortedRoster) {
    const key = getColumnKey(player);
    const columnPlayers = columns.get(key);
    if (columnPlayers) {
      columnPlayers.push(player);
    } else {
      columns.set(key, [player]);
    }
  }

  const isMixedTeam =
    roster.some((player) => player.matchingType === 'mmp') &&
    roster.some((player) => player.matchingType === 'fmp');

  const genericColumns = new Map<GenericColumnKey, Player[]>();
  if (!isMixedTeam) {
    for (const player of sortedRoster) {
      const key = getGenericColumnKey(player);
      const columnPlayers = genericColumns.get(key);
      if (columnPlayers) {
        columnPlayers.push(player);
      } else {
        genericColumns.set(key, [player]);
      }
    }
  }

  const columnStyle = isLandscape ? styles.columnLandscape : styles.columnPortrait;

  const renderMixedColumn = (key: ColumnKey) => {
    const players = columns.get(key) ?? [];
    return (
      <View key={key} style={columnStyle}>
        <ThemedText style={[styles.columnLabel, { color: labelColor }]}>
          {MIXED_COLUMN_LABELS[key]}
        </ThemedText>
        <View style={styles.columnChips}>{players.map(renderPlayerChip)}</View>
      </View>
    );
  };

  const renderGenericColumn = (key: GenericColumnKey) => {
    const players = genericColumns.get(key) ?? [];
    return (
      <View key={key} style={columnStyle}>
        <ThemedText style={[styles.columnLabel, { color: labelColor }]}>
          {GENERIC_COLUMN_LABELS[key]}
        </ThemedText>
        <View style={styles.columnChips}>{players.map(renderPlayerChip)}</View>
      </View>
    );
  };

  const renderSplitColumn = (players: Player[], label: string) => (
    <View style={styles.splitColumnWrapper}>
      <ThemedText style={[styles.columnLabel, { color: labelColor }]}>{label}</ThemedText>
      {renderTwoColumnChips(players)}
    </View>
  );

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

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    unavailableText: { fontSize: scaleBySizeClass(13, sizeClass), marginTop: 12 },
    balancedSections: { gap: 16 },
    balancedSection: { gap: 7 },
    balancedSectionLabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    sectionHeading: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 6,
      marginBottom: 12,
    },
    focusLabel: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
      flexShrink: 1,
    },
    focusCount: { fontSize: scaleBySizeClass(12, sizeClass) },
    otherPlayers: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      marginVertical: 14,
    },
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
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.bold,
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
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    emptyHint: {
      fontSize: scaleBySizeClass(13, sizeClass),
    },
  });
}
