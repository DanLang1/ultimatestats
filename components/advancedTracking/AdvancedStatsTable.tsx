import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { AdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { formatEfficiency } from '@/lib/playingTimeStatsUtils';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

type SortKey = keyof AdvancedPlayerStats | 'name';
type StatGroupKey = 'core' | 'throwing' | 'touches' | 'points';

interface AdvancedStatsTableProps {
  playerStats: AdvancedPlayerStats[];
  participantNames: Map<string, string>;
  onPlayerPress?: (participantId: string) => void;
}

type ColumnDef = { key: SortKey; label: string; width?: number };
type StatGroup = { key: StatGroupKey; label: string; columns: ColumnDef[] };

const NAME_COLUMN: ColumnDef = { key: 'name', label: 'PLAYER' };
const NAME_COLUMN_MIN_WIDTH = 92;
const NAME_COLUMN_MAX_WIDTH = 140;
const NAME_COLUMN_HORIZONTAL_PADDING = 24;
const NAME_COLUMN_CHARACTER_WIDTH = 10;

const STAT_GROUPS: StatGroup[] = [
  {
    key: 'core',
    label: 'Core',
    columns: [
      { key: 'plusMinus', label: '+/-', width: 58 },
      { key: 'goals', label: 'Goals', width: 58 },
      { key: 'assists', label: 'Ast', width: 58 },
      { key: 'blocks', label: 'Blk', width: 58 },
      { key: 'throwaways', label: 'T/A', width: 58 },
      { key: 'drops', label: 'Drp', width: 58 },
      { key: 'stalls', label: 'Stl', width: 58 },
      { key: 'stallsConceded', label: 'Stld', width: 58 },
    ],
  },
  {
    key: 'throwing',
    label: 'Throw',
    columns: [
      { key: 'completions', label: 'Cmp', width: 58 },
      { key: 'throwAttempts', label: 'Att', width: 58 },
      { key: 'completionPct', label: 'Cmp%', width: 68 },
      { key: 'assists', label: 'Ast', width: 58 },
      { key: 'hockeyAssists', label: 'HA', width: 58 },
      { key: 'throwaways', label: 'T/A', width: 58 },
    ],
  },
  {
    key: 'touches',
    label: 'Touch',
    columns: [
      { key: 'totalTouches', label: 'Tch', width: 58 },
      { key: 'receptions', label: 'Rec', width: 58 },
      { key: 'completions', label: 'Cmp', width: 58 },
      { key: 'throwAttempts', label: 'Att', width: 58 },
      { key: 'pulls', label: 'Pls', width: 58 },
      { key: 'blocks', label: 'Blk', width: 58 },
    ],
  },
  {
    key: 'points',
    label: 'Points',
    columns: [
      { key: 'oEfficiency', label: 'O-Eff', width: 72 },
      { key: 'dEfficiency', label: 'D-Eff', width: 72 },
      { key: 'pointsPlayed', label: 'PP', width: 58 },
      { key: 'oPoints', label: 'O-Pts', width: 66 },
      { key: 'dPoints', label: 'D-Pts', width: 66 },
      { key: 'plusMinus', label: '+/-', width: 58 },
    ],
  },
];

const LEGEND_ITEMS: { abbr: string; label: string }[] = [
  { abbr: '+/-', label: 'Plus/Minus' },
  { abbr: 'HA', label: 'Hockey Assist' },
  { abbr: 'T/A', label: 'Throwaway' },
  { abbr: 'Drp', label: 'Drop' },
  { abbr: 'Stl', label: 'Stall Forced' },
  { abbr: 'Stld', label: 'Stalled Out' },
  { abbr: 'Cmp', label: 'Completions' },
  { abbr: 'Att', label: 'Throw Attempts' },
  { abbr: 'Cmp%', label: 'Completion %' },
  { abbr: 'Rec', label: 'Receptions' },
  { abbr: 'Tch', label: 'Total Touches' },
  { abbr: 'Pls', label: 'Pulls' },
  { abbr: 'O-Eff', label: 'Off. Efficiency' },
  { abbr: 'D-Eff', label: 'Def. Efficiency' },
  { abbr: 'PP', label: 'Points Played' },
  { abbr: 'O-Pts', label: 'O-Points' },
  { abbr: 'D-Pts', label: 'D-Points' },
];

function getCellValue(stats: AdvancedPlayerStats, key: SortKey): number | null {
  if (key === 'name') return null;
  const v = stats[key as keyof AdvancedPlayerStats];
  return typeof v === 'number' ? v : null;
}

function formatCell(stats: AdvancedPlayerStats, key: SortKey): string {
  if (key === 'name') return '';
  if (key === 'completionPct') {
    return stats.completionPct != null ? `${Math.round(stats.completionPct * 100)}%` : '-';
  }
  if (key === 'oEfficiency') {
    return stats.oPoints > 0 ? formatEfficiency(stats.oEfficiency ?? 0) : '-';
  }
  if (key === 'dEfficiency') {
    return stats.dPoints > 0 ? formatEfficiency(stats.dEfficiency ?? 0) : '-';
  }
  const v = getCellValue(stats, key);
  return v != null && v !== 0 ? String(v) : '-';
}

function getStatGroup(key: StatGroupKey): StatGroup {
  const group = STAT_GROUPS.find((item) => item.key === key);
  if (group) return group;
  return STAT_GROUPS[0];
}

function hasColumn(columns: ColumnDef[], key: SortKey): boolean {
  return columns.some((column) => column.key === key);
}

function getNameColumnWidth(names: string[]): number {
  const longestNameLength = names.reduce((max, name) => Math.max(max, name.trim().length), 0);
  const contentWidth = longestNameLength * NAME_COLUMN_CHARACTER_WIDTH;
  const desiredWidth = contentWidth + NAME_COLUMN_HORIZONTAL_PADDING;
  return Math.min(NAME_COLUMN_MAX_WIDTH, Math.max(NAME_COLUMN_MIN_WIDTH, desiredWidth));
}

export default function AdvancedStatsTable({
  playerStats,
  participantNames,
  onPlayerPress,
}: AdvancedStatsTableProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'plusMinus',
    direction: 'desc',
  });
  const [activeGroupKey, setActiveGroupKey] = useState<StatGroupKey>('core');
  const [showLegend, setShowLegend] = useState(false);
  const styles = createStyles(isLandscape, sizeClass);

  const getName = (id: string) => participantNames.get(id) ?? id;
  const activeGroup = getStatGroup(activeGroupKey);
  const visibleStatColumns = activeGroup.columns;
  const playerNames = playerStats.map((stats) => getName(stats.participantId));
  const nameColumnWidth = getNameColumnWidth(playerNames);

  const sorted = [...playerStats].sort((a, b) => {
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    if (sortConfig.key === 'name') {
      return dir * getName(a.participantId).localeCompare(getName(b.participantId));
    }
    const aVal = getCellValue(a, sortConfig.key) ?? 0;
    const bVal = getCellValue(b, sortConfig.key) ?? 0;
    return dir * (aVal - bVal);
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((c) => ({
      key,
      direction: c.key === key && c.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleGroupPress = (key: StatGroupKey) => {
    const nextGroup = getStatGroup(key);
    setActiveGroupKey(key);
    setSortConfig((current) => {
      if (current.key === 'name' || hasColumn(nextGroup.columns, current.key)) return current;
      return { key: nextGroup.columns[0].key, direction: 'desc' };
    });
  };

  const renderSortIcon = (key: SortKey) => {
    const isActive = sortConfig.key === key;

    let icon: keyof typeof MaterialCommunityIcons.glyphMap;
    if (!isActive) {
      icon = 'unfold-more-horizontal';
    } else {
      icon = sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down';
    }

    return (
      <MaterialCommunityIcons
        name={icon}
        size={scaleBySizeClass(12, sizeClass)}
        color={isActive ? palette.accent : palette.textMuted}
        style={{ marginLeft: 2, opacity: isActive ? 1 : 0.5 }}
      />
    );
  };

  const plusMinusColor = (v: number) => {
    if (v > 0) return palette.success;
    if (v < 0) return palette.danger;
    return palette.textInverse;
  };

  const oEffColor = (stats: AdvancedPlayerStats) => {
    if (stats.oPoints === 0) return palette.textInverse;
    const v = stats.oEfficiency ?? 0;
    if (v >= 0.6) return palette.success;
    if (v <= 0.4) return palette.danger;
    return palette.textInverse;
  };

  const dEffColor = (stats: AdvancedPlayerStats) => {
    if (stats.dPoints === 0) return palette.textInverse;
    const v = stats.dEfficiency ?? 0;
    if (v >= 0.25) return palette.success;
    return palette.danger;
  };

  const getCellColor = (stats: AdvancedPlayerStats, key: SortKey): string => {
    if (key === 'plusMinus') return plusMinusColor(stats.plusMinus);
    if (key === 'oEfficiency') return oEffColor(stats);
    if (key === 'dEfficiency') return dEffColor(stats);
    return palette.textInverse;
  };

  const scrollableMinWidth = visibleStatColumns.reduce((sum, c) => sum + (c.width ?? 58), 0);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            PLAYER STATS
          </ThemedText>
          <Pressable onPress={() => setShowLegend((v) => !v)} hitSlop={8}>
            <MaterialCommunityIcons
              name={showLegend ? 'information' : 'information-outline'}
              size={scaleBySizeClass(16, sizeClass)}
              color={showLegend ? palette.accent : palette.textMuted}
            />
          </Pressable>
        </View>
        <View style={styles.headerHint}>
          <ThemedText style={[styles.headerHintText, { color: palette.textMuted }]}>
            Tap row for player
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.groupControl,
          { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
        ]}>
        {STAT_GROUPS.map((group) => {
          const isActive = activeGroupKey === group.key;
          return (
            <Pressable
              key={group.key}
              onPress={() => handleGroupPress(group.key)}
              style={[styles.groupButton, isActive && { backgroundColor: palette.accent }]}>
              <ThemedText
                style={[
                  styles.groupButtonText,
                  { color: palette.textMuted },
                  isActive && { color: palette.textOnAccent },
                ]}
                numberOfLines={1}>
                {group.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {showLegend && (
        <View
          style={[
            styles.legendContainer,
            { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
          ]}>
          <View style={styles.legendGrid}>
            {LEGEND_ITEMS.map((item) => (
              <View key={item.abbr} style={styles.legendItem}>
                <ThemedText style={[styles.legendAbbr, { color: palette.textInverse }]}>
                  {item.abbr}
                </ThemedText>
                <ThemedText style={[styles.legendLabel, { color: palette.textMuted }]}>
                  {item.label}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}

      <View
        style={[styles.tableContainer, { borderColor: palette.overlay10, flexDirection: 'row' }]}>
        {/* Fixed name column */}
        <View>
          <View
            style={[
              styles.tableHeader,
              { backgroundColor: palette.overlay08, borderBottomColor: palette.overlay10 },
            ]}>
            <Pressable
              style={[
                styles.headerCell,
                styles.headerNameCell,
                { width: nameColumnWidth },
                sortConfig.key === 'name' && { backgroundColor: palette.overlay05 },
              ]}
              onPress={() => handleSort('name')}>
              <View style={styles.sortableHeader}>
                <ThemedText
                  style={[
                    styles.headerText,
                    {
                      color: sortConfig.key === 'name' ? palette.accent : palette.textMuted,
                    },
                  ]}>
                  {NAME_COLUMN.label}
                </ThemedText>
                {renderSortIcon('name')}
              </View>
            </Pressable>
          </View>
          {sorted.map((stats, index) => (
            <Pressable
              key={stats.participantId}
              testID={`advanced-stats-row-${getName(stats.participantId).toLowerCase()}`}
              onPress={() => onPlayerPress?.(stats.participantId)}
              disabled={!onPlayerPress}
              style={[
                styles.tableRow,
                { borderBottomColor: palette.overlay10 },
                index === sorted.length - 1 && { borderBottomWidth: 0 },
                index % 2 === 1 && { backgroundColor: palette.overlay02 },
              ]}>
              <ThemedText
                style={[
                  styles.cell,
                  styles.nameCell,
                  {
                    width: nameColumnWidth,
                    color: onPlayerPress ? palette.accent : palette.textInverse,
                  },
                ]}
                numberOfLines={1}>
                {getName(stats.participantId)}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Scrollable stats columns */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          style={styles.statsScroll}
          contentContainerStyle={styles.statsScrollContent}>
          <View style={[styles.statsColumns, { minWidth: scrollableMinWidth }]}>
            <View
              style={[
                styles.tableHeader,
                { backgroundColor: palette.overlay08, borderBottomColor: palette.overlay10 },
              ]}>
              {visibleStatColumns.map((col) => (
                <Pressable
                  key={String(col.key)}
                  style={[
                    styles.headerCell,
                    { width: col.width ?? 58 },
                    sortConfig.key === col.key && { backgroundColor: palette.overlay05 },
                  ]}
                  onPress={() => handleSort(col.key)}>
                  <View style={styles.sortableHeader}>
                    <ThemedText
                      style={[
                        styles.headerText,
                        {
                          color: sortConfig.key === col.key ? palette.accent : palette.textMuted,
                        },
                      ]}>
                      {col.label}
                    </ThemedText>
                    {renderSortIcon(col.key)}
                  </View>
                </Pressable>
              ))}
            </View>
            {sorted.map((stats, index) => (
              <Pressable
                key={stats.participantId}
                onPress={() => onPlayerPress?.(stats.participantId)}
                disabled={!onPlayerPress}
                style={[
                  styles.tableRow,
                  { borderBottomColor: palette.overlay10 },
                  index === sorted.length - 1 && { borderBottomWidth: 0 },
                  index % 2 === 1 && { backgroundColor: palette.overlay02 },
                ]}>
                {visibleStatColumns.map((col) => {
                  const color = getCellColor(stats, col.key);
                  const text = formatCell(stats, col.key);
                  return (
                    <ThemedText
                      key={String(col.key)}
                      style={[
                        styles.cell,
                        { width: col.width ?? 58, color },
                        col.key === 'plusMinus' && styles.plusMinusCell,
                      ]}>
                      {col.key === 'plusMinus' && stats.plusMinus > 0
                        ? `+${stats.plusMinus}`
                        : text}
                    </ThemedText>
                  );
                })}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
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
    headerHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      opacity: 0.6,
    },
    headerHintText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
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
      fontFamily: Fonts.bold,
      minWidth: 36,
    },
    legendLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
    groupControl: {
      flexDirection: 'row',
      borderRadius: 8,
      borderWidth: 1,
      padding: 3,
      marginBottom: 10,
      gap: 3,
    },
    groupButton: {
      flex: 1,
      minHeight: 32,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    groupButtonText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
    },
    tableContainer: {
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
    },
    statsScroll: {
      flex: 1,
    },
    statsScrollContent: {
      flexGrow: 1,
    },
    statsColumns: {
      flexGrow: 1,
    },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
    },
    headerCell: {
      paddingVertical: 12,
      paddingHorizontal: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerNameCell: {
      alignItems: 'flex-start',
      paddingLeft: 12,
      paddingRight: 8,
    },
    headerText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.extraBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sortableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 14,
      alignItems: 'center',
      borderBottomWidth: 1,
      backgroundColor: 'transparent',
    },
    cell: {
      fontSize: scaleBySizeClass(13, sizeClass),
      textAlign: 'center',
      fontFamily: Fonts.semiBold,
      paddingHorizontal: 4,
    },
    nameCell: {
      textAlign: 'left',
      paddingLeft: 12,
      paddingRight: 8,
    },
    plusMinusCell: {
      fontFamily: Fonts.extraBold,
    },
  });
}
