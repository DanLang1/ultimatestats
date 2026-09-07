import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { ModalPlayerGrid } from '@/components/lines/ModalPlayerGrid';
import { ThemedText } from '@/components/ThemedText';
import TutorialAdvancedLinePicker from '@/components/tutorial/TutorialAdvancedLinePicker';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { usePulseAnimation } from '@/hooks/usePulseAnimation';
import { ULTIMATE_LINE_SIZE } from '@/lib/constants';
import { formatRatio } from '@/lib/genderRatioUtils';
import { Fonts } from '@/theme/theme';

import {
  TUTORIAL_ADVANCED_LINE_PLAYERS,
  TUTORIAL_ADVANCED_LINE_PRESET,
} from './tutorialAdvancedLineData';

export type TutorialAdvancedLineStep = 'load-preset' | 'confirm';

interface TutorialAdvancedLineSelectionProps {
  onBack: () => void;
  onComplete: () => void;
}

const STEP_CONTENT: Record<TutorialAdvancedLineStep, { title: string; message: string }> = {
  'load-preset': {
    title: 'Load a Line',
    message: 'Tap Choose line, then select the D-Line preset.',
  },
  confirm: {
    title: 'Confirm the Line',
    message: 'The line is ready. Tap Confirm line to continue.',
  },
};

