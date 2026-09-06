import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalPlayerGrid } from '@/components/lines/ModalPlayerGrid';
import { PresetPickerModal } from '@/components/lines/PresetPickerModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import type { PlayerChipRestriction } from '@/components/ui/PlayerChip';
import { ResponsiveHeaderActions } from '@/components/ui/ResponsiveHeaderActions';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Participant } from '@/lib/advancedTracking/types';
import { ULTIMATE_LINE_SIZE } from '@/lib/constants';
import { checkLineRatio, formatRatio, GenderRatio } from '@/lib/genderRatioUtils';
import { LinePreset, Player, PointLineRecord } from '@/lib/storage/types';
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

export interface LineParticipantRestrictions {
  lockedIds: string[];
  restrictedIds?: string[];
  onPress: (participantId: string) => void;
}

function buildRestrictedLineSelection(
  participantIds: string[],
  lockedIds: string[],
  restrictedIds: ReadonlySet<string>,
  fallbackIds: string[] = [],
): string[] {
  const nextIds = new Set(lockedIds);

  for (const candidates of [participantIds, fallbackIds]) {
    for (const participantId of candidates) {
      if (nextIds.size >= ULTIMATE_LINE_SIZE) break;
      if (!restrictedIds.has(participantId)) {
        nextIds.add(participantId);
      }
    }
  }

  return [...nextIds].slice(0, ULTIMATE_LINE_SIZE);
}

interface TrackerLineScreenProps {
  participants: Participant[];
  /** Expanded eligible participant set exposed by the "Other players" section. */
  allParticipants?: Participant[];
  /** Full roster used to resolve history names and matching-type metadata. */
  rosterParticipants?: Participant[];
  /** Optional status shown beneath player names, such as their other scrimmage side. */
  playerStatusLabels?: ReadonlyMap<string, string>;
  onConfirm: (participantIds: string[]) => void | Promise<void>;
  onSelectionChange?: (participantIds: string[]) => void;
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
  participantRestrictions?: LineParticipantRestrictions;
}

