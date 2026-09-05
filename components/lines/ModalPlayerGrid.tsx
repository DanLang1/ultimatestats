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

// Generic labels grouped by role
type GenericColumnKey = 'handler' | 'cutter' | 'hybrid' | 'unassigned';

const GENERIC_COLUMN_LABELS: Record<GenericColumnKey, string> = {
  handler: 'Handler',
  cutter: 'Cutter',
  hybrid: 'Hybrid',
  unassigned: 'Unassigned',
};

const SECTION_KEYS: GenericColumnKey[] = ['handler', 'cutter', 'hybrid', 'unassigned'];

type MatchingSubgroupKey = 'mmp' | 'fmp' | 'unspecified';

const SUBGROUP_LABELS: Record<MatchingSubgroupKey, string> = {
  mmp: 'MMP',
  fmp: 'FMP',
  unspecified: 'Unspecified',
};

const SUBGROUP_KEYS: MatchingSubgroupKey[] = ['mmp', 'fmp', 'unspecified'];

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

function getSubgroupKey(player: Player): MatchingSubgroupKey {
  if (player.matchingType === 'mmp') return 'mmp';
  if (player.matchingType === 'fmp') return 'fmp';
  return 'unspecified';
}

function groupByMatchingType(players: Player[]): [MatchingSubgroupKey, Player[]][] {
  const playersBySubgroup = new Map<MatchingSubgroupKey, Player[]>();
  for (const player of players) {
    const key = getSubgroupKey(player);
    const subgroupPlayers = playersBySubgroup.get(key);
    if (subgroupPlayers) {
      subgroupPlayers.push(player);
    } else {
      playersBySubgroup.set(key, [player]);
    }
  }

  return SUBGROUP_KEYS.flatMap((key) => {
    const subgroupPlayers = playersBySubgroup.get(key);
    return subgroupPlayers == null ? [] : [[key, subgroupPlayers] as const];
  });
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

  return SECTION_KEYS.flatMap((role) => {
    const sectionPlayers = playersByRole.get(role);
    return sectionPlayers == null ? [] : [[role, sectionPlayers] as const];
  });
}

export function ModalPlayerGrid({
  roster,
  focusIds,
  focusLabel = 'Roster',
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
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  // Determine colors based on context
  const labelColor = useModalColorsProp ? palette.modalTextMuted : palette.textMuted;
  const emptyTextColor = useModalColorsProp ? palette.modalTextMuted : palette.textMuted;

  const playingTime = computePlayingTime(pointLines, currentPoint);
  const selectedSet = new Set(selectedIds);

  const sortedRoster = sortPlayers(roster, playingTime, sortDirection);
  const isMixedRoster =
    roster.some((player) => player.matchingType === 'mmp') &&
    roster.some((player) => player.matchingType === 'fmp');

  const renderPlayerChip = (player: Player) => {
    const subtitle = [
      playerStatusLabels?.get(player.id),
      showMatchingType ? getMatchingTypeLabel(player) : undefined,
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
        selectionCard
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

  const renderSectionChips = (sectionPlayers: Player[]) => {
    if (!isMixedRoster) {
      return renderTwoColumnChips(sectionPlayers);
    }
    const subgroups = groupByMatchingType(sectionPlayers);
    if (subgroups.length <= 1) {
      return renderTwoColumnChips(sectionPlayers);
    }
    return (
      <View style={styles.subgroups}>
        {subgroups.map(([subgroupKey, subgroupPlayers]) => (
          <View key={subgroupKey} style={styles.subgroup}>
            <ThemedText style={[styles.subgroupLabel, { color: labelColor }]}>
              {SUBGROUP_LABELS[subgroupKey]}
            </ThemedText>
            {renderTwoColumnChips(subgroupPlayers)}
          </View>
        ))}
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

  const focusedPlayers = sortedRoster.filter((player) => !focusIds || focusIds.has(player.id));
  const otherPlayers = sortedRoster.filter((player) => focusIds && !focusIds.has(player.id));
  const otherSelectedCount = otherPlayers.filter((player) => selectedSet.has(player.id)).length;
  const focusedSelectedCount = focusedPlayers.filter((player) => selectedSet.has(player.id)).length;
  const otherLabel = `Other players · ${otherPlayers.length}${otherSelectedCount > 0 ? ` · ${otherSelectedCount} selected` : ''}`;
  const renderRoleGroups = (players: Player[], groupKey: string) =>
    groupPlayersByRole(players).map(([role, sectionPlayers]) => (
      <View key={`${groupKey}-${role}`} collapsable={false} style={styles.section}>
        <ThemedText style={[styles.sectionLabel, { color: labelColor }]}>
          {GENERIC_COLUMN_LABELS[role]}
        </ThemedText>
        {renderSectionChips(sectionPlayers)}
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
      <View key="focused" collapsable={false} style={styles.sections}>
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
        <View key="other" collapsable={false} style={styles.sections}>
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

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    unavailableText: { fontSize: scaleBySizeClass(13, sizeClass), marginTop: 12 },
    sections: { gap: 16 },
    section: { gap: 7 },
    sectionLabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    subgroups: { gap: 10 },
    subgroup: { gap: 5 },
    subgroupLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
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
    splitColumnsRow: {
      flexDirection: 'row',
      gap: 6,
    },
    splitColumn: {
      flex: 1,
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
