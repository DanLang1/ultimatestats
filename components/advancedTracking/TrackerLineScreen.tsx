import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ModalPlayerGrid } from '@/components/lines/ModalPlayerGrid';
import { PresetPickerModal } from '@/components/lines/PresetPickerModal';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getLoadLineButtonState } from '@/lib/lineEditorUtils';
import { Participant } from '@/lib/advancedTracking/types';
import { Player } from '@/lib/storage/types';
import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TrackerLineScreenProps {
  participants: Participant[];
  onConfirm: (participantIds: string[]) => void;
}

export const TrackerLineScreen = ({ participants, onConfirm }: TrackerLineScreenProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const currentTeamId = useGameStore((s) => s.currentTeam?.id);
  const allPresets = useLinePresetsStore((s) => s.presets);
  const presets = allPresets.filter((p) => p.teamId === (currentTeamId ?? ''));
  const quickPresets = presets.slice(0, 3);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [showLinePicker, setShowLinePicker] = useState(false);

  const canConfirm = selectedIds.length === 7;

  const players: Player[] = participants.map((p) => ({
    id: p.id,
    name: p.name,
    matchingType: p.matchingType ?? null,
    role: p.role ?? null,
    isActive: true,
  }));

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 7) return prev;
      return [...prev, id];
    });
  };

  const handleSelectPreset = (preset: { id: string; playerIds: string[] }) => {
    if (selectedPresetId === preset.id) {
      setSelectedPresetId(null);
      setSelectedIds([]);
      return;
    }
    setSelectedPresetId(preset.id);
    setSelectedIds(preset.playerIds);
  };

  const { active: loadLineButtonActive, label: loadLineButtonLabel } = getLoadLineButtonState({
    presets,
    quickPresetIds: quickPresets.map((p) => p.id),
    selectedPresetId,
    selectedRecentPointNumber: null,
  });

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <View style={styles.headerTop}>
            <ThemedText style={[styles.headerTitle, { color: palette.textInverse }]}>
              Select Line
            </ThemedText>

            <Pressable
              onPress={() => canConfirm && onConfirm(selectedIds)}
              disabled={!canConfirm}
              style={({ pressed }) => [
                styles.confirmBtn,
                { backgroundColor: canConfirm ? palette.success : palette.overlay10 },
                pressed && canConfirm && { opacity: 0.8 },
              ]}>
              {canConfirm ? (
                <MaterialCommunityIcons
                  name="check"
                  size={scaleBySizeClass(18, sizeClass)}
                  color={palette.textOnAccent}
                />
              ) : (
                <ThemedText style={[styles.countText, { color: palette.textMuted }]}>
                  {selectedIds.length}/7
                </ThemedText>
              )}
            </Pressable>
          </View>

          <View style={styles.presetsRow}>
            {quickPresets.map((preset) => (
              <Pressable
                key={preset.id}
                onPress={() => handleSelectPreset(preset)}
                style={({ pressed }) => [
                  styles.quickPresetBtn,
                  {
                    backgroundColor:
                      selectedPresetId === preset.id ? palette.accent : palette.overlay08,
                    borderColor:
                      selectedPresetId === preset.id ? palette.accent : palette.overlay15,
                  },
                  pressed && { opacity: 0.8 },
                ]}>
                <ThemedText
                  style={[
                    styles.quickPresetBtnText,
                    {
                      color:
                        selectedPresetId === preset.id ? palette.textOnAccent : palette.textInverse,
                    },
                  ]}
                  numberOfLines={1}>
                  {preset.name}
                </ThemedText>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setShowLinePicker(true)}
              style={({ pressed }) => [
                styles.loadLineBtn,
                {
                  backgroundColor: loadLineButtonActive ? palette.accent : palette.overlay08,
                  borderColor: loadLineButtonActive ? palette.accent : palette.overlay15,
                },
                pressed && { opacity: 0.8 },
              ]}>
              <MaterialCommunityIcons
                name="layers-outline"
                size={scaleBySizeClass(13, sizeClass)}
                color={loadLineButtonActive ? palette.textOnAccent : palette.textMuted}
              />
              <ThemedText
                style={[
                  styles.loadLineBtnText,
                  { color: loadLineButtonActive ? palette.textOnAccent : palette.textMuted },
                ]}
                numberOfLines={1}>
                {loadLineButtonLabel}
              </ThemedText>
            </Pressable>
            {selectedIds.length > 0 && (
              <Pressable
                onPress={() => {
                  setSelectedIds([]);
                  setSelectedPresetId(null);
                }}
                style={({ pressed }) => [
                  styles.clearBtn,
                  { borderColor: palette.overlay15 },
                  pressed && { opacity: 0.7 },
                ]}>
                <MaterialCommunityIcons
                  name="eraser"
                  size={scaleBySizeClass(14, sizeClass)}
                  color={palette.textMuted}
                />
              </Pressable>
            )}
          </View>

          <PresetPickerModal
            visible={showLinePicker}
            onClose={() => setShowLinePicker(false)}
            presets={presets}
            selectedPresetId={selectedPresetId}
            onSelectPreset={(preset) => {
              handleSelectPreset(preset);
              setShowLinePicker(false);
            }}
            onEditPresets={() => setShowLinePicker(false)}
            recentLines={[]}
            selectedRecentPointNumber={null}
            onSelectRecentLine={() => {}}
            roster={players}
          />
        </View>

        <View style={styles.gridContainer}>
          <ModalPlayerGrid
            roster={players}
            pointLines={[]}
            selectedIds={selectedIds}
            onTogglePlayer={togglePlayer}
            useModalColors={false}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerTitle: {
      flex: 1,
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    confirmBtn: {
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 12,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
    },
    presetsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 10,
      gap: 6,
    },
    quickPresetBtn: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      maxWidth: 120,
    },
    quickPresetBtnText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    loadLineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      maxWidth: 160,
    },
    loadLineBtnText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      flexShrink: 1,
    },
    clearBtn: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
    },
    gridContainer: {
      flex: 1,
      paddingHorizontal: 12,
      paddingTop: 8,
    },
  });
}
