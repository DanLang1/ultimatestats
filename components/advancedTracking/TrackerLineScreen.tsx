import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalPlayerGrid } from '@/components/lines/ModalPlayerGrid';
import { PresetPickerModal } from '@/components/lines/PresetPickerModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import type { PlayerChipRestriction } from '@/components/ui/PlayerChip';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Participant } from '@/lib/advancedTracking/types';
import { checkLineRatio, formatRatio, GenderRatio } from '@/lib/genderRatioUtils';
import { getLoadLineButtonState } from '@/lib/lineEditorUtils';
import { Player, PointLineRecord } from '@/lib/storage/types';
import { hasItems } from '@/lib/utils';
import { useGameStore } from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

export interface RecentLine {
  pointNumber: number;
  playerIds: string[];
}

const EMPTY_RECENT_LINES: RecentLine[] = [];
const EMPTY_POINT_LINES: PointLineRecord[] = [];
const EMPTY_PARTICIPANT_IDS: string[] = [];

export interface LineParticipantLock {
  lockedIds: string[];
  onPress: (participantId: string) => void;
}

function withLockedParticipants(participantIds: string[], lockedIds: string[]): string[] {
  const nextIds = new Set(lockedIds);

  for (const participantId of participantIds) {
    if (nextIds.size >= 7) break;
    nextIds.add(participantId);
  }

  return [...nextIds].slice(0, 7);
}

interface TrackerLineScreenProps {
  participants: Participant[];
  /** Expanded eligible participant set exposed by the optional "All players" filter. */
  allParticipants?: Participant[];
  /** Full roster used to resolve history names and matching-type metadata. */
  rosterParticipants?: Participant[];
  /** Optional status shown beneath player names, such as their other scrimmage side. */
  playerStatusLabels?: ReadonlyMap<string, string>;
  onConfirm: (participantIds: string[]) => void;
  initialSelectedIds?: string[];
  title: string;
  onBack?: () => void;
  confirmLabel?: string;
  expectedRatio?: GenderRatio;
  sequenceNumber?: 1 | 2;
  requireChanges?: boolean;
  recentLines?: RecentLine[];
  pointLines?: PointLineRecord[];
  currentPoint?: number;
  participantLock?: LineParticipantLock;
}

