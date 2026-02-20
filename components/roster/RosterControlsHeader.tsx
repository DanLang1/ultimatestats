import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import { PlayerRole } from '@/lib/storage/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type RoleFilter = PlayerRole | 'unset' | null;

interface RosterControlsHeaderProps {
  isSelecting: boolean;
  viewMode: 'chips' | 'cards';
  activeRoleFilter: RoleFilter;
  selectedCount: number;
  allActiveSelected: boolean;
  hasActivePlayers: boolean;
  onToggleViewMode: () => void;
  onToggleSelectMode: () => void;
  onToggleSelectAll: () => void;
  onToggleRoleFilter: (role: Exclude<RoleFilter, null>) => void;
  sizeClass?: SizeClass;
}

export function RosterControlsHeader({
  isSelecting,
  viewMode,
  activeRoleFilter,
  selectedCount,
  allActiveSelected,
  hasActivePlayers,
  onToggleViewMode,
  onToggleSelectMode,
  onToggleSelectAll,
  onToggleRoleFilter,
  sizeClass = 'small',
}: RosterControlsHeaderProps) {
  const TRACK_WIDTH = scaleBySizeClass(118, sizeClass);
  const styles = createStyles(sizeClass);
  const metrics = createMetrics(sizeClass);
  const { palette } = useTheme();
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const maxScroll = Math.max(0, contentWidth - viewportWidth);
  const hasOverflow = maxScroll > 8;
  const visibleRatio = contentWidth > 0 ? Math.min(1, viewportWidth / contentWidth) : 1;
  const indicatorThumbWidth = Math.max(26, Math.round(TRACK_WIDTH * visibleRatio));
  const indicatorTravel = TRACK_WIDTH - indicatorThumbWidth;
  const indicatorLeft = maxScroll > 0 ? (scrollX / maxScroll) * indicatorTravel : 0;

  return (
    <View style={[styles.container, { borderBottomColor: palette.overlay10 }]}>
      <View
        style={styles.scrollViewport}
        onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => setScrollX(event.nativeEvent.contentOffset.x)}
          onContentSizeChange={(width) => setContentWidth(width)}
          contentContainerStyle={styles.controlsRow}>
          {!isSelecting ? (
            <>
              <Pressable
                onPress={onToggleViewMode}
                style={({ pressed }) => [
                  styles.primaryChip,
                  {
                    borderColor: viewMode === 'chips' ? palette.accent : palette.overlay20,
                    backgroundColor: viewMode === 'chips' ? palette.accent : palette.overlay08,
                  },
                  pressed && styles.pressed,
                ]}>
                <MaterialCommunityIcons
                  name={viewMode === 'chips' ? 'view-list' : 'view-module'}
                  size={metrics.primaryIconSize}
                  color={viewMode === 'chips' ? palette.textOnAccent : palette.textMuted}
                />
                <Text
                  style={[
                    styles.primaryChipText,
                    { color: viewMode === 'chips' ? palette.textOnAccent : palette.textMuted },
                  ]}>
                  {viewMode === 'chips' ? 'Cards' : 'Chips'}
                </Text>
              </Pressable>

              <Pressable
                onPress={onToggleSelectMode}
                style={({ pressed }) => [
                  styles.primaryChip,
                  { borderColor: palette.overlay20, backgroundColor: palette.overlay08 },
                  pressed && styles.pressed,
                ]}>
                <MaterialCommunityIcons
                  name="checkbox-multiple-blank-outline"
                  size={metrics.primaryCheckIconSize}
                  color={palette.textMuted}
                />
                <Text style={[styles.primaryChipText, { color: palette.textMuted }]}>Bulk</Text>
              </Pressable>

              <View style={[styles.segmentedControl, { borderColor: palette.overlay20 }]}>
                {(
                  [
                    { role: 'handler', icon: 'bullseye-arrow', label: 'Handler' },
                    { role: 'hybrid', icon: 'star-three-points', label: 'Hybrid' },
                    { role: 'cutter', icon: 'shoe-print', label: 'Cutter' },
                    { role: 'unset', icon: 'help-circle-outline', label: 'Unset' },
                  ] as const
                ).map((roleConfig, index, items) => {
                  const { role, icon, label } = roleConfig;
                  const isActive = activeRoleFilter === role;
                  return (
                    <Pressable
                      key={role}
                      onPress={() => onToggleRoleFilter(role)}
                      style={({ pressed }) => [
                        styles.segment,
                        {
                          backgroundColor: isActive ? palette.accent : 'transparent',
                        },
                        index > 0 && { borderLeftWidth: 1, borderLeftColor: palette.overlay20 },
                        index === 0 && styles.segmentFirst,
                        index === items.length - 1 && styles.segmentLast,
                        pressed && styles.pressed,
                      ]}>
                      <MaterialCommunityIcons
                        name={icon}
                        size={metrics.segmentIconSize}
                        color={isActive ? palette.textOnAccent : palette.textMuted}
                      />
                      <Text
                        style={[
                          styles.filterText,
                          { color: isActive ? palette.textOnAccent : palette.textMuted },
                        ]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <View style={[styles.selectionChip, { borderColor: palette.overlay20 }]}>
                <Text style={[styles.selectionLabel, { color: palette.textMuted }]}>
                  {selectedCount} selected
                </Text>
              </View>

              {hasActivePlayers && (
                <Pressable
                  onPress={onToggleSelectAll}
                  style={({ pressed }) => [
                    styles.smallAction,
                    { borderColor: palette.overlay20, backgroundColor: palette.overlay08 },
                    pressed && styles.pressed,
                  ]}>
                  <MaterialCommunityIcons
                    name={
                      allActiveSelected
                        ? 'checkbox-multiple-marked'
                        : 'checkbox-multiple-blank-outline'
                    }
                    size={metrics.segmentIconSize}
                    color={palette.textMuted}
                  />
                  <Text style={[styles.smallActionText, { color: palette.textMuted }]}>
                    {allActiveSelected ? 'Deselect All' : 'Select All'}
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={onToggleSelectMode}
                style={({ pressed }) => [
                  styles.primaryChip,
                  { borderColor: palette.accent, backgroundColor: palette.accent },
                  pressed && styles.pressed,
                ]}>
                <MaterialCommunityIcons
                  name="checkbox-multiple-marked-outline"
                  size={metrics.primaryCheckIconSize}
                  color={palette.textOnAccent}
                />
                <Text style={[styles.primaryChipText, { color: palette.textOnAccent }]}>Done</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>

      {hasOverflow && (
        <View style={styles.indicatorWrap}>
          <View style={[styles.indicatorTrack, { backgroundColor: palette.overlay20 }]}>
            <View
              style={[styles.indicatorThumb, { left: indicatorLeft, width: indicatorThumbWidth }]}>
              <View style={[styles.thumbPoint, { backgroundColor: palette.accent }]} />
              <View style={[styles.thumbCore, { backgroundColor: palette.accent }]} />
              <View style={[styles.thumbPoint, { backgroundColor: palette.accent }]} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
      paddingVertical: scaleBySizeClass(10, sizeClass),
    },
    scrollViewport: {
      position: 'relative',
    },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
      paddingRight: scaleBySizeClass(28, sizeClass),
    },
    primaryChip: {
      borderWidth: 1,
      borderRadius: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      paddingVertical: scaleBySizeClass(8, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
    },
    primaryChipText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '700',
    },
    selectionChip: {
      borderWidth: 1,
      borderRadius: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      paddingVertical: scaleBySizeClass(8, sizeClass),
    },
    smallAction: {
      borderWidth: 1,
      borderRadius: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      paddingVertical: scaleBySizeClass(8, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
    },
    selectionLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '600',
    },
    smallActionText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '600',
    },
    segmentedControl: {
      borderWidth: 1,
      borderRadius: scaleBySizeClass(12, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
    },
    segment: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(5, sizeClass),
      paddingHorizontal: scaleBySizeClass(10, sizeClass),
      paddingVertical: scaleBySizeClass(8, sizeClass),
    },
    segmentFirst: {
      borderTopLeftRadius: scaleBySizeClass(11, sizeClass),
      borderBottomLeftRadius: scaleBySizeClass(11, sizeClass),
    },
    segmentLast: {
      borderTopRightRadius: scaleBySizeClass(11, sizeClass),
      borderBottomRightRadius: scaleBySizeClass(11, sizeClass),
    },
    filterText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '600',
    },
    indicatorWrap: {
      marginTop: scaleBySizeClass(10, sizeClass),
      alignItems: 'center',
    },
    indicatorTrack: {
      width: scaleBySizeClass(118, sizeClass),
      height: scaleBySizeClass(2, sizeClass),
      borderRadius: 999,
      overflow: 'hidden',
    },
    indicatorThumb: {
      position: 'absolute',
      top: scaleBySizeClass(-2, sizeClass),
      height: scaleBySizeClass(6, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
    },
    thumbCore: {
      flex: 1,
      height: scaleBySizeClass(2, sizeClass),
      borderRadius: 999,
      marginHorizontal: scaleBySizeClass(-1, sizeClass),
    },
    thumbPoint: {
      width: scaleBySizeClass(6, sizeClass),
      height: scaleBySizeClass(6, sizeClass),
      transform: [{ rotate: '45deg' }],
      borderRadius: scaleBySizeClass(1, sizeClass),
    },
    pressed: {
      opacity: 0.75,
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    primaryIconSize: scaleBySizeClass(15, sizeClass),
    primaryCheckIconSize: scaleBySizeClass(16, sizeClass),
    segmentIconSize: scaleBySizeClass(14, sizeClass),
  };
}