export const TrackerLineScreen = ({
  participants,
  allParticipants,
  rosterParticipants,
  playerStatusLabels,
  onConfirm,
  onSelectionChange,
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
  participantRestrictions,
}: TrackerLineScreenProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const currentTeamId = useGameStore((s) => s.currentTeam.id);
  const allPresets = useLinePresetsStore((s) => s.presets);
  const linePlayerSortOrder = useSettingsStore((s) => s.linePlayerSortOrder);
  const presets = allPresets.filter((p) => p.teamId === currentTeamId);

  const lockedParticipantIds = participantRestrictions?.lockedIds ?? EMPTY_PARTICIPANT_IDS;
  const restrictedParticipantIds = participantRestrictions?.restrictedIds ?? EMPTY_PARTICIPANT_IDS;
  const restrictedParticipantIdSet = new Set(restrictedParticipantIds);
  const withRestrictions = (participantIds: string[], fallbackIds: string[] = []) =>
    participantRestrictions == null
      ? [...new Set(participantIds)]
      : buildRestrictedLineSelection(
          participantIds,
          lockedParticipantIds,
          restrictedParticipantIdSet,
          fallbackIds,
        );

  const [initialSelectionIds] = useState(() => [...(initialSelectedIds ?? [])]);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    withRestrictions(initialSelectionIds),
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [selectedRecentPointNumber, setSelectedRecentPointNumber] = useState<number | null>(null);
  const [showLinePicker, setShowLinePicker] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const updateSelection = (participantIds: string[]) => {
    if (isConfirming) return;
    setSelectedIds(participantIds);
    onSelectionChange?.(participantIds);
  };

  const eligibleParticipants = allParticipants ?? participants;
  const participantRoster = rosterParticipants ?? eligibleParticipants;
  const defaultParticipantIds = new Set(participants.map((participant) => participant.id));
  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);
  const focusedParticipantIds = selectedPreset
    ? new Set([...selectedPreset.playerIds, ...lockedParticipantIds])
    : new Set([...defaultParticipantIds, ...initialSelectionIds]);
  const eligibleParticipantIds = new Set(eligibleParticipants.map((participant) => participant.id));
  const unavailablePresetIds =
    selectedPreset?.playerIds.filter((id) => !eligibleParticipantIds.has(id)) ?? [];
  const unavailablePresetNames = unavailablePresetIds.map(
    (id) =>
      participantRoster.find((participant) => participant.id === id)?.name ?? 'Removed player',
  );
  const lockedParticipantIdSet = new Set(lockedParticipantIds);
  const hasSubChanges =
    !requireChanges || selectedIds.some((id) => !initialSelectionIds.includes(id));
  const canConfirm = selectedIds.length === ULTIMATE_LINE_SIZE && hasSubChanges;

  const handleConfirm = async () => {
    if (!canConfirm || isConfirming) return;

    setIsConfirming(true);
    try {
      await onConfirm(selectedIds);
    } finally {
      setIsConfirming(false);
    }
  };

  const ratioCheck =
    expectedRatio != null && canConfirm
      ? checkLineRatio(
          selectedIds,
          participantRoster.map((p) => ({
            id: p.id,
            matchingType: p.matchingType ?? null,
          })),
          expectedRatio,
        )
      : null;
  const ratioMismatch = ratioCheck != null && !ratioCheck.isCorrect;
  const expectedRatioLabel =
    expectedRatio != null ? formatRatio(expectedRatio, sequenceNumber ?? 1) : null;
  const headerTitle = `${title}${expectedRatioLabel ? ` · ${expectedRatioLabel}` : ''}`;

  const players: Player[] = eligibleParticipants.map((p) => ({
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
      participantRestrictions?.onPress(id);
      return;
    }
    if (!isSelected && restrictedParticipantIdSet.has(id)) {
      participantRestrictions?.onPress(id);
      return;
    }
    if (isSelected) {
      updateSelection(selectedIds.filter((participantId) => participantId !== id));
      return;
    }
    if (participantRestrictions && selectedIds.length >= ULTIMATE_LINE_SIZE) return;
    updateSelection([...selectedIds, id]);
  };

  const handleSelectPreset = (preset: LinePreset) => {
    setSelectedPresetId(preset.id);
    setSelectedRecentPointNumber(null);
    setShowAllPlayers(false);
    const availablePresetIds = preset.playerIds.filter((id) => eligibleParticipantIds.has(id));
    updateSelection(withRestrictions(availablePresetIds, initialSelectionIds));
  };

  const handleSelectRecentLine = (recent: RecentLine) => {
    setSelectedRecentPointNumber(recent.pointNumber);
    setSelectedPresetId(null);
    const availableParticipantIds = new Set(
      eligibleParticipants.map((participant) => participant.id),
    );
    const availableRecentIds = recent.playerIds.filter((id) => availableParticipantIds.has(id));
    if (availableRecentIds.some((id) => !defaultParticipantIds.has(id))) {
      setShowAllPlayers(true);
    }
    updateSelection(withRestrictions(availableRecentIds, initialSelectionIds));
  };

  const playerRestrictions = new Map<string, PlayerChipRestriction>();
  for (const participantId of new Set([...lockedParticipantIds, ...restrictedParticipantIds])) {
    playerRestrictions.set(participantId, {
      accessibilityHint: 'Unavailable for this lineup correction',
      onPress: () => participantRestrictions?.onPress(participantId),
    });
  }

  const sourceLabel =
    selectedPreset?.name ??
    (selectedRecentPointNumber != null ? `Pt ${selectedRecentPointNumber}` : 'Choose line');
  const selectionDifference = selectedIds.length - ULTIMATE_LINE_SIZE;
  const needsLineChanges = requireChanges && !hasSubChanges;
  let selectionHint = 'Ready for this point';
  if (selectionDifference > 0) selectionHint = `Deselect ${selectionDifference} to continue`;
  else if (selectionDifference < 0) selectionHint = `Choose ${-selectionDifference} more`;
  else if (needsLineChanges) selectionHint = 'Choose a replacement player';
  const clearSelection = () => updateSelection(withRestrictions([]));
  const browseRoster = () => {
    setSelectedPresetId(null);
    setSelectedRecentPointNumber(null);
    setShowAllPlayers(true);
  };
  const headerActions = [
    {
      key: 'clear-line',
      label: 'Clear selection',
      onPress: clearSelection,
      disabled: isConfirming || selectedIds.length === lockedParticipantIds.length,
      inlineIcon: (
        <MaterialCommunityIcons
          name="eraser"
          size={scaleBySizeClass(20, sizeClass)}
          color={palette.textMuted}
        />
      ),
      advancedMenuIcon: 'eraser' as const,
    },
    {
      key: 'reload-line',
      label: 'Reload preset',
      onPress: () => {
        if (selectedPreset) handleSelectPreset(selectedPreset);
      },
      disabled: isConfirming || !selectedPreset,
      inlineIcon: (
        <MaterialCommunityIcons
          name="reload"
          size={scaleBySizeClass(20, sizeClass)}
          color={palette.textMuted}
        />
      ),
      advancedMenuIcon: 'reload' as const,
    },
    {
      key: 'browse-roster',
      label: 'Show full roster',
      onPress: browseRoster,
      disabled: isConfirming,
      inlineIcon: (
        <MaterialCommunityIcons
          name="account-group-outline"
          size={scaleBySizeClass(20, sizeClass)}
          color={palette.textMuted}
        />
      ),
      advancedMenuIcon: 'account-group-outline' as const,
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={styles.headerTop}>
          {onBack && (
            <Pressable
              testID="line-select-back"
              accessibilityRole="button"
              accessibilityLabel="Back"
              disabled={isConfirming}
              onPress={onBack}
              style={styles.backBtn}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.textInverse}
              />
            </Pressable>
          )}
          <ThemedText
            testID="line-select-title"
            style={[styles.headerTitle, { color: palette.textInverse }]}>
            {headerTitle}
          </ThemedText>
        </View>
        <View style={styles.presetsRow}>
          <Pressable
            testID="line-select-load-line"
            accessibilityRole="button"
            accessibilityLabel={`Choose line, ${sourceLabel}`}
            disabled={isConfirming}
            onPress={() => setShowLinePicker(true)}
            style={({ pressed }) => [
              styles.loadLineBtn,
              { borderColor: palette.border },
              pressed && { opacity: 0.7 },
            ]}>
            <MaterialCommunityIcons
              name="layers-outline"
              size={scaleBySizeClass(18, sizeClass)}
              color={palette.textMuted}
            />
            <ThemedText style={[styles.loadLineText, { color: palette.textInverse }]}>
              {sourceLabel}
            </ThemedText>
            <MaterialCommunityIcons
              name="chevron-down"
              size={scaleBySizeClass(20, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
          <ResponsiveHeaderActions
            actions={headerActions}
            menuVariant="advanced"
            menuTitle="LINE ACTIONS"
          />
        </View>
      </View>
      <View
        collapsable={false}
        style={styles.gridContainer}
        pointerEvents={isConfirming ? 'none' : 'auto'}>
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
          unavailableNames={unavailablePresetNames}
          focusIds={focusedParticipantIds}
          showOtherPlayers={showAllPlayers}
          onToggleOtherPlayers={() => setShowAllPlayers((value) => !value)}
        />
      </View>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <View style={styles.selectionStatus} accessibilityLiveRegion="polite">
          <View style={styles.selectionSummary}>
            <ThemedText
              style={[
                styles.countText,
                {
                  color: selectionDifference > 0 ? palette.warning : palette.textInverse,
                },
              ]}>
              {selectedIds.length}/{ULTIMATE_LINE_SIZE}
            </ThemedText>
            <ThemedText style={[styles.hint, { color: palette.textMuted }]}>
              {selectionHint}
            </ThemedText>
          </View>
          {ratioMismatch && (
            <ThemedText style={[styles.hint, { color: palette.warning }]}>
              Expecting {expectedRatio === 'more-women' ? 'F' : 'M'} majority
            </ThemedText>
          )}
        </View>
        <Pressable
          testID="line-select-confirm"
          accessibilityRole="button"
          onPress={handleConfirm}
          disabled={!canConfirm || isConfirming}
          style={({ pressed }) => [
            styles.confirmBtn,
            {
              backgroundColor: canConfirm ? palette.success : palette.overlay10,
            },
            pressed && { opacity: 0.8 },
          ]}>
          <ThemedText
            style={[
              styles.confirmText,
              { color: canConfirm ? palette.textOnAccent : palette.textMuted },
            ]}>
            {isConfirming ? 'SAVING…' : (confirmLabel ?? 'Confirm line')}
          </ThemedText>
        </Pressable>
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
    </ThemedView>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      gap: 8,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    backBtn: {
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      flex: 1,
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    presetsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    loadLineBtn: {
      flex: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderWidth: 1,
      borderRadius: 10,
    },
    loadLineText: {
      flex: 1,
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    gridContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: 1,
      gap: 10,
    },
    selectionStatus: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    selectionSummary: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
    },
    countText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },
    hint: { fontSize: scaleBySizeClass(13, sizeClass), flexShrink: 1 },
    confirmBtn: {
      minHeight: 44,
      flexShrink: 1,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.bold,
      textAlign: 'center',
    },
  });
}
