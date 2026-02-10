import { useTheme } from '@/context/ThemeContext';
import { getPlayerName } from '@/lib/playerUtils';
import {
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
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
}: StatsTableProps) {
  const { palette } = useTheme();
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: 'asc' | 'desc';
  }>({ key: 'plusMinus', direction: 'desc' });
  const [showLegend, setShowLegend] = useState(false);

  // Compute playing time stats if pointLines are available
  const playingTimeStats = pointLines?.length
    ? computePlayingTimeStats(pointLines, events, startingPossession ?? null, gameTo)
    : null;

  // Only show playing time columns if we have data
  const hasPlayingTimeData = playingTimeStats !== null && playingTimeStats.size > 0;

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
          size={12}
          color={palette.accent}
          style={{ marginLeft: 2 }}
        />
      );
    }
    return (
      <MaterialCommunityIcons
        name="unfold-more-horizontal"
        size={12}
        color={palette.textMuted}
        style={{ marginLeft: 2, opacity: 0.5 }}
      />
    );
  };

  return (
    <View>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>PLAYER STATS</Text>
          <TouchableOpacity onPress={() => setShowLegend((v) => !v)} hitSlop={8}>
            <MaterialCommunityIcons
              name={showLegend ? 'information' : 'information-outline'}
              size={16}
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
      <View style={[styles.tableContainer, { borderColor: palette.overlay10 }]}>
        {/* Table Header */}
        <View
          style={[
            styles.tableHeader,
            { backgroundColor: palette.overlay08, borderBottomColor: palette.overlay10 },
          ]}>
          <TouchableOpacity
            style={[
              styles.headerCell,
              styles.headerNameCell,
              styles.sortableHeader,
              sortConfig.key === 'name' && { backgroundColor: palette.overlay05 },
            ]}
            onPress={() => handleSort('name')}>
            <Text
              style={[
                styles.headerText,
                { color: sortConfig.key === 'name' ? palette.accent : palette.textMuted },
              ]}>
              PLAYER
            </Text>
            {renderSortIcon('name')}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerCell,
              styles.sortableHeader,
              sortConfig.key === 'plusMinus' && { backgroundColor: palette.overlay05 },
            ]}
            onPress={() => handleSort('plusMinus')}>
            <Text
              style={[
                styles.headerText,
                { color: sortConfig.key === 'plusMinus' ? palette.accent : palette.textMuted },
              ]}>
              +/-
            </Text>
            {renderSortIcon('plusMinus')}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerCell,
              styles.sortableHeader,
              sortConfig.key === 'goals' && { backgroundColor: palette.overlay05 },
            ]}
            onPress={() => handleSort('goals')}>
            <Text
              style={[
                styles.headerText,
                { color: sortConfig.key === 'goals' ? palette.accent : palette.textMuted },
              ]}>
              Goals
            </Text>
            {renderSortIcon('goals')}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerCell,
              styles.sortableHeader,
              sortConfig.key === 'assists' && { backgroundColor: palette.overlay05 },
            ]}
            onPress={() => handleSort('assists')}>
            <Text
              style={[
                styles.headerText,
                { color: sortConfig.key === 'assists' ? palette.accent : palette.textMuted },
              ]}>
              Assists
            </Text>
            {renderSortIcon('assists')}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerCell,
              styles.sortableHeader,
              sortConfig.key === 'blocks' && { backgroundColor: palette.overlay05 },
            ]}
            onPress={() => handleSort('blocks')}>
            <Text
              style={[
                styles.headerText,
                { color: sortConfig.key === 'blocks' ? palette.accent : palette.textMuted },
              ]}>
              Blocks
            </Text>
            {renderSortIcon('blocks')}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerCell,
              styles.sortableHeader,
              sortConfig.key === 'throwaways' && { backgroundColor: palette.overlay05 },
            ]}
            onPress={() => handleSort('throwaways')}>
            <Text
              style={[
                styles.headerText,
                { color: sortConfig.key === 'throwaways' ? palette.accent : palette.textMuted },
              ]}>
              T/A
            </Text>
            {renderSortIcon('throwaways')}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerCell,
              styles.sortableHeader,
              sortConfig.key === 'drops' && { backgroundColor: palette.overlay05 },
            ]}
            onPress={() => handleSort('drops')}>
            <Text
              style={[
                styles.headerText,
                { color: sortConfig.key === 'drops' ? palette.accent : palette.textMuted },
              ]}>
              Drops
            </Text>
            {renderSortIcon('drops')}
          </TouchableOpacity>
          {/* Playing Time Columns - only show if data exists */}
          {hasPlayingTimeData && (
            <>
              <TouchableOpacity
                style={[
                  styles.headerCell,
                  styles.sortableHeader,
                  sortConfig.key === 'oEfficiency' && { backgroundColor: palette.overlay05 },
                ]}
                onPress={() => handleSort('oEfficiency')}>
                <Text
                  style={[
                    styles.headerText,
                    {
                      color: sortConfig.key === 'oEfficiency' ? palette.accent : palette.textMuted,
                    },
                  ]}>
                  O-Eff
                </Text>
                {renderSortIcon('oEfficiency')}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.headerCell,
                  styles.sortableHeader,
                  sortConfig.key === 'dEfficiency' && { backgroundColor: palette.overlay05 },
                ]}
                onPress={() => handleSort('dEfficiency')}>
                <Text
                  style={[
                    styles.headerText,
                    {
                      color: sortConfig.key === 'dEfficiency' ? palette.accent : palette.textMuted,
                    },
                  ]}>
                  D-Eff
                </Text>
                {renderSortIcon('dEfficiency')}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.headerCell,
                  styles.sortableHeader,
                  sortConfig.key === 'pointsPlayed' && { backgroundColor: palette.overlay05 },
                ]}
                onPress={() => handleSort('pointsPlayed')}>
                <Text
                  style={[
                    styles.headerText,
                    {
                      color: sortConfig.key === 'pointsPlayed' ? palette.accent : palette.textMuted,
                    },
                  ]}>
                  PP
                </Text>
                {renderSortIcon('pointsPlayed')}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Table Rows */}
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
              {/* Playing Time Cells - only show if data exists */}
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 11,
    fontWeight: '700',
    minWidth: 32,
  },
  legendLabel: {
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tableContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
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
    fontSize: 10,
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
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  nameCell: {
    flex: 1.8,
    textAlign: 'left',
    fontSize: 13,
    fontWeight: '600',
  },
  headerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.6,
  },
  headerHintText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  plusMinusCell: {
    fontWeight: '800',
  },
});
