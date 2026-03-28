import { ModalPlayerGrid } from '@/components/lines/ModalPlayerGrid';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { usePulseAnimation } from '@/hooks/usePulseAnimation';
import { RatioCheckResult } from '@/lib/genderRatioUtils';
import { Player } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { TutorialPreset } from './tutorialStatData';

interface TutorialLineEditorProps {
  roster: Player[];
  presets: TutorialPreset[];
  currentLine: string[];
  numPlayers: number;
  expectedRatioLabel: string;
  pointNumber: number;
  ratioCheck: RatioCheckResult | null;
  selectedPresetId: string | null;
  highlightPreset?: boolean;
  onSelectPreset: (presetId: string) => void;
  onTogglePlayer: (playerId: string) => void;
  onConfirm: () => void;
}

export default function TutorialLineEditor({
  roster,
  presets,
  currentLine,
  numPlayers,
  expectedRatioLabel,
  pointNumber,
  ratioCheck,
  selectedPresetId,
  highlightPreset = false,
  onSelectPreset,
  onTogglePlayer,
  onConfirm,
}: TutorialLineEditorProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(sizeClass, isLandscape);
  const presetPulseStyle = usePulseAnimation(highlightPreset);

  const canConfirm = currentLine.length === numPlayers && (!ratioCheck || ratioCheck.isCorrect);
  const hasClearMajority = ratioCheck && ratioCheck.fmpCount !== ratioCheck.mmpCount;
  const showRatioWarning =
    ratioCheck && !ratioCheck.isCorrect && currentLine.length > 0 && hasClearMajority;

  return (
    <View style={[styles.container, { backgroundColor: palette.primary }]}>
      {/* Header — matches real LineEditor layout */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        {/* Top row: title | (ratio inline in landscape) | confirm */}
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <ThemedText style={[styles.headerTitle, { color: palette.textInverse }]}>
              Set Line · Point {pointNumber}
            </ThemedText>
          </View>
          {/* Ratio inline in landscape */}
          {isLandscape && (
            <View style={styles.ratioInline}>
              <ThemedText style={[styles.nextPointLabel, { color: palette.textMuted }]}>
                Ratio · {expectedRatioLabel}
              </ThemedText>
              {showRatioWarning && (
                <View style={[styles.infoChip, { backgroundColor: palette.warning + '20' }]}>
                  <MaterialCommunityIcons
                    name="alert"
                    size={scaleBySizeClass(14, sizeClass)}
                    color={palette.warning}
                  />
                  <ThemedText style={[styles.infoChipText, { color: palette.warning }]}>
                    Expecting {ratioCheck.expectedRatio === 'more-women' ? 'F' : 'M'} majority
                  </ThemedText>
                </View>
              )}
            </View>
          )}
          <Pressable
            onPress={onConfirm}
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
                {currentLine.length}/{numPlayers}
              </ThemedText>
            )}
          </Pressable>
        </View>

        {/* Ratio info row — portrait only */}
        {!isLandscape && (
          <View style={styles.infoRow}>
            <ThemedText style={[styles.nextPointLabel, { color: palette.textMuted }]}>
              Ratio · {expectedRatioLabel}
            </ThemedText>
            {showRatioWarning && (
              <Animated.View entering={FadeIn.duration(200)}>
                <View style={[styles.infoChip, { backgroundColor: palette.warning + '20' }]}>
                  <MaterialCommunityIcons
                    name="alert"
                    size={scaleBySizeClass(14, sizeClass)}
                    color={palette.warning}
                  />
                  <ThemedText style={[styles.infoChipText, { color: palette.warning }]}>
                    Expecting {ratioCheck.expectedRatio === 'more-women' ? 'F' : 'M'} majority
                  </ThemedText>
                </View>
              </Animated.View>
            )}
            {ratioCheck?.isCorrect && currentLine.length === numPlayers && (
              <Animated.View entering={FadeIn.duration(200)}>
                <View style={[styles.infoChip, { backgroundColor: palette.success + '20' }]}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={scaleBySizeClass(14, sizeClass)}
                    color={palette.success}
                  />
                  <ThemedText style={[styles.infoChipText, { color: palette.success }]}>
                    Ratio correct · {ratioCheck.fmpCount}F / {ratioCheck.mmpCount}M
                  </ThemedText>
                </View>
              </Animated.View>
            )}
          </View>
        )}

        {/* Preset row */}
        <View style={styles.presetsRow}>
          {presets.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <Animated.View key={preset.id} style={presetPulseStyle}>
                <Pressable
                  onPress={() => onSelectPreset(preset.id)}
                  style={({ pressed }) => [
                    styles.quickPresetBtn,
                    {
                      backgroundColor: isSelected ? palette.accent : palette.overlay08,
                      borderColor:
                        highlightPreset || isSelected ? palette.accent : palette.overlay15,
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
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Player Grid — reuses same component as real LineEditor */}
      <View style={styles.gridContainer}>
        {currentLine.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={scaleBySizeClass(48, sizeClass)}
              color={palette.textMuted}
            />
            <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
              Select a preset above to load a line
            </ThemedText>
          </View>
        ) : (
          <ModalPlayerGrid
            roster={roster}
            pointLines={[]}
            selectedIds={currentLine}
            onTogglePlayer={onTogglePlayer}
            useModalColors={false}
          />
        )}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass, isLandscape: boolean) {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFill,
      zIndex: 300,
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
    nextPointLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    gridContainer: {
      flex: 1,
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: isLandscape ? 88 : 0,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
    },
  });
}
