import { ModalPlayerGrid, SortDirection } from '@/components/lines/ModalPlayerGrid';
import { useTheme } from '@/context/ThemeContext';
import {
  checkLineRatio,
  formatRatio,
  getExpectedRatio,
  getSequenceNumber,
} from '@/lib/genderRatioUtils';
import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LinePromptModal() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isSubstitutionMode = mode === 'substitution';

  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { lineCallingEnabled, genderRatioEnabled, firstPointRatio } = useSettingsStore();
  const {
    currentTeam,
    currentPoint,
    currentLine,
    pointLines,
    setCurrentLine,
    recordLineForPoint,
    gameLocked,
    isHalftimeBreak,
    timerIsActive,
    team1Score,
    team2Score,
  } = useGameStore();

  const gameActive = timerIsActive || team1Score !== 0 || team2Score !== 0;

  // Get presets for the team
  const allPresets = useLinePresetsStore((state) => state.presets);
  const presets = allPresets.filter((p) => p.teamId === (currentTeam?.id ?? ''));

  // Local selection state - initialize with current line if in substitution mode
  const [selectedIds, setSelectedIds] = useState<string[]>(isSubstitutionMode ? currentLine : []);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleSort = () => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));

  // Don't show if line calling is disabled, game is over, or at halftime
  // Exception: substitution mode always shows (but still respects gameLocked)
  if (gameLocked) {
    return null;
  }
  if (!isSubstitutionMode && (!lineCallingEnabled || isHalftimeBreak)) {
    return null;
  }

  // Check if line is already set for the upcoming point
  const hasLineForPoint = pointLines.some(
    (record) => record.pointNumber === currentPoint && !record.isSubstitution,
  );

  // Don't show if line already set (unless in substitution mode)
  if (hasLineForPoint && !isSubstitutionMode) {
    return null;
  }

  const roster = currentTeam?.roster ?? [];
  const activePlayers = roster.filter((p) => p.isActive !== false);

  const handleTogglePlayer = (playerId: string) => {
    setSelectedPresetId(null);
    setSelectedIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length >= 7) {
        return prev;
      }
      return [...prev, playerId];
    });
  };

  const handleSelectPreset = (preset: { id: string; playerIds: string[] }) => {
    // Toggle off if already selected
    if (selectedPresetId === preset.id) {
      setSelectedPresetId(null);
      setSelectedIds([]);
      return;
    }
    setSelectedPresetId(preset.id);
    setSelectedIds(preset.playerIds);
  };

  const handleConfirm = () => {
    requestIdleCallback(() => {
      setCurrentLine(selectedIds);
      recordLineForPoint(currentPoint, isSubstitutionMode);
    });

    // In substitution mode (from GameInfo), dismiss back to GameInfo
    // In normal mode (after point), dismiss to root
    if (isSubstitutionMode) {
      router.back();
    } else {
      router.dismissTo('/');
    }
  };

  const handleSkip = () => {
    // In substitution mode (from GameInfo), dismiss back to GameInfo
    // In normal mode (after point), dismiss to root
    if (isSubstitutionMode) {
      router.back();
    } else {
      router.dismissTo('/');
    }
  };

  const canConfirm = selectedIds.length === 7;

  // Check gender ratio if enabled
  const expectedRatio =
    genderRatioEnabled && firstPointRatio ? getExpectedRatio(currentPoint, firstPointRatio) : null;
  const ratioCheck =
    expectedRatio && roster.length > 0 ? checkLineRatio(selectedIds, roster, expectedRatio) : null;
  // Only warn if ratio is wrong AND there's a clear majority (not a tie)
  const hasClearMajority = ratioCheck && ratioCheck.fmpCount !== ratioCheck.mmpCount;
  const showRatioWarning =
    ratioCheck && !ratioCheck.isCorrect && selectedIds.length > 0 && hasClearMajority;
  const actualMajorityLabel = (ratioCheck?.fmpCount ?? 0) > (ratioCheck?.mmpCount ?? 0) ? 'F' : 'M';

  // Format expected ratio for display (F1, F2, M1, M2)
  const expectedRatioLabel = expectedRatio
    ? formatRatio(expectedRatio, getSequenceNumber(currentPoint))
    : null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: palette.overlayDark60,
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 12),
            paddingHorizontal: 12,
          },
        ]}>
        <View style={[styles.sheet, { backgroundColor: palette.modalBg }]}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            {/* Close button */}
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
              hitSlop={12}>
              <MaterialCommunityIcons name="close" size={20} color={palette.modalTextMuted} />
            </Pressable>

            {/* Presets (scrollable) */}
            <View style={styles.presetsSection}>
              {presets.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.presetsScrollContent}>
                  {presets.map((preset) => (
                    <Pressable
                      key={preset.id}
                      onPress={() => handleSelectPreset(preset)}
                      style={({ pressed }) => [
                        styles.presetChip,
                        {
                          backgroundColor:
                            selectedPresetId === preset.id ? palette.accent : palette.overlay08,
                          borderColor:
                            selectedPresetId === preset.id ? palette.accent : palette.overlay15,
                        },
                        pressed && { opacity: 0.8 },
                      ]}>
                      <Text
                        style={[
                          styles.presetChipText,
                          {
                            color:
                              selectedPresetId === preset.id
                                ? palette.textOnAccent
                                : palette.modalText,
                          },
                        ]}
                        numberOfLines={1}>
                        {preset.name}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => router.push('/LinePresetEditor')}
                    style={({ pressed }) => [
                      styles.presetChip,
                      styles.editPresetsChip,
                      { borderColor: palette.overlay15 },
                      pressed && { opacity: 0.8 },
                    ]}>
                    <MaterialCommunityIcons
                      name="pencil"
                      size={11}
                      color={palette.modalTextMuted}
                    />
                  </Pressable>
                </ScrollView>
              ) : (
                <Pressable
                  onPress={() => router.push('/LinePresetEditor')}
                  style={({ pressed }) => [
                    styles.presetChip,
                    { borderColor: palette.overlay15, backgroundColor: palette.overlay08 },
                    pressed && { opacity: 0.8 },
                  ]}>
                  <MaterialCommunityIcons name="plus" size={11} color={palette.modalTextMuted} />
                  <Text style={[styles.presetChipText, { color: palette.modalTextMuted }]}>
                    Preset
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Sort + Point number + confirm button */}
            <View style={styles.rightSection}>
              <Pressable
                onPress={toggleSort}
                style={({ pressed }) => [
                  styles.sortBtn,
                  { borderColor: palette.overlay15 },
                  pressed && { opacity: 0.7 },
                ]}>
                <MaterialCommunityIcons
                  name={sortDirection === 'asc' ? 'sort-ascending' : 'sort-descending'}
                  size={16}
                  color={palette.modalTextMuted}
                />
              </Pressable>
              {showRatioWarning && (
                <View
                  style={[styles.ratioWarningChip, { backgroundColor: palette.warning + '20' }]}>
                  <MaterialCommunityIcons name="alert" size={16} color={palette.warning} />
                  <Text style={[styles.ratioWarningText, { color: palette.warning }]}>
                    {actualMajorityLabel}
                  </Text>
                </View>
              )}
              <Text style={[styles.pointLabel, { color: palette.modalTextMuted }]}>
                {expectedRatioLabel ? `${expectedRatioLabel}` : ''}
              </Text>
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
                  <MaterialCommunityIcons name="check" size={16} color={palette.textOnAccent} />
                ) : (
                  <Text style={[styles.countText, { color: palette.modalTextMuted }]}>
                    {selectedIds.length}/7
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Player Selection - 4 Column Layout */}
          <View style={styles.playerSection}>
            <ModalPlayerGrid
              roster={activePlayers}
              pointLines={pointLines}
              selectedIds={selectedIds}
              onTogglePlayer={handleTogglePlayer}
              sortDirection={sortDirection}
              gameActive={gameActive}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    borderRadius: 16,
    padding: 12,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    minHeight: 300,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  playerSection: {
    flex: 1,
    minHeight: 150,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  closeBtn: {
    padding: 4,
  },
  presetsSection: {
    flex: 1,
  },
  presetsScrollContent: {
    gap: 5,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  editPresetsChip: {
    paddingHorizontal: 6,
    backgroundColor: 'transparent',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortBtn: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pointLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ratioWarningChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ratioWarningText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
