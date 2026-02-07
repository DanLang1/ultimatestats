import { useTheme } from '@/context/ThemeContext';
import {
  computePlayingTimeStats,
  formatEfficiency,
  PlayingTimeStats,
} from '@/lib/playingTimeStatsUtils';
import { computePlayerStats } from '@/lib/statsUtils';
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

  // Compute playing time stats if pointLines are available
  const playingTimeStats = pointLines?.length
    ? computePlayingTimeStats(pointLines, events, startingPossession ?? null, gameTo, roster)
    : null;

  // Only show playing time columns if we have data
  const hasPlayingTimeData = playingTimeStats !== null && playingTimeStats.size > 0;

  // Helper to get playing time stats for a player
  const getPlayingTimeStats = (playerName: string): PlayingTimeStats | null => {
    return playingTimeStats?.get(playerName) ?? null;
  };

  const { openPlayerStats } = usePlayerStatsStore();

  const handlePlayerPress = (playerName: string) => {
    openPlayerStats(
      playerName,
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

  const sortedStats = [...playerStats].sort((a, b) => {
    // Handle playing time keys
    if (
      sortConfig.key === 'pointsPlayed' ||
      sortConfig.key === 'oEfficiency' ||
      sortConfig.key === 'dEfficiency'
    ) {
      const aStats = getPlayingTimeStats(a.name);
      const bStats = getPlayingTimeStats(b.name);
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
        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>PLAYER STATS</Text>
        <View style={styles.headerHint}>
          <Text style={[styles.headerHintText, { color: palette.textMuted }]}>
            Tap player for details
          </Text>
        </View>
      </View>
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
          {/* Playing Time Columns - only show if data exists */}
          {hasPlayingTimeData && (
            <>
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
                  Pts
                </Text>
                {renderSortIcon('pointsPlayed')}
              </TouchableOpacity>
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
            </>
          )}
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
              styles.headerThrowawaysCell,
              styles.sortableHeader,
              sortConfig.key === 'throwaways' && { backgroundColor: palette.overlay05 },
            ]}
            onPress={() => handleSort('throwaways')}>
            <Text
              style={[
                styles.headerText,
                { color: sortConfig.key === 'throwaways' ? palette.accent : palette.textMuted },
              ]}>
              Throwaways
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
        </View>

        {/* Table Rows */}
        {sortedStats.map((player, index) => (
          <TouchableOpacity
            key={player.name}
            style={[
              styles.tableRow,
              { borderBottomColor: palette.overlay10 },
              index === sortedStats.length - 1 && { borderBottomWidth: 0 },
              index % 2 === 1 && { backgroundColor: palette.overlay02 },
            ]}
            onPress={() => handlePlayerPress(player.name)}>
            <Text style={[styles.cell, styles.nameCell, { color: palette.textInverse }]}>
              {player.name}
            </Text>
            {/* Playing Time Cells - only show if data exists */}
            {hasPlayingTimeData && (
              <>
                <Text style={[styles.cell, { color: palette.textInverse }]}>
                  {getPlayingTimeStats(player.name)?.pointsPlayed ?? '-'}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    { color: palette.textInverse },
                    (getPlayingTimeStats(player.name)?.oEfficiency ?? 0) >= 0.6 && {
                      color: palette.success,
                    },
                    (getPlayingTimeStats(player.name)?.oEfficiency ?? 0) <= 0.4 &&
                      (getPlayingTimeStats(player.name)?.oPoints ?? 0) > 0 && {
                        color: palette.danger,
                      },
                  ]}>
                  {getPlayingTimeStats(player.name)
                    ? formatEfficiency(getPlayingTimeStats(player.name)!.oEfficiency)
                    : '-'}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    { color: palette.textInverse },
                    (getPlayingTimeStats(player.name)?.dEfficiency ?? 0) >= 0.6 && {
                      color: palette.success,
                    },
                    (getPlayingTimeStats(player.name)?.dEfficiency ?? 0) <= 0.4 &&
                      (getPlayingTimeStats(player.name)?.dPoints ?? 0) > 0 && {
                        color: palette.danger,
                      },
                  ]}>
                  {getPlayingTimeStats(player.name)
                    ? formatEfficiency(getPlayingTimeStats(player.name)!.dEfficiency)
                    : '-'}
                </Text>
              </>
            )}
            <Text style={[styles.cell, { color: palette.textInverse }]}>{player.goals || '-'}</Text>
            <Text style={[styles.cell, { color: palette.textInverse }]}>
              {player.assists || '-'}
            </Text>
            <Text style={[styles.cell, { color: palette.textInverse }]}>
              {player.blocks || '-'}
            </Text>
            <Text style={[styles.cell, styles.throwawaysCell, { color: palette.textInverse }]}>
              {player.throwaways || '-'}
            </Text>
            <Text style={[styles.cell, { color: palette.textInverse }]}>{player.drops || '-'}</Text>
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
          </TouchableOpacity>
        ))}
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
  headerThrowawaysCell: {
    flex: 1.5,
  },
  throwawaysCell: {
    flex: 1.5,
  },
  plusMinusCell: {
    fontWeight: '800',
  },
});
