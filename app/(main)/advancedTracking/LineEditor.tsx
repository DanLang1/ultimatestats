import { ThemedText } from '@/components/ThemedText';
import { ModalPlayerGrid } from '@/components/lines/ModalPlayerGrid';
import { PresetPickerModal } from '@/components/lines/PresetPickerModal';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getOtherSideId } from '@/lib/advancedTracking/trackingUtils';
import { getLoadLineButtonState } from '@/lib/lineEditorUtils';
import { Player } from '@/lib/storage/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FOCUS_SIDE_ID } from './PreGameConfirm';

export default function AdvancedLineEditor() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const { currentGameId, savedGames } = useAdvancedTrackingStore();
  const currentTeamId = useGameStore((s) => s.currentTeam?.id);

  const game = savedGames.find((g) => g.id === currentGameId) ?? null;

  // Map participants to Player shape so existing components need no changes
  const players: Player[] = (game?.participants ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    matchingType: p.matchingType ?? null,
    role: p.role ?? null,
    isActive: true,
  }));

  const allPresets = useLinePresetsStore((s) => s.presets);
  const presets = allPresets.filter((p) => p.teamId === (currentTeamId ?? ''));
  const quickPresets = presets.slice(0, 3);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [showLinePicker, setShowLinePicker] = useState(false);

  const canConfirm = selectedIds.length === 7;

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

  const handleConfirm = () => {
    if (!game || !canConfirm) return;

    const pullerSideId = getOtherSideId(game, game.initialReceivingSideId);
    const isOurPull = pullerSideId === FOCUS_SIDE_ID;
    router.push({
      pathname: '/advancedTracking/pulltracking',
      params: {
        isOurPull: String(isOurPull),
        lineParticipantIds: JSON.stringify(selectedIds),
      },
    });
  };

  const { active: loadLineButtonActive, label: loadLineButtonLabel } = getLoadLineButtonState({
    presets,
    quickPresetIds: quickPresets.map((p) => p.id),
    selectedPresetId,
    selectedRecentPointNumber: null,
  });

  return (
    <View style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              { borderColor: palette.overlay15 },
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={scaleBySizeClass(18, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>

          <ThemedText style={[styles.headerTitle, { color: palette.textInverse }]}>
            Starting Line
          </ThemedText>

          <Pressable
            onPress={handleConfirm}
            disabled={!canConfirm}
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: canConfirm ? palette.success : palette.overlay10 },
              pressed && canConfirm && { opacity: 0.8 },
            ]}
            hitSlop={8}>
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

        {/* Preset bar */}
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
                  borderColor: selectedPresetId === preset.id ? palette.accent : palette.overlay15,
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
          onEditPresets={() => {
            setShowLinePicker(false);
            router.push('/LinePresetEditor');
          }}
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
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
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
    backBtn: {
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
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
