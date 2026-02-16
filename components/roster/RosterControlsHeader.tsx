import { useTheme } from '@/context/ThemeContext';
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
}: RosterControlsHeaderProps) {
  const TRACK_WIDTH = 118;
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
                  size={15}
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
                  size={16}
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
                        size={14}
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
                    size={14}
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
                  size={16}
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

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  scrollViewport: {
    position: 'relative',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 28,
  },
  primaryChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectionChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallAction: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  segmentedControl: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  segmentFirst: {
    borderTopLeftRadius: 11,
    borderBottomLeftRadius: 11,
  },
  segmentLast: {
    borderTopRightRadius: 11,
    borderBottomRightRadius: 11,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  indicatorWrap: {
    marginTop: 10,
    alignItems: 'center',
  },
  indicatorTrack: {
    width: 118,
    height: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  indicatorThumb: {
    position: 'absolute',
    top: -2,
    height: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbCore: {
    flex: 1,
    height: 2,
    borderRadius: 999,
    marginHorizontal: -1,
  },
  thumbPoint: {
    width: 6,
    height: 6,
    transform: [{ rotate: '45deg' }],
    borderRadius: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
