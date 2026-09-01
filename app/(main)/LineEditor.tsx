import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalPlayerGrid } from '@/components/lines/ModalPlayerGrid';
import { PresetPickerModal } from '@/components/lines/PresetPickerModal';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useIsGameActive } from '@/hooks/basic/useIsGameActive';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { computePointByPointEvents } from '@/lib/basic/timelineUtils';
import {
  checkLineRatio,
  formatRatio,
  getExpectedRatio,
  getSequenceNumber,
} from '@/lib/genderRatioUtils';
import { getLoadLineButtonState } from '@/lib/lineEditorUtils';
import { getRecentLines, RecentLine } from '@/lib/lineUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

type PointOutcome = {
  label: string;
  isPositive: boolean;
};

function getPointOutcome(
  scoringTeam: 'team1' | 'team2',
  offensiveTeam: 'team1' | 'team2',
  turnoverCount: number,
): PointOutcome {
  const weScored = scoringTeam === 'team1';
  const weStartedOnOffense = offensiveTeam === 'team1';

  if (weStartedOnOffense) {
    if (weScored) {
      return turnoverCount === 0
        ? { label: 'CLEAN HOLD', isPositive: true }
        : { label: 'DIRTY HOLD', isPositive: true };
    }
    return { label: 'BROKEN', isPositive: false };
  }
  if (weScored) {
    return { label: 'BREAK', isPositive: true };
  }
  return { label: 'OPP HOLD', isPositive: false };
}

