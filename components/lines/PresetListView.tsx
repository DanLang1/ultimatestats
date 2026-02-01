import { useTheme } from '@/context/ThemeContext';
import { LinePreset } from '@/lib/storage/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface PresetListViewProps {
  presets: LinePreset[];
  onClose: () => void;
  onCreateNew: () => void;
  onEditPreset: (preset: LinePreset) => void;
}

export function PresetListView({
  presets,
  onClose,
  onCreateNew,
  onEditPreset,
}: PresetListViewProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { backgroundColor: palette.primary, paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textInverse }]}>Line Presets</Text>
        <Pressable
          onPress={onCreateNew}
          style={[styles.addButton, { backgroundColor: palette.accent }]}>
          <MaterialCommunityIcons name="plus" size={20} color={palette.textOnAccent} />
        </Pressable>
      </View>

      {/* Preset List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {presets.length === 0 ? (
          <View style={styles.emptyStateList}>
            <MaterialCommunityIcons name="playlist-plus" size={48} color={palette.textMuted} />
            <Text style={[styles.emptyTextList, { color: palette.textMuted }]}>No presets yet</Text>
            <Text style={[styles.emptyHintList, { color: palette.textMuted }]}>
              Create presets for quick line selection
            </Text>
          </View>
        ) : (
          presets.map((preset) => (
            <Pressable
              key={preset.id}
              onPress={() => onEditPreset(preset)}
              style={({ pressed }) => [
                styles.presetCard,
                { backgroundColor: palette.overlay08 },
                pressed && styles.cardPressed,
              ]}>
              <View style={styles.presetInfo}>
                <Text style={[styles.presetName, { color: palette.textInverse }]}>
                  {preset.name}
                </Text>
                <Text style={[styles.presetCount, { color: palette.textMuted }]}>
                  {preset.playerIds.length} players
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={palette.textMuted} />
            </Pressable>
          ))
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
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
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
    padding: 20,
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
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  cardPressed: {
    opacity: 0.8,
  },
  presetInfo: {
    gap: 4,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '600',
  },
  presetCount: {
    fontSize: 13,
  },
});
