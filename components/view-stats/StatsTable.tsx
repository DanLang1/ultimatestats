import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getPlayerName } from '@/lib/playerUtils';
import {
  aggregatePlayingTimeStats,
  computePlayingTimeStats,
  formatEfficiency,
  PlayingTimeStats,
} from '@/lib/playingTimeStatsUtils';
import { computePlayerStats, PlayerStats } from '@/lib/statsUtils';
import { Player, PointLineRecord, SavedGame } from '@/lib/storage';
import { GameEvent } from '@/store/gameStore.types';
import { usePlayerStatsStore } from '@/store/playerStatsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SortKey =
  | 'name'
  | 'goals'
  | 'assists'
  | 'blocks'
  | 'throwaways'
  | 'drops'
  | 'plusMinus'
  | 'callahans'
  | 'pointsPlayed'
  | 'oEfficiency'
  | 'dEfficiency';

interface StatsTableProps {
  playerStats: ReturnType<typeof computePlayerStats>;
  events: GameEvent[];
  team: 'team1' | 'team2';
  roster?: Player[];
  games?: SavedGame[];
  pointLines?: PointLineRecord[];
  startingPossession?: 'team1' | 'team2' | null;
  gameTo?: number;
  autoHalftimeEnabled?: boolean;
}

export default function StatsTable({
  playerStats,
  events,
  team,
  roster,
  games,
  pointLines,
  startingPossession,
  gameTo = 15,
  autoHalftimeEnabled = true,
}: StatsTableProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: 'asc' | 'desc';
  }>({ key: 'plusMinus', direction: 'desc' });
  const [showLegend, setShowLegend] = useState(false);

  // Compute playing time stats if pointLines are available
  const playingTimeStats =
    games && games.length > 0
      ? aggregatePlayingTimeStats(games)
      : pointLines?.length
        ? computePlayingTimeStats(pointLines, events, startingPossession ?? null, gameTo, {
            autoHalftimeEnabled,
          })
        : null;

  // Only show playing time columns if we have data
  const hasPlayingTimeData = playingTimeStats !== null && playingTimeStats.size > 0;
  const styles = createStyles(isLandscape, hasPlayingTimeData, sizeClass);

  // Helper to get playing time stats for a player by ID
  const getPlayingTimeStats = (playerId: string): PlayingTimeStats | null => {
    return playingTimeStats?.get(playerId) ?? null;
  };

  const { openPlayerStats } = usePlayerStatsStore();

  const handlePlayerPress = (playerId: string) => {
    openPlayerStats(
      playerId,
      events,
      team,
      roster || undefined,
      games,
      pointLines,
      startingPossession,
      gameTo,
      autoHalftimeEnabled,
    );
    router.push('/PlayerStats');
  };

  // Merge in players who have playing time but no stat events
  const playerStatsIds = new Set(playerStats.map((p) => p.id));
  const playingTimeOnlyPlayers: ReturnType<typeof computePlayerStats> = [];
  if (playingTimeStats) {
    for (const playerId of playingTimeStats.keys()) {
      if (!playerStatsIds.has(playerId)) {
        playingTimeOnlyPlayers.push({
          id: playerId,
          name: getPlayerName(roster, playerId) ?? playerId,
          goals: 0,
          assists: 0,
          blocks: 0,
          throwaways: 0,
          drops: 0,
          plusMinus: 0,
          callahans: 0,
        } satisfies PlayerStats);
      }
    }
  }
  const allPlayerStats = [...playerStats, ...playingTimeOnlyPlayers];

  const sortedStats = [...allPlayerStats].sort((a, b) => {
    // Handle playing time keys
    if (
      sortConfig.key === 'pointsPlayed' ||
      sortConfig.key === 'oEfficiency' ||
      sortConfig.key === 'dEfficiency'
    ) {
      const aStats = getPlayingTimeStats(a.id);
      const bStats = getPlayingTimeStats(b.id);
      const aValue = aStats?.[sortConfig.key] ?? 0;
      const bValue = bStats?.[sortConfig.key] ?? 0;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    }

    // Handle regular player stats keys
    const aValue = a[sortConfig.key as keyof typeof a];
    const bValue = b[sortConfig.key as keyof typeof b];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === 'desc' ? 'asc' : 'desc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const renderSortIcon = (key: string) => {
    const isActive = sortConfig.key === key;
    if (isActive) {
      return (
        <MaterialCommunityIcons
          name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'}
          size={scaleBySizeClass(12, sizeClass)}
          color={palette.accent}
          style={{ marginLeft: 2 }}
        />
      );
    }
    return (
      <MaterialCommunityIcons
        name="unfold-more-horizontal"
        size={scaleBySizeClass(12, sizeClass)}
        color={palette.textMuted}
        style={{ marginLeft: 2, opacity: 0.5 }}
      />
    );
  };

  const baseColumns: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'PLAYER' },
    { key: 'plusMinus', label: '+/-' },
    { key: 'goals', label: 'Goals' },
    { key: 'assists', label: 'Assists' },
    { key: 'blocks', label: 'Blocks' },
    { key: 'throwaways', label: 'T/A' },
    { key: 'drops', label: 'Drops' },
  ];
  const playingTimeColumns: { key: SortKey; label: string }[] = [
    { key: 'oEfficiency', label: 'O-Eff' },
    { key: 'dEfficiency', label: 'D-Eff' },
    { key: 'pointsPlayed', label: 'PP' },
  ];
  const visibleColumns = hasPlayingTimeData ? [...baseColumns, ...playingTimeColumns] : baseColumns;

  const getPortraitColumnWidth = (key: SortKey) => {
    if (key === 'name') return 140;
    if (key === 'oEfficiency' || key === 'dEfficiency' || key === 'pointsPlayed') return 88;
    return 78;
  };

  const portraitTableMinWidth = visibleColumns.reduce(
    (totalWidth, column) => totalWidth + getPortraitColumnWidth(column.key),
    0,
  );

  return (
    <View>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>PLAYER STATS</Text>
          <TouchableOpacity onPress={() => setShowLegend((v) => !v)} hitSlop={8}>
            <MaterialCommunityIcons
              name={showLegend ? 'information' : 'information-outline'}
              size={scaleBySizeClass(16, sizeClass)}
              color={showLegend ? palette.accent : palette.textMuted}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.headerHint}>
          <Text style={[styles.headerHintText, { color: palette.textMuted }]}>
            Tap player for details
          </Text>
        </View>
      </View>
      {showLegend && (
        <View
          style={[
            styles.legendContainer,
            { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
          ]}>
          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <Text style={[styles.legendAbbr, { color: palette.textInverse }]}>+/-</Text>
              <Text style={[styles.legendLabel, { color: palette.textMuted }]}>Plus/Minus</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendAbbr, { color: palette.textInverse }]}>T/A</Text>
              <Text style={[styles.legendLabel, { color: palette.textMuted }]}>Throwaways</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendAbbr, { color: palette.textInverse }]}>O-Eff</Text>
              <Text style={[styles.legendLabel, { color: palette.textMuted }]}>
                Off. Efficiency
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendAbbr, { color: palette.textInverse }]}>D-Eff</Text>
              <Text style={[styles.legendLabel, { color: palette.textMuted }]}>
                Def. Efficiency
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendAbbr, { color: palette.textInverse }]}>PP</Text>
              <Text style={[styles.legendLabel, { color: palette.textMuted }]}>Points Played</Text>
            </View>
          </View>
        </View>
      )}
      {isLandscape ? (
        <View style={[styles.tableContainer, { borderColor: palette.overlay10 }]}>
          <View
            style={[
              styles.tableHeader,
              { backgroundColor: palette.overlay08, borderBottomColor: palette.overlay10 },
            ]}>
            {visibleColumns.map((column) => (
              <TouchableOpacity
                key={column.key}
                style={[
                  styles.headerCell,
                  column.key === 'name' && styles.headerNameCell,
                  styles.sortableHeader,
                  sortConfig.key === column.key && { backgroundColor: palette.overlay05 },
                ]}
                onPress={() => handleSort(column.key)}>
                <Text
                  style={[
                    styles.headerText,
                    { color: sortConfig.key === column.key ? palette.accent : palette.textMuted },
                  ]}>
                  {column.label}
                </Text>
                {renderSortIcon(column.key)}
              </TouchableOpacity>
            ))}
          </View>

          {sortedStats.map((player, index) => {
            const pStats = getPlayingTimeStats(player.id);
            return (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.tableRow,
                  { borderBottomColor: palette.overlay10 },
                  index === sortedStats.length - 1 && { borderBottomWidth: 0 },
                  index % 2 === 1 && { backgroundColor: palette.overlay02 },
                ]}
                onPress={() => handlePlayerPress(player.id)}>
                <Text style={[styles.cell, styles.nameCell, { color: palette.textInverse }]}>
                  {player.name}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    styles.plusMinusCell,
                    { color: palette.textInverse },
                    player.plusMinus > 0 && { color: palette.success },
                    player.plusMinus < 0 && { color: palette.danger },
                  ]}>
                  {player.plusMinus > 0 ? '+' : ''}
                  {player.plusMinus}
                </Text>
                <Text style={[styles.cell, { color: palette.textInverse }]}>
                  {player.goals || '-'}
                </Text>
                <Text style={[styles.cell, { color: palette.textInverse }]}>
                  {player.assists || '-'}
                </Text>
                <Text style={[styles.cell, { color: palette.textInverse }]}>
                  {player.blocks || '-'}
                </Text>
                <Text style={[styles.cell, { color: palette.textInverse }]}>
                  {player.throwaways || '-'}
                </Text>
                <Text style={[styles.cell, { color: palette.textInverse }]}>
                  {player.drops || '-'}
                </Text>
                {hasPlayingTimeData && (
                  <>
                    <Text
                      style={[
                        styles.cell,
                        { color: palette.textInverse },
                        (pStats?.oPoints ?? 0) > 0 &&
                          (pStats?.oEfficiency ?? 0) >= 0.6 && {
                            color: palette.success,
                          },
                        (pStats?.oPoints ?? 0) > 0 &&
                          (pStats?.oEfficiency ?? 0) <= 0.4 && {
                            color: palette.danger,
                          },
                      ]}>
                      {pStats && (pStats.oPoints ?? 0) > 0
                        ? formatEfficiency(pStats.oEfficiency)
                        : '-'}
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        { color: palette.textInverse },
                        (pStats?.dPoints ?? 0) > 0 &&
                          (pStats?.dEfficiency ?? 0) >= 0.25 && {
                            color: palette.success,
                          },
                        (pStats?.dPoints ?? 0) > 0 &&
                          (pStats?.dEfficiency ?? 0) < 0.25 && {
                            color: palette.danger,
                          },
                      ]}>
                      {pStats && (pStats.dPoints ?? 0) > 0
                        ? formatEfficiency(pStats.dEfficiency)
                        : '-'}
                    </Text>
                    <Text style={[styles.cell, { color: palette.textInverse }]}>
                      {pStats?.pointsPlayed ?? '-'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View
            style={[
              styles.portraitTableContainer,
              { borderColor: palette.overlay10, minWidth: portraitTableMinWidth },
            ]}>
            <View
              style={[
                styles.portraitTableHeader,
                { backgroundColor: palette.overlay08, borderBottomColor: palette.overlay10 },
              ]}>
              {visibleColumns.map((column) => (
                <TouchableOpacity
                  key={column.key}
                  style={[
                    styles.portraitHeaderCell,
                    { width: getPortraitColumnWidth(column.key) },
                    column.key === 'name' && styles.portraitNameHeaderCell,
                    sortConfig.key === column.key && { backgroundColor: palette.overlay05 },
                  ]}
                  onPress={() => handleSort(column.key)}>
                  <View style={styles.sortableHeader}>
                    <Text
                      style={[
                        styles.headerText,
                        {
                          color: sortConfig.key === column.key ? palette.accent : palette.textMuted,
                        },
                        column.key === 'name' && styles.portraitNameHeaderText,
                      ]}>
                      {column.label}
                    </Text>
                    {renderSortIcon(column.key)}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {sortedStats.map((player, index) => {
              const pStats = getPlayingTimeStats(player.id);
              return (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.portraitTableRow,
                    { borderBottomColor: palette.overlay10 },
                    index === sortedStats.length - 1 && { borderBottomWidth: 0 },
                    index % 2 === 1 && { backgroundColor: palette.overlay02 },
                  ]}
                  onPress={() => handlePlayerPress(player.id)}>
                  {visibleColumns.map((column) => {
                    if (column.key === 'name') {
                      return (
                        <Text
                          key={`${player.id}-${column.key}`}
                          style={[
                            styles.portraitCell,
                            styles.portraitNameCell,
                            {
                              width: getPortraitColumnWidth(column.key),
                              color: palette.textInverse,
                            },
                          ]}>
                          {player.name}
                        </Text>
                      );
                    }
                    if (column.key === 'plusMinus') {
                      return (
                        <Text
                          key={`${player.id}-${column.key}`}
                          style={[
                            styles.portraitCell,
                            styles.plusMinusCell,
                            {
                              width: getPortraitColumnWidth(column.key),
                              color: palette.textInverse,
                            },
                            player.plusMinus > 0 && { color: palette.success },
                            player.plusMinus < 0 && { color: palette.danger },
                          ]}>
                          {player.plusMinus > 0 ? '+' : ''}
                          {player.plusMinus}
                        </Text>
                      );
                    }
                    if (column.key === 'goals') {
                      return (
                        <Text
                          key={`${player.id}-${column.key}`}
                          style={[
                            styles.portraitCell,
                            {
                              width: getPortraitColumnWidth(column.key),
                              color: palette.textInverse,
                            },
                          ]}>
                          {player.goals || '-'}
                        </Text>
                      );
                    }
                    if (column.key === 'assists') {
                      return (
                        <Text
                          key={`${player.id}-${column.key}`}
                          style={[
                            styles.portraitCell,
                            {
                              width: getPortraitColumnWidth(column.key),
                              color: palette.textInverse,
                            },
                          ]}>
                          {player.assists || '-'}
                        </Text>
                      );
                    }
                    if (column.key === 'blocks') {
                      return (
                        <Text
                          key={`${player.id}-${column.key}`}
                          style={[
                            styles.portraitCell,
                            {
                              width: getPortraitColumnWidth(column.key),
                              color: palette.textInverse,
                            },
                          ]}>
                          {player.blocks || '-'}
                        </Text>
                      );
                    }
                    if (column.key === 'throwaways') {
                      return (
                        <Text
                          key={`${player.id}-${column.key}`}
                          style={[
                            styles.portraitCell,
                            {
                              width: getPortraitColumnWidth(column.key),
                              color: palette.textInverse,
                            },
                          ]}>
                          {player.throwaways || '-'}
                        </Text>
                      );
                    }
                    if (column.key === 'drops') {
                      return (
                        <Text
                          key={`${player.id}-${column.key}`}
                          style={[
                            styles.portraitCell,
                            {
                              width: getPortraitColumnWidth(column.key),
                              color: palette.textInverse,
                            },
                          ]}>
                          {player.drops || '-'}
                        </Text>
                      );
                    }
                    if (column.key === 'oEfficiency') {
                      return (
                        <Text
                          key={`${player.id}-${column.key}`}
                          style={[
                            styles.portraitCell,
                            {
                              width: getPortraitColumnWidth(column.key),
                              color: palette.textInverse,
                            },
                            (pStats?.oPoints ?? 0) > 0 &&
                              (pStats?.oEfficiency ?? 0) >= 0.6 && {
                                color: palette.success,
                              },
                            (pStats?.oPoints ?? 0) > 0 &&
                              (pStats?.oEfficiency ?? 0) <= 0.4 && {
                                color: palette.danger,
                              },
                          ]}>
                          {pStats && (pStats.oPoints ?? 0) > 0
                            ? formatEfficiency(pStats.oEfficiency)
                            : '-'}
                        </Text>
                      );
                    }
                    if (column.key === 'dEfficiency') {
                      return (
                        <Text
                          key={`${player.id}-${column.key}`}
                          style={[
                            styles.portraitCell,
                            {
                              width: getPortraitColumnWidth(column.key),
                              color: palette.textInverse,
                            },
                            (pStats?.dPoints ?? 0) > 0 &&
                              (pStats?.dEfficiency ?? 0) >= 0.25 && {
                                color: palette.success,
                              },
                            (pStats?.dPoints ?? 0) > 0 &&
                              (pStats?.dEfficiency ?? 0) < 0.25 && {
                                color: palette.danger,
                              },
                          ]}>
                          {pStats && (pStats.dPoints ?? 0) > 0
                            ? formatEfficiency(pStats.dEfficiency)
                            : '-'}
                        </Text>
                      );
                    }
                    return (
                      <Text
                        key={`${player.id}-${column.key}`}
                        style={[
                          styles.portraitCell,
                          { width: getPortraitColumnWidth(column.key), color: palette.textInverse },
                        ]}>
                        {pStats?.pointsPlayed ?? '-'}
                      </Text>
                    );
                  })}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(isLandscape: boolean, hasPlayingTimeData: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendContainer: {
      borderRadius: 8,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 10,
    },
    legendGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 20,
      rowGap: 6,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '45%',
      gap: 6,
    },
    legendAbbr: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '700',
      minWidth: 32,
    },
    legendLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '700',
      letterSpacing: 1,
    },
    tableContainer: {
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      minWidth: isLandscape ? undefined : hasPlayingTimeData ? 680 : 480,
    },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
    },
    headerCell: {
      flex: 1,
      paddingVertical: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerNameCell: {
      flex: 1.8,
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      paddingLeft: 12,
      paddingRight: 8,
    },
    headerText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sortableHeader: {
      flexDirection: 'row',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: 'transparent',
      alignItems: 'center',
      borderBottomWidth: 1,
    },
    cell: {
      flex: 1,
      fontSize: scaleBySizeClass(13, sizeClass),
      textAlign: 'center',
      fontWeight: '500',
    },
    nameCell: {
      flex: 1.8,
      textAlign: 'left',
      fontSize: scaleBySizeClass(13, sizeClass),
      fontWeight: '600',
    },
    portraitTableContainer: {
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
    },
    portraitTableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
    },
    portraitHeaderCell: {
      paddingVertical: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    portraitNameHeaderCell: {
      alignItems: 'flex-start',
      paddingLeft: 12,
      paddingRight: 8,
    },
    portraitNameHeaderText: {
      textAlign: 'left',
    },
    portraitTableRow: {
      flexDirection: 'row',
      paddingVertical: 14,
      alignItems: 'center',
      borderBottomWidth: 1,
    },
    portraitCell: {
      fontSize: scaleBySizeClass(13, sizeClass),
      textAlign: 'center',
      fontWeight: '500',
    },
    portraitNameCell: {
      textAlign: 'left',
      fontSize: scaleBySizeClass(13, sizeClass),
      fontWeight: '600',
      paddingLeft: 12,
      paddingRight: 8,
    },
    headerHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      opacity: 0.6,
    },
    headerHintText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '600',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    plusMinusCell: {
      fontWeight: '800',
    },
  });
}
