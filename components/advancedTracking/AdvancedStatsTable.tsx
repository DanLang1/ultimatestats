import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PointPlusMinusInfoSheet } from '@/components/advancedTracking/PointPlusMinusInfoSheet';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { AdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { hasAnyThrowTypeStat } from '@/lib/advancedTracking/advancedThrowTypeStatsUtils';
import { UNKNOWN_PARTICIPANT_ID } from '@/lib/advancedTracking/buildAnalyticsGame';
import {
  getPlayerStatLabel,
  getPlayerStatShortLabel,
  type AdvancedPlayerStatKey,
} from '@/lib/advancedTracking/playerStatLabels';
import { formatEfficiency } from '@/lib/efficiencyFormatUtils';
import { Fonts } from '@/theme/theme';

type SortKey = AdvancedPlayerStatKey | 'name';
type StatGroupKey = 'core' | 'throwing' | 'types' | 'touches' | 'pulls' | 'points';

interface AdvancedStatsTableProps {
  playerStats: AdvancedPlayerStats[];
  participantNames: Map<string, string>;
  onPlayerPress?: (participantId: string) => void;
}

type ColumnDef = { key: AdvancedPlayerStatKey; label: string; width: number };
type StatGroup = { key: StatGroupKey; label: string; columns: ColumnDef[] };

const NAME_COLUMN_LABEL = 'PLAYER';
const NAME_COLUMN_MIN_WIDTH = 92;
const NAME_COLUMN_MAX_WIDTH = 140;
const NAME_COLUMN_HORIZONTAL_PADDING = 24;
const NAME_COLUMN_CHARACTER_WIDTH = 10;

function statColumn(key: AdvancedPlayerStatKey, width: number): ColumnDef {
  return { key, label: getPlayerStatShortLabel(key), width };
}

const STAT_GROUPS: StatGroup[] = [
  {
    key: 'core',
    label: 'Core',
    columns: [
      statColumn('plusMinus', 58),
      statColumn('goals', 58),
      statColumn('assists', 58),
      statColumn('blocks', 58),
      statColumn('pressures', 58),
      statColumn('throwaways', 58),
      statColumn('drops', 58),
      statColumn('stalls', 58),
      statColumn('stallsConceded', 58),
    ],
  },
  {
    key: 'throwing',
    label: 'Throw',
    columns: [
      statColumn('completions', 58),
      statColumn('throwAttempts', 58),
      statColumn('completionPct', 68),
      statColumn('assists', 58),
      statColumn('hockeyAssists', 58),
      statColumn('throwaways', 58),
    ],
  },
  {
    key: 'types',
    label: 'Types',
    columns: [
      statColumn('huckAttempts', 84),
      statColumn('huckCompletions', 88),
      statColumn('huckCompletionPct', 74),
      statColumn('resetTurnovers', 78),
      statColumn('hucksCaught', 112),
    ],
  },
  {
    key: 'touches',
    label: 'Touch',
    columns: [
      statColumn('totalTouches', 58),
      statColumn('receptions', 58),
      statColumn('completions', 58),
      statColumn('throwAttempts', 58),
      statColumn('pulls', 58),
      statColumn('blocks', 58),
      statColumn('pressures', 58),
    ],
  },
  {
    key: 'points',
    label: 'Points',
    columns: [
      statColumn('pointPlusMinus', 66),
      statColumn('oEfficiency', 72),
      statColumn('dEfficiency', 72),
      statColumn('pointsPlayed', 58),
      statColumn('oPoints', 66),
      statColumn('dPoints', 66),
    ],
  },
  {
    key: 'pulls',
    label: 'Pull',
    columns: [
      statColumn('pulls', 58),
      statColumn('inboundPulls', 58),
      statColumn('outOfBoundsPulls', 58),
      statColumn('droppedPulls', 58),
      statColumn('rollerPulls', 58),
      statColumn('avgPullHangTimeMs', 68),
      statColumn('maxPullHangTimeMs', 68),
      statColumn('minPullHangTimeMs', 68),
    ],
  },
];

function getCellValue(stats: AdvancedPlayerStats, key: SortKey): number | null {
  if (key === 'name') return null;
  const v = stats[key];
  return typeof v === 'number' ? v : null;
}

function formatCell(stats: AdvancedPlayerStats, key: SortKey): string {
  if (key === 'name') return '';
  if (key === 'avgPullHangTimeMs' || key === 'maxPullHangTimeMs' || key === 'minPullHangTimeMs') {
    const hangTimeMs = stats[key];
    return hangTimeMs != null ? `${(hangTimeMs / 1000).toFixed(1)}s` : '-';
  }
  if (key === 'completionPct' || key === 'huckCompletionPct') {
    const pct = key === 'completionPct' ? stats.completionPct : stats.huckCompletionPct;
    return pct != null ? `${Math.round(pct * 100)}%` : '-';
  }
  if (key === 'oEfficiency') {
    return stats.oPoints > 0 ? formatEfficiency(stats.oEfficiency ?? 0) : '-';
  }
  if (key === 'dEfficiency') {
    return stats.dPoints > 0 ? formatEfficiency(stats.dEfficiency ?? 0) : '-';
  }
  if (key === 'pointPlusMinus') return String(stats.pointPlusMinus);
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

function getNameColumnWidth(names: string[], sizeClass: SizeClass): number {
  const longestNameLength = names.reduce((max, name) => Math.max(max, name.trim().length), 0);
  const contentWidth = longestNameLength * NAME_COLUMN_CHARACTER_WIDTH;
  const desiredWidth = contentWidth + NAME_COLUMN_HORIZONTAL_PADDING;
  // The name font scales by size class, so its width budget must too.
  return scaleBySizeClass(
    Math.min(NAME_COLUMN_MAX_WIDTH, Math.max(NAME_COLUMN_MIN_WIDTH, desiredWidth)),
    sizeClass,
  );
}

function getStatColumnTestID(key: SortKey): string {
  const kebabKey = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return `advanced-stats-column-${kebabKey}`;
}

export default function AdvancedStatsTable({
  playerStats,
  participantNames,
  onPlayerPress,
}: AdvancedStatsTableProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const hasThrowTypeStats = playerStats.some(hasAnyThrowTypeStat);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'plusMinus',
    direction: 'desc',
  });
  const [activeGroupKey, setActiveGroupKey] = useState<StatGroupKey>('core');
  const [showLegend, setShowLegend] = useState(false);
  const [showPointPlusMinusInfo, setShowPointPlusMinusInfo] = useState(false);
  const [tableWidth, setTableWidth] = useState(0);
  const styles = createStyles(sizeClass);

  const getName = (id: string) =>
    id === UNKNOWN_PARTICIPANT_ID ? 'Unknown' : (participantNames.get(id) ?? id);
  const activeGroup = getStatGroup(activeGroupKey);
  const visibleStatColumns = activeGroup.columns;
  const visibleLegendItems = visibleStatColumns.map((column) => ({
    key: column.key,
    abbr: column.label,
    label: getPlayerStatLabel(column.key),
  }));
  const standardLegendItems = visibleLegendItems.filter((item) => item.key !== 'pointPlusMinus');
  const pointPlusMinusLegendItem = visibleLegendItems.find((item) => item.key === 'pointPlusMinus');
  let visiblePlayerStats = playerStats;
  if (activeGroupKey === 'pulls') {
    visiblePlayerStats = playerStats.filter((stats) => stats.pulls > 0);
  } else if (activeGroupKey === 'types') {
    visiblePlayerStats = playerStats.filter(hasAnyThrowTypeStat);
  }
  const playerNames = visiblePlayerStats.map((stats) => getName(stats.participantId));
  const nameColumnWidth = getNameColumnWidth(playerNames, sizeClass);

  const sorted = [...visiblePlayerStats].sort((a, b) => {
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
    if (key === 'pointPlusMinus') return plusMinusColor(stats.pointPlusMinus);
    if (key === 'oEfficiency') return oEffColor(stats);
    if (key === 'dEfficiency') return dEffColor(stats);
    return palette.textInverse;
  };

  const scrollableMinWidth = visibleStatColumns.reduce((sum, c) => sum + (c.width ?? 58), 0);
  const availableStatsWidth = Math.max(0, tableWidth - nameColumnWidth);
  const extraColumnWidth = Math.max(0, availableStatsWidth - scrollableMinWidth);
  const distributedExtraWidth = extraColumnWidth / visibleStatColumns.length;
  const getColumnWidth = (column: ColumnDef) => column.width + distributedExtraWidth;

  const handleTableLayout = (event: LayoutChangeEvent) => {
    setTableWidth(event.nativeEvent.layout.width);
  };

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
        {STAT_GROUPS.filter((group) => group.key !== 'types' || hasThrowTypeStats).map((group) => {
          const isActive = activeGroupKey === group.key;
          return (
            <Pressable
              key={group.key}
              testID={`advanced-stats-group-${group.key}`}
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
            {standardLegendItems.map((item) => (
              <View key={`${activeGroupKey}-${item.abbr}`} style={styles.legendItem}>
                <ThemedText style={[styles.legendAbbr, { color: palette.textInverse }]}>
                  {item.abbr}
                </ThemedText>
                <ThemedText style={[styles.legendLabel, { color: palette.textMuted }]}>
                  {item.label}
                </ThemedText>
              </View>
            ))}
          </View>
          {pointPlusMinusLegendItem && (
            <Pressable
              testID="point-plus-minus-info-button"
              accessibilityRole="button"
              accessibilityLabel="View Point Plus/Minus formula"
              onPress={() => setShowPointPlusMinusInfo(true)}
              style={[styles.pointPlusMinusLegendRow, { borderTopColor: palette.overlay10 }]}>
              <View style={styles.pointPlusMinusHeader}>
                <View style={styles.pointPlusMinusIdentity}>
                  <ThemedText style={[styles.pointPlusMinusAbbr, { color: palette.textInverse }]}>
                    {pointPlusMinusLegendItem.abbr}
                  </ThemedText>
                  <ThemedText style={[styles.pointPlusMinusLabel, { color: palette.textMuted }]}>
                    {pointPlusMinusLegendItem.label}
                  </ThemedText>
                </View>
                <View style={styles.pointPlusMinusLink}>
                  <ThemedText style={[styles.pointPlusMinusLinkText, { color: palette.accent }]}>
                    Details
                  </ThemedText>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={scaleBySizeClass(16, sizeClass)}
                    color={palette.accent}
                  />
                </View>
              </View>
            </Pressable>
          )}
          {activeGroupKey === 'pulls' && (
            <View style={[styles.legendNoteRow, { borderTopColor: palette.overlay10 }]}>
              <MaterialCommunityIcons
                name="information-outline"
                size={scaleBySizeClass(13, sizeClass)}
                color={palette.textMuted}
              />
              <ThemedText style={[styles.legendNote, { color: palette.textMuted }]}>
                Hangtime stats exclude OB and roller pulls
              </ThemedText>
            </View>
          )}
        </View>
      )}

      <View
        onLayout={handleTableLayout}
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
                  {NAME_COLUMN_LABEL}
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
              disabled={!onPlayerPress || stats.participantId === UNKNOWN_PARTICIPANT_ID}
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
                    color:
                      onPlayerPress && stats.participantId !== UNKNOWN_PARTICIPANT_ID
                        ? palette.accent
                        : palette.textInverse,
                  },
                ]}
                numberOfLines={1}>
                {getName(stats.participantId)}
              </ThemedText>
            </Pressable>
          ))}
        </View>

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
                  key={col.key}
                  testID={getStatColumnTestID(col.key)}
                  style={[
                    styles.headerCell,
                    { width: getColumnWidth(col) },
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
                      ]}
                      numberOfLines={1}>
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
                disabled={!onPlayerPress || stats.participantId === UNKNOWN_PARTICIPANT_ID}
                style={[
                  styles.tableRow,
                  { borderBottomColor: palette.overlay10 },
                  index === sorted.length - 1 && { borderBottomWidth: 0 },
                  index % 2 === 1 && { backgroundColor: palette.overlay02 },
                ]}>
                {visibleStatColumns.map((col) => {
                  const color = getCellColor(stats, col.key);
                  const text = formatCell(stats, col.key);
                  const isPlusMinus = col.key === 'plusMinus' || col.key === 'pointPlusMinus';
                  const value = getCellValue(stats, col.key);
                  return (
                    <ThemedText
                      key={col.key}
                      style={[
                        styles.cell,
                        { width: getColumnWidth(col), color },
                        isPlusMinus && styles.plusMinusCell,
                      ]}>
                      {isPlusMinus && value != null && value > 0 ? `+${value}` : text}
                    </ThemedText>
                  );
                })}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
      <PointPlusMinusInfoSheet
        visible={showPointPlusMinusInfo}
        onDismiss={() => setShowPointPlusMinusInfo(false)}
      />
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
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
      alignItems: 'flex-start',
      width: '45%',
      gap: 6,
    },
    legendAbbr: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      minWidth: 36,
      flexShrink: 0,
    },
    legendLabel: {
      flex: 1,
      fontSize: scaleBySizeClass(11, sizeClass),
    },
    pointPlusMinusLegendRow: {
      borderTopWidth: 1,
      marginTop: 10,
      paddingTop: 10,
      gap: 8,
    },
    pointPlusMinusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    pointPlusMinusIdentity: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pointPlusMinusAbbr: {
      minWidth: 36,
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
    },
    pointPlusMinusLabel: {
      flex: 1,
      fontSize: scaleBySizeClass(11, sizeClass),
    },
    pointPlusMinusLink: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    pointPlusMinusLinkText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
    },
    legendNoteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderTopWidth: 1,
      marginTop: 8,
      paddingTop: 8,
    },
    legendNote: {
      flex: 1,
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
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
      paddingHorizontal: 6,
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
