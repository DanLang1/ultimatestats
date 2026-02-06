import { ModalPlayerGrid, SortDirection } from '@/components/lines/ModalPlayerGrid';
import { PresetPickerModal } from '@/components/lines/PresetPickerModal';
import { useTheme } from '@/context/ThemeContext';
import { useIsGameActive } from '@/hooks/useIsGameActive';
import {
  checkLineRatio,
  formatRatio,
  getExpectedRatio,
  getSequenceNumber,
} from '@/lib/genderRatioUtils';
import { computePointByPointEvents, getTurnoverSummary } from '@/lib/timelineUtils';
import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function PointTransition() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    events,
    startingPossession,
    gameTo,
    pointStartTimestamps,
    currentTeam,
    currentPoint,
    currentLine,
    pointLines,
    setCurrentLine,
    recordLineForPoint,
  } = useGameStore();

  const { genderRatioEnabled, firstPointRatio, numPlayers } = useSettingsStore();

  // Get presets for the team
  const allPresets = useLinePresetsStore((state) => state.presets);
  const setLineConfirmedForNextPoint = useLinePresetsStore(
    (state) => state.setLineConfirmedForNextPoint,
  );
  const presets = allPresets.filter((p) => p.teamId === (currentTeam?.id ?? ''));

  // Local selection state
  const [selectedIds, setSelectedIds] = useState<string[]>(currentLine);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  // Increment sortKey to trigger a re-sort (initial load, preset selection, sort toggle)
  const [sortKey, setSortKey] = useState(0);

  // Presets display config
  const MAX_VISIBLE_PRESETS = 5;
  const validPresets = presets.filter((p) => p.playerIds.length >= numPlayers);
  const visiblePresets = validPresets.slice(0, MAX_VISIBLE_PRESETS);
  const overflowCount = validPresets.length - MAX_VISIBLE_PRESETS;

  const toggleSort = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setSortKey((k) => k + 1);
  };

  const gameActive = useIsGameActive();

  // Compute the last completed point for summary
  const pointEvents = computePointByPointEvents(
    events,
    startingPossession,
    gameTo,
    pointStartTimestamps,
    null,
  );

  const completedPoints = pointEvents.filter((p) => !p.isInProgress);
  const lastPoint = completedPoints[completedPoints.length - 1];

  // Get summary data if we have a completed point
  const turnoverSummary = lastPoint ? getTurnoverSummary(lastPoint.turnovers, 'team1') : null;
  const totalTurnovers = lastPoint
    ? lastPoint.turnovers.filter((t) => t.team === 'team1').length
    : 0;
  const pointOutcome = lastPoint
    ? getPointOutcome(lastPoint.scoringTeam, lastPoint.offensiveTeam, totalTurnovers)
    : null;

  const roster = currentTeam?.roster ?? [];
  const activePlayers = roster.filter((p) => p.isActive !== false);

  const handleTogglePlayer = (playerId: string) => {
    setSelectedPresetId(null);
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
      setSortKey((k) => k + 1);
      return;
    }
    setSelectedPresetId(preset.id);
    setSelectedIds(preset.playerIds);
    setSortKey((k) => k + 1);
  };

  const handleDone = () => {
    router.dismissTo('/');

    requestIdleCallback(() => {
      if (selectedIds.length === numPlayers) {
        setCurrentLine(selectedIds);
        recordLineForPoint(currentPoint, false);
        setLineConfirmedForNextPoint(true);
      }
    });
  };

  const handleSkip = () => {
    router.dismissTo('/');
  };

  const handleGoToEditRoster = () => {
    router.dismissTo('/');
    router.push('/EditRoster');
  };

  const canConfirm = selectedIds.length === numPlayers;

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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.primary,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}>
      {/* Header - Point Summary + Confirm */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => [
                styles.skipBtn,
                { borderColor: palette.overlay15, marginRight: 4 },
                pressed && { opacity: 0.7 },
              ]}
              hitSlop={8}>
              <MaterialCommunityIcons name="close" size={18} color={palette.textMuted} />
            </Pressable>
            {lastPoint ? (
              <>
                <Text style={[styles.headerTitle, { color: palette.textInverse }]}>
                  Point {lastPoint.pointNumber} Complete
                </Text>
                {pointOutcome && (
                  <View
                    style={[
                      styles.outcomeChip,
                      {
                        backgroundColor: pointOutcome.isPositive
                          ? palette.success + '20'
                          : palette.danger + '20',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.outcomeText,
                        { color: pointOutcome.isPositive ? palette.success : palette.danger },
                      ]}>
                      {pointOutcome.label}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={[styles.headerTitle, { color: palette.textInverse }]}>Set Line</Text>
            )}
          </View>

          {/* Next Point Info + Confirm Button */}
          <View style={styles.headerRight}>
            {genderRatioEnabled && (
              <Text style={[styles.nextPointLabel, { color: palette.textMuted }]}>
                Ratio{expectedRatioLabel ? ` · ${expectedRatioLabel}` : ''}
              </Text>
            )}
            {showRatioWarning && (
              <View style={[styles.ratioWarningChip, { backgroundColor: palette.warning + '20' }]}>
                <MaterialCommunityIcons name="alert" size={14} color={palette.warning} />
                <Text style={[styles.ratioWarningText, { color: palette.warning }]}>
                  Expecting {expectedRatio === 'more-women' ? 'F' : 'M'} majority
                </Text>
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
              hitSlop={8}>
              {canConfirm ? (
                <MaterialCommunityIcons name="check" size={18} color={palette.textOnAccent} />
              ) : (
                <Text style={[styles.countText, { color: palette.textMuted }]}>
                  {selectedIds.length}/{numPlayers}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Stats + Presets Row */}
        <View style={styles.statsRow}>
          {/* Stats (left) */}
          <View style={styles.statsLeft}>
            {lastPoint?.pointDurationMs && (
              <View style={[styles.statChip, { backgroundColor: palette.overlay05 }]}>
                <MaterialCommunityIcons name="timer-outline" size={14} color={palette.textMuted} />
                <Text style={[styles.statText, { color: palette.textInverse }]}>
                  {formatDuration(lastPoint.pointDurationMs)}
                </Text>
              </View>
            )}
            {totalTurnovers > 0 && (
              <View style={[styles.statChip, { backgroundColor: palette.overlay05 }]}>
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={14}
                  color={palette.textMuted}
                />
                <Text style={[styles.statText, { color: palette.textInverse }]}>
                  {totalTurnovers} turn{totalTurnovers !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {turnoverSummary && turnoverSummary.blocks > 0 && (
              <View style={[styles.statChip, { backgroundColor: palette.overlay05 }]}>
                <MaterialCommunityIcons
                  name="hand-back-left-outline"
                  size={14}
                  color={palette.textMuted}
                />
                <Text style={[styles.statText, { color: palette.textInverse }]}>
                  {turnoverSummary.blocks} block{turnoverSummary.blocks !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Presets + Sort (right) */}
          <View style={styles.statsRight}>
            {visiblePresets.map((preset) => (
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
                {selectedPresetId === preset.id && (
                  <MaterialCommunityIcons name="check" size={10} color={palette.textOnAccent} />
                )}
                <Text
                  style={[
                    styles.presetChipText,
                    {
                      color:
                        selectedPresetId === preset.id ? palette.textOnAccent : palette.textInverse,
                    },
                  ]}
                  numberOfLines={1}>
                  {preset.name}
                </Text>
              </Pressable>
            ))}
            {overflowCount > 0 && (
              <Pressable
                onPress={() => setShowPresetPicker(true)}
                style={({ pressed }) => [
                  styles.presetChip,
                  styles.overflowChip,
                  { backgroundColor: palette.overlay08, borderColor: palette.overlay15 },
                  pressed && { opacity: 0.8 },
                ]}>
                <Text style={[styles.presetChipText, { color: palette.textMuted }]}>
                  +{overflowCount}
                </Text>
              </Pressable>
            )}
            {validPresets.length === 0 && (
              <Pressable
                onPress={() => router.push('/LinePresetEditor')}
                style={({ pressed }) => [
                  styles.presetChip,
                  { borderColor: palette.overlay15, backgroundColor: palette.overlay08 },
                  pressed && { opacity: 0.8 },
                ]}>
                <MaterialCommunityIcons name="plus" size={10} color={palette.textMuted} />
                <Text style={[styles.presetChipText, { color: palette.textMuted }]}>Preset</Text>
              </Pressable>
            )}
            <Pressable
              onPress={toggleSort}
              style={({ pressed }) => [
                styles.sortBtn,
                { borderColor: palette.overlay15 },
                pressed && { opacity: 0.7 },
              ]}>
              <MaterialCommunityIcons
                name={sortDirection === 'asc' ? 'sort-ascending' : 'sort-descending'}
                size={14}
                color={palette.textMuted}
              />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Player Grid or Empty State */}
      <View style={styles.gridContainer}>
        {activePlayers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={48}
              color={palette.textMuted}
            />
            <Text style={[styles.emptyStateTitle, { color: palette.textInverse }]}>
              No Active Players
            </Text>
            <Text style={[styles.emptyStateText, { color: palette.textMuted }]}>
              Add players to your roster to set a line for the next point
            </Text>
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
                  size={18}
                  color={palette.textOnAccent}
                />
                <Text style={[styles.emptyStateBtnText, { color: palette.textOnAccent }]}>
                  Edit Roster
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSkip}
                style={({ pressed }) => [
                  styles.emptyStateBtn,
                  { backgroundColor: palette.overlay10 },
                  pressed && { opacity: 0.8 },
                ]}>
                <Text style={[styles.emptyStateBtnText, { color: palette.textMuted }]}>
                  Skip for Now
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ModalPlayerGrid
            roster={activePlayers}
            pointLines={pointLines}
            selectedIds={selectedIds}
            onTogglePlayer={handleTogglePlayer}
            sortDirection={sortDirection}
            sortSelectedFirst={selectedPresetId !== null || selectedIds.length > 0}
            sortKey={sortKey}
            gameActive={gameActive}
          />
        )}
      </View>

      {/* Preset Picker Bottom Sheet */}
      <PresetPickerModal
        visible={showPresetPicker}
        onClose={() => setShowPresetPicker(false)}
        presets={validPresets}
        selectedPresetId={selectedPresetId}
        onSelectPreset={(preset) => {
          handleSelectPreset(preset);
          setShowPresetPicker(false);
        }}
        onEditPresets={() => {
          setShowPresetPicker(false);
          router.push('/LinePresetEditor');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  outcomeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  skipBtn: {
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
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  statsLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  statsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    maxWidth: 80,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  overflowChip: {
    paddingHorizontal: 6,
  },
  sortBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  ratioWarningChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  ratioWarningText: {
    fontSize: 11,
    fontWeight: '700',
  },
  nextPointLabel: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
    fontSize: 14,
    fontWeight: '600',
  },
});
