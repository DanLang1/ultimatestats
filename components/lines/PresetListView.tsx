import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { LinePreset } from '@/lib/storage/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

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
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: palette.primary, paddingTop: 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton} hitSlop={12}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={scaleBySizeClass(24, sizeClass)}
            color={palette.textInverse}
          />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: palette.textInverse }]}>
          Line Presets
        </ThemedText>
        <View style={styles.headerActions}>
          <Pressable
            onPress={onCreateNew}
            style={[styles.addButton, { backgroundColor: palette.accent }]}>
            <MaterialCommunityIcons
              name="plus"
              size={scaleBySizeClass(20, sizeClass)}
              color={palette.textOnAccent}
            />
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
            <MaterialCommunityIcons
              name="playlist-plus"
              size={scaleBySizeClass(48, sizeClass)}
              color={palette.textMuted}
            />
            <ThemedText style={[styles.emptyTextList, { color: palette.textMuted }]}>
              No presets yet
            </ThemedText>
            <ThemedText style={[styles.emptyHintList, { color: palette.textMuted }]}>
              Create presets for quick line selection
            </ThemedText>
          </View>
        ) : (
          <DraggablePresetList
            presets={presets}
            onReorder={onReorderPresets}
            onDragActiveChange={setIsDragging}
            onEditPreset={onEditPreset}
            onDeletePreset={onDeletePreset}
          />
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
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
    addButton: {
      padding: 8,
      borderRadius: 20,
    },
    headerTitle: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
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
    emptyStateList: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 8,
    },
    emptyTextList: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.semiBold,
      marginTop: 8,
    },
    emptyHintList: {
      fontSize: scaleBySizeClass(14, sizeClass),
    },
  });
}