export default function LineEditor() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEditLineMode = mode === 'edit-line';

  const {
    events,
    startingPossession,
    gameTo,
    autoHalftimeEnabled,
    pointStartTimestamps,
    currentTeam,
    currentPoint,
    currentLine,
    pointLines,
    setCurrentLine,
    recordLineForPoint,
  } = useGameStore();

  const { genderRatioEnabled, firstPointRatio, numPlayers, linePlayerSortOrder } =
    useSettingsStore();

  // Get presets for the team
  const allPresets = useLinePresetsStore((state) => state.presets);
  const setLineConfirmedForNextPoint = useLinePresetsStore(
    (state) => state.setLineConfirmedForNextPoint,
  );
  const presets = allPresets.filter((p) => p.teamId === currentTeam.id);
  const quickPresets = presets.slice(0, 3);
  const recentLines: RecentLine[] = getRecentLines(pointLines, currentPoint);

  // Local selection state
  const [selectedIds, setSelectedIds] = useState<string[]>(currentLine);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [selectedRecentPointNumber, setSelectedRecentPointNumber] = useState<number | null>(null);
  const [showLinePicker, setShowLinePicker] = useState(false);
  const [subType, setSubType] = useState<'injury' | 'replacement'>('injury');
  const [showSubTypeHint, setShowSubTypeHint] = useState(false);

  const gameActive = useIsGameActive();

  // Compute the last completed point for summary
  const pointEvents = computePointByPointEvents(
    events,
    startingPossession,
    gameTo,
    pointStartTimestamps,
    null,
    autoHalftimeEnabled,
  );

  const completedPoints = pointEvents.filter((p) => !p.isInProgress);
  const lastPoint = completedPoints[completedPoints.length - 1];

  // Get summary data if we have a completed point
  const totalTurnovers = lastPoint
    ? lastPoint.turnovers.filter((t) => t.team === 'team1').length
    : 0;
  const pointOutcome = lastPoint
    ? getPointOutcome(lastPoint.scoringTeam, lastPoint.offensiveTeam, totalTurnovers)
    : null;

  const roster = currentTeam.roster;
  const activePlayers = roster.filter((p) => p.isActive !== false);
  const hasExistingLine = pointLines.some((record) => record.pointNumber === currentPoint);

  const handleTogglePlayer = (playerId: string) => {
    setSelectedPresetId(null);
    setSelectedRecentPointNumber(null);
    // No sortKey change - manual selection doesn't trigger re-sort
    setSelectedIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length >= numPlayers) {
        return prev;
      }
      return [...prev, playerId];
    });
  };

  const handleSelectPreset = (preset: { id: string; playerIds: string[] }) => {
    if (selectedPresetId === preset.id) {
      setSelectedPresetId(null);
      setSelectedIds([]);
      return;
    }
    setSelectedPresetId(preset.id);
    setSelectedRecentPointNumber(null);
    setSelectedIds(preset.playerIds);
  };

  const handleSelectRecentLine = (recent: RecentLine) => {
    if (selectedRecentPointNumber === recent.pointNumber) {
      setSelectedRecentPointNumber(null);
      setSelectedIds([]);
      return;
    }
    setSelectedRecentPointNumber(recent.pointNumber);
    setSelectedPresetId(null);
    setSelectedIds(recent.playerIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setSelectedPresetId(null);
    setSelectedRecentPointNumber(null);
  };

  const handleDone = () => {
    router.dismissTo('/Scoreboard');

    requestIdleCallback(() => {
      if (selectedIds.length === numPlayers) {
        setCurrentLine(selectedIds);
        if (isEditLineMode) {
          recordLineForPoint(currentPoint, true, hasExistingLine ? subType : undefined);
          return;
        }

        recordLineForPoint(currentPoint, false);
        setLineConfirmedForNextPoint(true);
      }
    });
  };

  const handleSkip = () => {
    router.dismissTo('/Scoreboard');
  };

  const handleGoToEditRoster = () => {
    router.dismissTo('/Scoreboard');
    router.push('/EditRoster');
  };

  const canConfirm = selectedIds.length === numPlayers;
  const { active: loadLineButtonActive, label: loadLineButtonLabel } = getLoadLineButtonState({
    presets,
    quickPresetIds: quickPresets.map((preset) => preset.id),
    selectedPresetId,
    selectedRecentPointNumber,
  });

  // Check gender ratio if enabled
  const expectedRatio =
    genderRatioEnabled && firstPointRatio ? getExpectedRatio(currentPoint, firstPointRatio) : null;
  const ratioCheck =
    expectedRatio && roster.length > 0 ? checkLineRatio(selectedIds, roster, expectedRatio) : null;
  const hasClearMajority = ratioCheck && ratioCheck.fmpCount !== ratioCheck.mmpCount;
  const showRatioWarning =
    ratioCheck && !ratioCheck.isCorrect && selectedIds.length > 0 && hasClearMajority;

  const expectedRatioLabel = expectedRatio
    ? formatRatio(expectedRatio, getSequenceNumber(currentPoint))
    : null;

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  let headerTitle: string;
  if (isEditLineMode) {
    headerTitle = `Edit Line · Point ${currentPoint}`;
  } else if (lastPoint) {
    headerTitle = `Point ${lastPoint.pointNumber}`;
  } else {
    headerTitle = 'Set Line';
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.primary }]}>
      {/* Header - Point Summary + Confirm */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        {/* Top row: always skip | title | confirm */}
        <View style={styles.headerTop}>
          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => [
              styles.skipBtn,
              { borderColor: palette.overlay15 },
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={scaleBySizeClass(8, sizeClass)}>
            <MaterialCommunityIcons
              name="close"
              size={scaleBySizeClass(18, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
          <View style={styles.headerTitleRow}>
            <ThemedText style={[styles.headerTitle, { color: palette.textInverse }]}>
              {headerTitle}
            </ThemedText>
            {!isEditLineMode && pointOutcome && (
              <ThemedText
                style={[
                  styles.headerOutcome,
                  { color: pointOutcome.isPositive ? palette.success : palette.danger },
                ]}>
                {' · '}
                {pointOutcome.label}
              </ThemedText>
            )}
            {!isEditLineMode && lastPoint?.pointDurationMs != null && (
              <ThemedText style={[styles.headerDuration, { color: palette.textMuted }]}>
                {' · '}
                {formatDuration(lastPoint.pointDurationMs)}
              </ThemedText>
            )}
          </View>
          {/* Ratio inline in landscape */}
          {isLandscape && (genderRatioEnabled || showRatioWarning) && (
            <View style={styles.ratioInline}>
              {genderRatioEnabled && (
                <ThemedText style={[styles.nextPointLabel, { color: palette.textMuted }]}>
                  Ratio{expectedRatioLabel ? ` · ${expectedRatioLabel}` : ''}
                </ThemedText>
              )}
              {showRatioWarning && (
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
              )}
            </View>
          )}
          <Pressable
            onPress={handleDone}
            disabled={!canConfirm}
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: canConfirm ? palette.success : palette.overlay10 },
              pressed && canConfirm && { opacity: 0.8 },
            ]}
            hitSlop={scaleBySizeClass(8, sizeClass)}>
            {canConfirm ? (
              <MaterialCommunityIcons
                name="check"
                size={scaleBySizeClass(18, sizeClass)}
                color={palette.textOnAccent}
              />
            ) : (
              <ThemedText style={[styles.countText, { color: palette.textMuted }]}>
                {selectedIds.length}/{numPlayers}
              </ThemedText>
            )}
          </Pressable>
        </View>

        {/* Ratio info row - portrait only */}
        {!isLandscape && (genderRatioEnabled || showRatioWarning) && (
          <View style={styles.infoRow}>
            {genderRatioEnabled && (
              <ThemedText style={[styles.nextPointLabel, { color: palette.textMuted }]}>
                Ratio{expectedRatioLabel ? ` · ${expectedRatioLabel}` : ''}
              </ThemedText>
            )}
            {showRatioWarning && (
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
            )}
          </View>
        )}

        {/* Load Line + Clear Row */}
        <View style={styles.presetsRow}>
          {quickPresets.map((preset) => {
            const isSelected = selectedPresetId === preset.id;

            return (
              <Pressable
                key={preset.id}
                onPress={() => handleSelectPreset(preset)}
                style={({ pressed }) => [
                  styles.quickPresetBtn,
                  {
                    backgroundColor: isSelected ? palette.accent : palette.overlay08,
                    borderColor: isSelected ? palette.accent : palette.overlay15,
                  },
                  pressed && { opacity: 0.8 },
                ]}>
                <ThemedText
                  style={[
                    styles.quickPresetBtnText,
                    { color: isSelected ? palette.textOnAccent : palette.textInverse },
                  ]}
                  numberOfLines={1}>
                  {preset.name}
                </ThemedText>
              </Pressable>
            );
          })}
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
                {
                  color: loadLineButtonActive ? palette.textOnAccent : palette.textMuted,
                },
              ]}
              numberOfLines={1}>
              {loadLineButtonLabel}
            </ThemedText>
          </Pressable>
          {selectedIds.length > 0 && (
            <Pressable
              onPress={handleClearSelection}
              style={({ pressed }) => [
                styles.sortBtn,
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
          roster={activePlayers}
        />

        {isEditLineMode && hasExistingLine && (
          <View style={styles.subTypeSection}>
            <View style={styles.subTypeRow}>
              <Pressable
                onPress={() => setSubType('injury')}
                style={({ pressed }) => [
                  styles.subTypeChip,
                  {
                    backgroundColor: subType === 'injury' ? palette.accent : palette.overlay08,
                    borderColor: subType === 'injury' ? palette.accent : palette.overlay15,
                  },
                  pressed && { opacity: 0.8 },
                ]}>
                <ThemedText
                  style={[
                    styles.subTypeChipText,
                    { color: subType === 'injury' ? palette.textOnAccent : palette.textInverse },
                  ]}>
                  Injury Sub
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setSubType('replacement')}
                style={({ pressed }) => [
                  styles.subTypeChip,
                  {
                    backgroundColor: subType === 'replacement' ? palette.accent : palette.overlay08,
                    borderColor: subType === 'replacement' ? palette.accent : palette.overlay15,
                  },
                  pressed && { opacity: 0.8 },
                ]}>
                <ThemedText
                  style={[
                    styles.subTypeChipText,
                    {
                      color: subType === 'replacement' ? palette.textOnAccent : palette.textInverse,
                    },
                  ]}>
                  Replace Line
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setShowSubTypeHint((value) => !value)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.subTypeInfoBtn,
                  {
                    borderColor: showSubTypeHint ? palette.accent : palette.overlay15,
                    backgroundColor: showSubTypeHint ? palette.accent : 'transparent',
                  },
                  pressed && { opacity: 0.7 },
                ]}>
                <ThemedText
                  style={[
                    styles.subTypeInfoText,
                    { color: showSubTypeHint ? palette.textOnAccent : palette.textMuted },
                  ]}>
                  ?
                </ThemedText>
              </Pressable>
            </View>
            {showSubTypeHint && (
              <ThemedText style={[styles.subTypeHint, { color: palette.textMuted }]}>
                {subType === 'injury'
                  ? 'Both old and new players get point credit'
                  : 'Only the new lineup gets point credit'}
              </ThemedText>
            )}
          </View>
        )}
      </View>

      {/* Player Grid or Empty State */}
      <View style={styles.gridContainer}>
        {activePlayers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={scaleBySizeClass(48, sizeClass)}
              color={palette.textMuted}
            />
            <ThemedText style={[styles.emptyStateTitle, { color: palette.textInverse }]}>
              No Active Players
            </ThemedText>
            <ThemedText style={[styles.emptyStateText, { color: palette.textMuted }]}>
              Add players to your roster to set a line for the next point
            </ThemedText>
            <View style={styles.emptyStateButtons}>
              <Pressable
                onPress={handleGoToEditRoster}
                style={({ pressed }) => [
                  styles.emptyStateBtn,
                  { backgroundColor: palette.accent },
                  pressed && { opacity: 0.8 },
                ]}>
                <MaterialCommunityIcons
                  name="account-plus"
                  size={scaleBySizeClass(18, sizeClass)}
                  color={palette.textOnAccent}
                />
                <ThemedText style={[styles.emptyStateBtnText, { color: palette.textOnAccent }]}>
                  Edit Roster
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSkip}
                style={({ pressed }) => [
                  styles.emptyStateBtn,
                  { backgroundColor: palette.overlay10 },
                  pressed && { opacity: 0.8 },
                ]}>
                <ThemedText style={[styles.emptyStateBtnText, { color: palette.textMuted }]}>
                  Skip for Now
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          <ModalPlayerGrid
            roster={activePlayers}
            pointLines={pointLines}
            selectedIds={selectedIds}
            onTogglePlayer={handleTogglePlayer}
            sortDirection={linePlayerSortOrder}
            gameActive={gameActive}
            currentPoint={currentPoint}
          />
        )}
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
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flex: 1,
    },
    headerTitle: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    headerOutcome: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
    headerDuration: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
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
    skipBtn: {
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ratioInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
    subTypeSection: {
      marginTop: 10,
      gap: 6,
    },
    subTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    subTypeChip: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    subTypeChipText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    subTypeInfoBtn: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subTypeInfoText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
    },
    subTypeHint: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontStyle: 'italic',
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
    sortBtn: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
    },
    nextPointLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    gridContainer: {
      flex: 1,
      paddingHorizontal: 12,
      paddingTop: 8,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyStateTitle: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
      marginTop: 8,
    },
    emptyStateText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
      lineHeight: scaleBySizeClass(20, sizeClass),
    },
    emptyStateButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    emptyStateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
    },
    emptyStateBtnText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
