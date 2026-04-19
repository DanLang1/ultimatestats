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

interface AdvancedStatsTableProps {
  playerStats: AdvancedPlayerStats[];
  participantNames: Map<string, string>;
  onPlayerPress?: (participantId: string) => void;
}

type ColumnDef = { key: SortKey; label: string; width?: number };

const BASE_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'PLAYER', width: 140 },
  { key: 'plusMinus', label: '+/-', width: 58 },
  { key: 'goals', label: 'Goals', width: 58 },
  { key: 'assists', label: 'Ast', width: 58 },
  { key: 'hockeyAssists', label: 'HA', width: 58 },
  { key: 'blocks', label: 'Blk', width: 58 },
  { key: 'throwaways', label: 'T/A', width: 58 },
  { key: 'drops', label: 'Drp', width: 58 },
  { key: 'stalls', label: 'Stl', width: 58 },
  { key: 'completions', label: 'Cmp', width: 58 },
  { key: 'throwAttempts', label: 'Att', width: 58 },
  { key: 'completionPct', label: 'Cmp%', width: 68 },
  { key: 'receptions', label: 'Rec', width: 58 },
  { key: 'totalTouches', label: 'Tch', width: 58 },
  { key: 'pulls', label: 'Pls', width: 58 },
  { key: 'oEfficiency', label: 'O-Eff', width: 72 },
  { key: 'dEfficiency', label: 'D-Eff', width: 72 },
  { key: 'pointsPlayed', label: 'PP', width: 58 },
  { key: 'oPoints', label: 'O-Pts', width: 66 },
  { key: 'dPoints', label: 'D-Pts', width: 66 },
];

const LEGEND_ITEMS: { abbr: string; label: string }[] = [
  { abbr: '+/-', label: 'Plus/Minus' },
  { abbr: 'HA', label: 'Hockey Assist' },
  { abbr: 'T/A', label: 'Throwaway' },
  { abbr: 'Drp', label: 'Drop' },
  { abbr: 'Stl', label: 'Stall' },
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
  const [showLegend, setShowLegend] = useState(false);
  const styles = createStyles(isLandscape, sizeClass);

  const getName = (id: string) => participantNames.get(id) ?? id;

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

  const tableMinWidth = BASE_COLUMNS.reduce((sum, c) => sum + (c.width ?? 58), 0);

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
            Scroll right for more
          </ThemedText>
        </View>
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

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View
          style={[
            styles.tableContainer,
            { borderColor: palette.overlay10, minWidth: tableMinWidth },
          ]}>
          {/* Header */}
          <View
            style={[
              styles.tableHeader,
              { backgroundColor: palette.overlay08, borderBottomColor: palette.overlay10 },
            ]}>
            {BASE_COLUMNS.map((col) => (
              <Pressable
                key={String(col.key)}
                style={[
                  styles.headerCell,
                  { width: col.width ?? 58 },
                  col.key === 'name' && styles.headerNameCell,
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

          {/* Rows */}
          {sorted.map((stats, index) => (
            <View
              key={stats.participantId}
              style={[
                styles.tableRow,
                { borderBottomColor: palette.overlay10 },
                index === sorted.length - 1 && { borderBottomWidth: 0 },
                index % 2 === 1 && { backgroundColor: palette.overlay02 },
              ]}>
              {BASE_COLUMNS.map((col) => {
                if (col.key === 'name') {
                  return (
                    <Pressable
                      key="name"
                      style={{ width: col.width ?? 140 }}
                      onPress={() => onPlayerPress?.(stats.participantId)}
                      disabled={!onPlayerPress}>
                      <ThemedText
                        style={[
                          styles.cell,
                          styles.nameCell,
                          {
                            color: onPlayerPress ? palette.accent : palette.textInverse,
                          },
                        ]}
                        numberOfLines={1}>
                        {getName(stats.participantId)}
                      </ThemedText>
                    </Pressable>
                  );
                }
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
                    {col.key === 'plusMinus' && stats.plusMinus > 0 ? `+${stats.plusMinus}` : text}
                  </ThemedText>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
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
