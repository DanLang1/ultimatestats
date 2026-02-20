import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { LinePreset, Player, PointLineRecord } from '@/lib/storage/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ModalPlayerGrid, SortDirection } from './ModalPlayerGrid';

export interface PresetEditViewProps {
  roster: Player[];
  pointLines: PointLineRecord[];
  editingPreset: LinePreset | null;
  presetName: string;
  selectedIds: string[];
  gameActive: boolean;
  numPlayers: number;
  currentPoint?: number;
  onPresetNameChange: (name: string) => void;
  onTogglePlayer: (playerId: string) => void;
  onSave: () => void;
  onBack: () => void;
}

export function PresetEditView({
  roster,
  pointLines,
  presetName,
  selectedIds,
  gameActive,
  currentPoint,
  onPresetNameChange,
  onTogglePlayer,
  onSave,
  onBack,
}: PresetEditViewProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [sortKey, setSortKey] = useState(0);
  const nameInputRef = useRef<TextInput>(null);

  const toggleSort = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setSortKey((k) => k + 1);
  };

  const canSave = presetName.trim().length > 0 && selectedIds.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: palette.primary, paddingTop: 12 }]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        {/* Back button */}
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
          hitSlop={12}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={scaleBySizeClass(22, sizeClass)}
            color={palette.textInverse}
          />
        </Pressable>

        {/* Preset Name Input */}
        <View style={styles.nameSection}>
          <Pressable style={styles.nameInputRow} onPress={() => nameInputRef.current?.focus()}>
            <TextInput
              ref={nameInputRef}
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
              size={scaleBySizeClass(12, sizeClass)}
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
                size={scaleBySizeClass(16, sizeClass)}
                color={palette.textMuted}
              />
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
              <MaterialCommunityIcons
                name="check"
                size={scaleBySizeClass(16, sizeClass)}
                color={palette.textOnAccent}
              />
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
          sortKey={sortKey}
          sortSelectedFirst={selectedIds.length > 0}
          useModalColors={false}
          gameActive={gameActive}
          currentPoint={currentPoint}
        />
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
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
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '700',
      letterSpacing: 1,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionBtn: {
      height: 36,
      width: 36,
      borderRadius: 10,
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
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '700',
    },
    sizeWarningChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: 8,
    },
    sizeWarningText: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontWeight: '700',
    },
    playersSection: {
      flex: 1,
      paddingHorizontal: 12,
    },
  });
}
