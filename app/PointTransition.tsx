import { ModalPlayerGrid, SortDirection } from '@/components/lines/ModalPlayerGrid';
import { useTheme } from '@/context/ThemeContext';
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
import { InteractionManager, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    timerIsActive,
    team1Score,
    team2Score,
  } = useGameStore();

  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();

  // Get presets for the team
  const allPresets = useLinePresetsStore((state) => state.presets);
  const presets = allPresets.filter((p) => p.teamId === (currentTeam?.id ?? ''));

  // Local selection state
  const [selectedIds, setSelectedIds] = useState<string[]>(currentLine);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleSort = () => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));

  const gameActive = timerIsActive || team1Score !== 0 || team2Score !== 0;

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
    if (selectedPresetId === preset.id) {
      setSelectedPresetId(null);
      setSelectedIds([]);
      return;
    }
    setSelectedPresetId(preset.id);
    setSelectedIds(preset.playerIds);
  };

  const handleDone = () => {
    router.dismissTo('/');

    InteractionManager.runAfterInteractions(() => {
      if (selectedIds.length === 7) {
        setCurrentLine(selectedIds);
        recordLineForPoint(currentPoint, false);
      }
    });
  };

  const canConfirm = selectedIds.length === 7;

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
            <Text style={[styles.nextPointLabel, { color: palette.textMuted }]}>
              Next Point{expectedRatioLabel ? ` · ${expectedRatioLabel}` : ''}
            </Text>
            {showRatioWarning && (
              <View style={[styles.ratioWarningChip, { backgroundColor: palette.warning + '20' }]}>
                <MaterialCommunityIcons name="alert" size={12} color={palette.warning} />
                <Text style={[styles.ratioWarningText, { color: palette.warning }]}>
                  Expecting {expectedRatio === 'more-women' ? 'F' : 'M'} majority
                </Text>
              </View>
            )}
            <Pressable
              onPress={handleDone}
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
                  {selectedIds.length}/7
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Stats Row */}
        {lastPoint && (
          <View style={styles.statsRow}>
            {lastPoint.pointDurationMs && (
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
        )}
      </View>

      {/* Line Selection Section */}
      <View style={styles.lineSection}>
        {/* Presets + Controls Row */}
        <View style={[styles.controlsRow, { borderBottomColor: palette.border }]}>
          <View style={styles.presetsContainer}>
            {presets.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsScrollContent}>
                {presets.map((preset) => {
                  const isValid = preset.playerIds.length === 7;
                  return (
                    <Pressable
                      key={preset.id}
                      onPress={() => isValid && handleSelectPreset(preset)}
                      style={({ pressed }) => [
                        styles.presetChip,
                        {
                          backgroundColor:
                            selectedPresetId === preset.id ? palette.accent : palette.overlay08,
                          borderColor:
                            selectedPresetId === preset.id ? palette.accent : palette.overlay15,
                          opacity: isValid ? 1 : 0.5,
                        },

                        pressed && isValid && { opacity: 0.8 },
                      ]}>
                      {selectedPresetId === preset.id && (
                        <MaterialCommunityIcons
                          name="check"
                          size={12}
                          color={palette.textOnAccent}
                        />
                      )}
                      <Text
                        style={[
                          styles.presetChipText,
                          {
                            color:
                              selectedPresetId === preset.id
                                ? palette.textOnAccent
                                : palette.textInverse,
                          },
                        ]}
                        numberOfLines={1}>
                        {preset.name}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => router.push('/LinePresetEditor')}
                  style={({ pressed }) => [
                    styles.presetChip,
                    styles.editPresetsChip,
                    { borderColor: palette.overlay15 },
                    pressed && { opacity: 0.8 },
                  ]}>
                  <MaterialCommunityIcons name="pencil" size={12} color={palette.textMuted} />
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
                <MaterialCommunityIcons name="plus" size={12} color={palette.textMuted} />
                <Text style={[styles.presetChipText, { color: palette.textMuted }]}>Preset</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.rightControls}>
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
                color={palette.textMuted}
              />
            </Pressable>
          </View>
        </View>

        {/* Player Grid */}
        <View style={styles.gridContainer}>
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
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  confirmBtn: {
    paddingVertical: 8,
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
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lineSection: {
    flex: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  presetsContainer: {
    flex: 1,
    marginRight: 12,
  },
  presetsScrollContent: {
    gap: 6,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editPresetsChip: {
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  ratioWarningChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  ratioWarningText: {
    fontSize: 10,
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
});