export default function TutorialAdvancedLineSelection({
  onBack,
  onComplete,
}: TutorialAdvancedLineSelectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const [step, setStep] = useState<TutorialAdvancedLineStep>('load-preset');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const loadPulse = usePulseAnimation(step === 'load-preset', 800, ReduceMotion.Never);
  const confirmPulse = usePulseAnimation(step === 'confirm', 800, ReduceMotion.Never);

  const selectedPresetIds = new Set(TUTORIAL_ADVANCED_LINE_PRESET.playerIds);
  const canConfirm = selectedPreset;
  const focusedIds = selectedPreset ? selectedPresetIds : undefined;
  const content = STEP_CONTENT[step];

  const togglePlayer = (_playerId: string) => {
    if (!selectedPreset) {
      setFeedback('Start by loading the D-Line preset.');
      return;
    }
    setFeedback('This tutorial uses the D-Line preset. Tap Confirm line to continue.');
  };

  const loadPreset = () => {
    setSelectedPreset(true);
    setSelectedIds([...TUTORIAL_ADVANCED_LINE_PRESET.playerIds]);
    setShowPicker(false);
    setStep('confirm');
    setFeedback(null);
  };

  const selectionDifference = selectedIds.length - ULTIMATE_LINE_SIZE;
  const selectionHint = selectedPreset ? 'Ready to continue' : 'Choose a preset to begin';
  const headerTitle = `O-Point · 0-0 · ${formatRatio('more-women', 2)}`;

  return (
    <View
      testID="tutorial-line-select-screen"
      style={[styles.container, { backgroundColor: palette.primary }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={styles.headerTop}>
          <Pressable
            testID="line-select-back"
            accessibilityRole="button"
            accessibilityLabel="Exit tutorial"
            onPress={onBack}
            style={styles.backButton}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={scaleBySizeClass(22, sizeClass)}
              color={palette.textInverse}
            />
          </Pressable>
          <ThemedText
            testID="line-select-title"
            style={[styles.headerTitle, { color: palette.textInverse }]}>
            {headerTitle}
          </ThemedText>
        </View>
        <View style={styles.presetsRow}>
          <Animated.View style={[styles.loadLineWrap, loadPulse]}>
            <Pressable
              testID="line-select-load-line"
              accessibilityRole="button"
              accessibilityLabel={`Choose line, ${selectedPreset ? TUTORIAL_ADVANCED_LINE_PRESET.name : 'Choose line'}`}
              onPress={() => setShowPicker(true)}
              style={({ pressed }) => [
                styles.loadLineButton,
                { borderColor: palette.border },
                pressed && styles.pressed,
              ]}>
              <MaterialCommunityIcons
                name="layers-outline"
                size={scaleBySizeClass(18, sizeClass)}
                color={palette.textMuted}
              />
              <ThemedText style={[styles.loadLineText, { color: palette.textInverse }]}>
                {selectedPreset ? TUTORIAL_ADVANCED_LINE_PRESET.name : 'Choose line'}
              </ThemedText>
              <MaterialCommunityIcons
                name="chevron-down"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          </Animated.View>
        </View>
      </View>

      <Animated.View
        key={step}
        entering={FadeIn.duration(200)}
        style={[
          styles.instructions,
          { borderColor: palette.overlay15, backgroundColor: palette.overlay05 },
        ]}>
        <ThemedText style={[styles.instructionStep, { color: palette.accent }]}>
          LINE SELECTION
        </ThemedText>
        <ThemedText style={[styles.instructionTitle, { color: palette.textInverse }]}>
          {content.title}
        </ThemedText>
        <ThemedText style={[styles.instructionMessage, { color: palette.textMuted }]}>
          {feedback ?? content.message}
        </ThemedText>
      </Animated.View>

      <View collapsable={false} style={styles.grid}>
        <ModalPlayerGrid
          roster={TUTORIAL_ADVANCED_LINE_PLAYERS}
          focusIds={focusedIds}
          pointLines={[]}
          selectedIds={selectedIds}
          onTogglePlayer={togglePlayer}
          useModalColors={false}
          onToggleOtherPlayers={() => {}}
        />
      </View>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <View style={styles.selectionStatus} accessibilityLiveRegion="polite">
          <View style={styles.selectionSummary}>
            <ThemedText
              style={[
                styles.count,
                { color: selectionDifference > 0 ? palette.warning : palette.textInverse },
              ]}>
              {selectedIds.length}/{ULTIMATE_LINE_SIZE}
            </ThemedText>
            <ThemedText style={[styles.hint, { color: palette.textMuted }]}>
              {selectionHint}
            </ThemedText>
          </View>
        </View>
        <Animated.View style={confirmPulse}>
          <Pressable
            testID="line-select-confirm"
            accessibilityRole="button"
            disabled={!canConfirm}
            onPress={() => {
              onComplete();
            }}
            style={({ pressed }) => [
              styles.confirmButton,
              { backgroundColor: canConfirm ? palette.success : palette.overlay10 },
              pressed && canConfirm && styles.pressed,
            ]}>
            <ThemedText
              style={[
                styles.confirmText,
                { color: canConfirm ? palette.textOnAccent : palette.textMuted },
              ]}>
              Confirm line
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>

      <TutorialAdvancedLinePicker
        visible={showPicker}
        preset={TUTORIAL_ADVANCED_LINE_PRESET}
        roster={TUTORIAL_ADVANCED_LINE_PLAYERS}
        selected={selectedPreset}
        onClose={() => setShowPicker(false)}
        onSelect={loadPreset}
      />
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
    headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    backButton: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: {
      flex: 1,
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    presetsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    loadLineWrap: { flex: 1 },
    loadLineButton: {
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
    instructions: {
      marginHorizontal: 16,
      marginTop: 10,
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
      gap: 2,
    },
    instructionStep: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1,
    },
    instructionTitle: { fontSize: scaleBySizeClass(15, sizeClass), fontFamily: Fonts.bold },
    instructionMessage: {
      fontSize: scaleBySizeClass(13, sizeClass),
      lineHeight: scaleBySizeClass(18, sizeClass),
    },
    grid: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: 1,
      gap: 10,
    },
    selectionStatus: { flex: 1, minWidth: 0, gap: 4 },
    selectionSummary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    count: { fontSize: scaleBySizeClass(16, sizeClass), fontFamily: Fonts.bold },
    hint: { fontSize: scaleBySizeClass(13, sizeClass), flexShrink: 1 },
    confirmButton: {
      minHeight: 44,
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
    pressed: { opacity: 0.8 },
  });
}