export const TrackerLineScreen = ({
  participants,
  allParticipants,
  rosterParticipants,
  playerStatusLabels,
  onConfirm,
  initialSelectedIds,
  title,
  onBack,
  confirmLabel,
  expectedRatio,
  sequenceNumber,
  requireChanges,
  recentLines = EMPTY_RECENT_LINES,
  pointLines = EMPTY_POINT_LINES,
  currentPoint,
  participantLock,
}: TrackerLineScreenProps) => {
  const { palette } = useTheme();
  const { sizeClass, isLandscape } = useLayout();
  const styles = createStyles(sizeClass);

  const currentTeamId = useGameStore((s) => s.currentTeam.id);
  const allPresets = useLinePresetsStore((s) => s.presets);
  const linePlayerSortOrder = useSettingsStore((s) => s.linePlayerSortOrder);
  const presets = allPresets.filter((p) => p.teamId === currentTeamId);
  const quickPresets = presets.slice(0, 3);

  const lockedParticipantIds = participantLock?.lockedIds ?? EMPTY_PARTICIPANT_IDS;
  const withLocked = (participantIds: string[]) =>
    withLockedParticipants(participantIds, lockedParticipantIds);

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    withLocked(initialSelectedIds ?? []),
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [selectedRecentPointNumber, setSelectedRecentPointNumber] = useState<number | null>(null);
  const [showLinePicker, setShowLinePicker] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const initialIds = initialSelectedIds ?? [];
  const eligibleParticipants = allParticipants ?? participants;
  const participantRoster = rosterParticipants ?? eligibleParticipants;
  const defaultParticipantIds = new Set(participants.map((participant) => participant.id));
  const visibleParticipants = showAllPlayers
    ? eligibleParticipants
    : eligibleParticipants.filter(
        (participant) =>
          defaultParticipantIds.has(participant.id) || selectedIds.includes(participant.id),
      );
  const canShowAllPlayers = eligibleParticipants.some(
    (participant) => !defaultParticipantIds.has(participant.id),
  );
  const lockedParticipantIdSet = new Set(lockedParticipantIds);
  const hasSubChanges = !requireChanges || selectedIds.some((id) => !initialIds.includes(id));
  const canConfirm = selectedIds.length === 7 && hasSubChanges;

  const ratioCheck =
    expectedRatio != null && canConfirm
      ? checkLineRatio(
          selectedIds,
          participantRoster.map((p) => ({ id: p.id, matchingType: p.matchingType ?? null })),
          expectedRatio,
        )
      : null;
  const ratioMismatch = ratioCheck != null && !ratioCheck.isCorrect;
  const expectedRatioLabel =
    expectedRatio != null ? formatRatio(expectedRatio, sequenceNumber ?? 1) : null;
  const headerTitle = `${title}${expectedRatioLabel ? ` · ${expectedRatioLabel}` : ''}`;

  const players: Player[] = visibleParticipants.map((p) => ({
    id: p.id,
    name: p.name,
    number: p.number,
    matchingType: p.matchingType ?? null,
    role: p.role ?? null,
    isActive: true,
  }));

  const togglePlayer = (id: string) => {
    const isSelected = selectedIds.includes(id);
    if (isSelected && lockedParticipantIdSet.has(id)) {
      participantLock?.onPress(id);
      return;
    }
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 7) return prev;
      return [...prev, id];
    });
  };

  const handleSelectPreset = (preset: { id: string; playerIds: string[] }) => {
    if (selectedPresetId === preset.id) {
      setSelectedPresetId(null);
      setSelectedIds(withLocked([]));
      return;
    }
    setSelectedPresetId(preset.id);
    const availableParticipantIds = new Set(
      eligibleParticipants.map((participant) => participant.id),
    );
    const availablePresetIds = preset.playerIds.filter((id) => availableParticipantIds.has(id));
    if (availablePresetIds.some((id) => !defaultParticipantIds.has(id))) {
      setShowAllPlayers(true);
    }
    setSelectedIds(withLocked(availablePresetIds));
  };

  const handleSelectRecentLine = (recent: RecentLine) => {
    if (selectedRecentPointNumber === recent.pointNumber) {
      setSelectedRecentPointNumber(null);
      setSelectedIds(withLocked([]));
      return;
    }
    setSelectedRecentPointNumber(recent.pointNumber);
    setSelectedPresetId(null);
    const availableParticipantIds = new Set(
      eligibleParticipants.map((participant) => participant.id),
    );
    const availableRecentIds = recent.playerIds.filter((id) => availableParticipantIds.has(id));
    if (availableRecentIds.some((id) => !defaultParticipantIds.has(id))) {
      setShowAllPlayers(true);
    }
    setSelectedIds(withLocked(availableRecentIds));
  };

  const playerRestrictions = new Map<string, PlayerChipRestriction>();
  for (const participantId of lockedParticipantIds) {
    if (!selectedIds.includes(participantId)) continue;
    playerRestrictions.set(participantId, {
      accessibilityHint: 'Cannot be removed from the starting lineup',
      onPress: () => participantLock?.onPress(participantId),
    });
  }

  const { active: loadLineButtonActive, label: loadLineButtonLabel } = getLoadLineButtonState({
    presets,
    quickPresetIds: quickPresets.map((p) => p.id),
    selectedPresetId,
    selectedRecentPointNumber,
  });

  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={styles.headerTop}>
          {onBack && (
            <Pressable
              testID="line-select-back"
              onPress={onBack}
              style={styles.backBtn}
              hitSlop={8}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.textInverse}
              />
            </Pressable>
          )}
          <ThemedText
            testID="line-select-title"
            style={[styles.headerTitle, { color: palette.textInverse }]}
            numberOfLines={1}>
            {headerTitle}
          </ThemedText>

          {isLandscape && ratioMismatch && (
            <View style={styles.ratioInline}>
              <View style={[styles.infoChip, { backgroundColor: palette.warning + '20' }]}>
                <MaterialCommunityIcons
                  name="alert"
                  size={scaleBySizeClass(14, sizeClass)}
                  color={palette.warning}
                />
                <ThemedText style={[styles.infoChipText, { color: palette.warning }]}>
                  Expecting {expectedRatio === 'more-women' ? 'F' : 'M'} majority
                </ThemedText>
              </View>
            </View>
          )}

          <Pressable
            testID="line-select-confirm"
            onPress={() => onConfirm(selectedIds)}
            disabled={!canConfirm}
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: canConfirm ? palette.success : palette.overlay10 },
              pressed && canConfirm && { opacity: 0.8 },
            ]}>
            {!canConfirm && (
              <ThemedText style={[styles.countText, { color: palette.textMuted }]}>
                {selectedIds.length}/7
              </ThemedText>
            )}
            {canConfirm && confirmLabel && (
              <ThemedText style={[styles.countText, { color: palette.textOnAccent }]}>
                {confirmLabel}
              </ThemedText>
            )}
            {canConfirm && !confirmLabel && (
              <MaterialCommunityIcons
                name="check"
                size={scaleBySizeClass(18, sizeClass)}
                color={palette.textOnAccent}
              />
            )}
          </Pressable>
        </View>

        {!isLandscape && ratioMismatch && (
          <View style={styles.infoRow}>
            <View style={[styles.infoChip, { backgroundColor: palette.warning + '20' }]}>
              <MaterialCommunityIcons
                name="alert"
                size={scaleBySizeClass(14, sizeClass)}
                color={palette.warning}
              />
              <ThemedText style={[styles.infoChipText, { color: palette.warning }]}>
                Expecting {expectedRatio === 'more-women' ? 'F' : 'M'} majority
              </ThemedText>
            </View>
          </View>
        )}

        <View style={styles.presetsRow}>
          {canShowAllPlayers && (
            <Pressable
              testID="line-select-show-all-players"
              accessibilityRole="switch"
              accessibilityState={{ checked: showAllPlayers }}
              onPress={() => setShowAllPlayers((current) => !current)}
              style={({ pressed }) => [
                styles.showAllBtn,
                {
                  backgroundColor: showAllPlayers ? palette.accent : palette.overlay08,
                  borderColor: showAllPlayers ? palette.accent : palette.overlay15,
                },
                pressed && { opacity: 0.8 },
              ]}>
              <MaterialCommunityIcons
                name="account-multiple-outline"
                size={scaleBySizeClass(13, sizeClass)}
                color={showAllPlayers ? palette.textOnAccent : palette.textMuted}
              />
              <ThemedText
                style={[
                  styles.showAllBtnText,
                  { color: showAllPlayers ? palette.textOnAccent : palette.textMuted },
                ]}>
                All players
              </ThemedText>
            </Pressable>
          )}
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
            testID="line-select-load-line"
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
                setSelectedIds(withLocked([]));
                setSelectedPresetId(null);
                setSelectedRecentPointNumber(null);
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
          recentLines={recentLines}
          selectedRecentPointNumber={selectedRecentPointNumber}
          onSelectRecentLine={(recent) => {
            handleSelectRecentLine(recent);
            setShowLinePicker(false);
          }}
          roster={participantRoster.map((participant) => ({
            id: participant.id,
            name: participant.name,
            number: participant.number,
            matchingType: participant.matchingType ?? null,
            role: participant.role ?? null,
            isActive: true,
          }))}
        />
      </View>

      <View style={styles.gridContainer}>
        <ModalPlayerGrid
          roster={players}
          pointLines={pointLines}
          selectedIds={selectedIds}
          onTogglePlayer={togglePlayer}
          sortDirection={linePlayerSortOrder}
          useModalColors={false}
          gameActive={hasItems(pointLines)}
          currentPoint={currentPoint}
          playerRestrictions={playerRestrictions}
          playerStatusLabels={playerStatusLabels}
        />
      </View>
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
    backBtn: {
      marginRight: 4,
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
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    infoChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    infoChipText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.3,
    },
    ratioInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    quickPresetBtn: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      maxWidth: 120,
    },
    showAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
    },
    showAllBtnText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
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
