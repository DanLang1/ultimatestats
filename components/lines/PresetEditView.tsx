import { useTheme } from '@/context/ThemeContext';
import { LinePreset, Player, PointLineRecord } from '@/lib/storage/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalPlayerGrid, SortDirection } from './ModalPlayerGrid';

export interface PresetEditViewProps {
  roster: Player[];
  pointLines: PointLineRecord[];
  editingPreset: LinePreset | null;
  presetName: string;
  selectedIds: string[];
  gameActive: boolean;
  onPresetNameChange: (name: string) => void;
  onTogglePlayer: (playerId: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export function PresetEditView({
  roster,
  pointLines,
  editingPreset,
  presetName,
  selectedIds,
  gameActive,
  onPresetNameChange,
  onTogglePlayer,
  onSave,
  onDelete,
  onBack,
}: PresetEditViewProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleSort = () => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));

  const canSave = presetName.trim().length > 0 && selectedIds.length > 0;

  return (
    <View
      style={[styles.container, { backgroundColor: palette.primary, paddingTop: insets.top + 12 }]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        {/* Back button */}
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
          hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={palette.textInverse} />
        </Pressable>

        {/* Preset Name Input */}
        <View style={styles.nameSection}>
          <Pressable style={styles.nameInputRow}>
            <TextInput
              style={[styles.presetNameInput, { color: palette.textInverse }]}
              value={presetName}
              onChangeText={onPresetNameChange}
              placeholder="Preset Name"
              placeholderTextColor={palette.textMuted}
              maxLength={10}
              textAlign="center"
            />
            <MaterialCommunityIcons
              name="pencil"
              size={12}
              color={palette.textMuted}
              style={styles.pencilIcon}
            />
          </Pressable>
        </View>

        {/* Sort + Delete + Count + Save */}
        <View style={styles.rightSection}>
          {gameActive && (
            <Pressable
              onPress={toggleSort}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: palette.overlay20 },
                pressed && { opacity: 0.7 },
              ]}>
              <MaterialCommunityIcons
                name={sortDirection === 'asc' ? 'sort-ascending' : 'sort-descending'}
                size={18}
                color={palette.textMuted}
              />
            </Pressable>
          )}

          {editingPreset && (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: palette.dangerOverlay15 },
                pressed && { opacity: 0.7 },
              ]}>
              <MaterialCommunityIcons name="delete-outline" size={18} color={palette.danger} />
            </Pressable>
          )}

          <Pressable
            onPress={onSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: canSave ? palette.success : palette.overlay20 },
              pressed && canSave && { opacity: 0.8 },
            ]}
            hitSlop={8}>
            <Text
              style={[
                styles.saveBtnText,
                { color: canSave ? palette.textOnAccent : palette.textMuted },
              ]}>
              {selectedIds.length}
            </Text>
            {canSave && (
              <MaterialCommunityIcons name="check" size={16} color={palette.textOnAccent} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Player Selection Grid */}
      <View style={styles.playersSection}>
        <ModalPlayerGrid
          roster={roster}
          pointLines={pointLines}
          selectedIds={selectedIds}
          onTogglePlayer={onTogglePlayer}
          sortDirection={sortDirection}
          useModalColors={false}
          gameActive={gameActive}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
  nameSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pencilIcon: {
    marginLeft: 4,
  },
  presetNameInput: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  playersSection: {
    flex: 1,
    paddingHorizontal: 12,
  },
});
