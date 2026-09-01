import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Player, PointLineRecord } from '@/lib/storage/types';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

import { ModalPlayerGrid } from './ModalPlayerGrid';

export interface PresetEditViewProps {
  roster: Player[];
  pointLines: PointLineRecord[];
  presetName: string;
  selectedIds: string[];
  gameActive: boolean;
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
  const { linePlayerSortOrder } = useSettingsStore();
  const nameInputRef = useRef<TextInput>(null);

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
          <Pressable
            onPress={onSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: canSave ? palette.success : palette.overlay20 },
              pressed && canSave && { opacity: 0.8 },
            ]}
            hitSlop={8}>
            <ThemedText
              style={[
                styles.saveBtnText,
                { color: canSave ? palette.textOnAccent : palette.textMuted },
              ]}>
              {selectedIds.length}
            </ThemedText>
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
          sortDirection={linePlayerSortOrder}
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
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
      fontFamily: Fonts.bold,
    },
    playersSection: {
      flex: 1,
      paddingHorizontal: 12,
    },
  });
}
