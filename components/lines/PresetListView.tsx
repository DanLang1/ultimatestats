import { useTheme } from '@/context/ThemeContext';
import { LinePreset } from '@/lib/storage/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraggablePresetList } from './DraggablePresetList';

export interface PresetListViewProps {
  presets: LinePreset[];
  onClose: () => void;
  onCreateNew: () => void;
  onEditPreset: (preset: LinePreset) => void;
  onDeletePreset: (preset: LinePreset) => void;
  onReorderPresets: (fromIndex: number, toIndex: number) => void;
}

export function PresetListView({
  presets,
  onClose,
  onCreateNew,
  onEditPreset,
  onDeletePreset,
  onReorderPresets,
}: PresetListViewProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <View
      style={[styles.container, { backgroundColor: palette.primary, paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textInverse }]}>Line Presets</Text>
        <View style={styles.headerActions}>
          {presets.length >= 2 && (
            <Pressable
              onPress={() => setIsReorderMode((prev) => !prev)}
              style={[
                styles.reorderButton,
                {
                  backgroundColor: isReorderMode ? palette.accent : palette.overlay08,
                },
              ]}
              hitSlop={8}>
              <MaterialCommunityIcons
                name="swap-vertical"
                size={18}
                color={isReorderMode ? palette.textOnAccent : palette.textMuted}
              />
            </Pressable>
          )}
          <Pressable
            onPress={onCreateNew}
            style={[styles.addButton, { backgroundColor: palette.accent }]}>
            <MaterialCommunityIcons name="plus" size={20} color={palette.textOnAccent} />
          </Pressable>
        </View>
      </View>

      {/* Preset List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        scrollEnabled={!isDragging}>
        {presets.length === 0 ? (
          <View style={styles.emptyStateList}>
            <MaterialCommunityIcons name="playlist-plus" size={48} color={palette.textMuted} />
            <Text style={[styles.emptyTextList, { color: palette.textMuted }]}>No presets yet</Text>
            <Text style={[styles.emptyHintList, { color: palette.textMuted }]}>
              Create presets for quick line selection
            </Text>
          </View>
        ) : isReorderMode ? (
          <>
            <View style={styles.reorderInfo}>
              <MaterialCommunityIcons
                name="information-outline"
                size={16}
                color={palette.textMuted}
              />
              <Text style={[styles.reorderInfoText, { color: palette.textMuted }]}>
                Drag to reorder. This determines the order presets appear during games.
              </Text>
            </View>
            <DraggablePresetList
              presets={presets}
              onReorder={onReorderPresets}
              onDragActiveChange={setIsDragging}
              onEditPreset={onEditPreset}
              onDeletePreset={onDeletePreset}
            />
          </>
        ) : (
          <View style={styles.grid}>
            {presets.map((preset, index) => (
              <Pressable
                key={preset.id}
                onPress={() => onEditPreset(preset)}
                style={({ pressed }) => [
                  styles.presetCard,
                  { backgroundColor: palette.overlay08 },
                  pressed && styles.cardPressed,
                ]}>
                <View style={styles.presetInfo}>
                  <View style={styles.nameRow}>
                    <View style={[styles.orderBadge, { backgroundColor: palette.overlay12 }]}>
                      <Text style={[styles.orderText, { color: palette.textInverse }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text style={[styles.presetName, { color: palette.textInverse }]}>
                      {preset.name}
                    </Text>
                  </View>
                  <Text style={[styles.presetCount, { color: palette.textMuted }]}>
                    {preset.playerIds.length} players
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable
                    onPress={() => onDeletePreset(preset)}
                    style={({ pressed }) => [
                      styles.deleteBtn,
                      { backgroundColor: palette.dangerOverlay15 },
                      pressed && { opacity: 0.7 },
                    ]}
                    hitSlop={4}>
                    <MaterialCommunityIcons
                      name="delete-outline"
                      size={18}
                      color={palette.danger}
                    />
                  </Pressable>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={palette.textMuted}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reorderButton: {
    padding: 8,
    borderRadius: 20,
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyStateList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTextList: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyHintList: {
    fontSize: 14,
  },
  reorderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  reorderInfoText: {
    fontSize: 13,
    flex: 1,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    width: '48%',
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
  },
  presetInfo: {
    gap: 4,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetName: {
    fontSize: 16,
    fontWeight: '600',
  },
  presetCount: {
    fontSize: 13,
  },
});
