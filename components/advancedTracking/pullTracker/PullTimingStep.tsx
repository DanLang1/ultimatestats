import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PlayerChip } from '@/components/ui/PlayerChip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useStopwatch } from '@/hooks/advancedTracking/useTimer';
import { formatHangtime } from '@/lib/advancedTracking/pullTrackingUtils';
import { Participant } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

const TIMER_CIRCLE_SIZE: Record<SizeClass, number> = { small: 260, medium: 360, large: 520 };
const TIMER_FONT_SIZE: Record<SizeClass, number> = { small: 72, medium: 104, large: 150 };
const LABEL_FONT_SIZE: Record<SizeClass, number> = { small: 13, medium: 16, large: 20 };
const TIMER_SUB_FONT_SIZE: Record<SizeClass, number> = { small: 13, medium: 16, large: 22 };
const ACTION_AREA_MIN_H: Record<SizeClass, number> = { small: 76, medium: 88, large: 110 };
const CONTINUE_MIN_H: Record<SizeClass, number> = { small: 52, medium: 58, large: 68 };
const CONTINUE_FONT_SIZE: Record<SizeClass, number> = { small: 15, medium: 17, large: 22 };
const SKIP_FONT_SIZE: Record<SizeClass, number> = { small: 14, medium: 16, large: 22 };

interface PullTimingStepProps {
  isOurPull: boolean;
  activeParticipants: Participant[];
  onNext: (pullerId: string | null | undefined, hangTimeMs: number) => void;
  onBack: () => void;
}

export const PullTimingStep = ({
  isOurPull,
  activeParticipants,
  onNext,
  onBack,
}: PullTimingStepProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

  const timerSize = getSizeClassValue(TIMER_CIRCLE_SIZE, sizeClass);
  const timerFontSize = getSizeClassValue(TIMER_FONT_SIZE, sizeClass);

  const styles = createStyles(sizeClass, timerFontSize);

  const [selectedPullerId, setSelectedPullerId] = useState<string | null | undefined>(undefined);
  const {
    elapsed: elapsedMs,
    isRunning: timerIsRunning,
    start: startTimer,
    stop: stopTimer,
  } = useStopwatch();

  let timerState: 'running' | 'stopped' | 'idle';
  if (timerIsRunning) {
    timerState = 'running';
  } else if (elapsedMs > 0) {
    timerState = 'stopped';
  } else {
    timerState = 'idle';
  }

  const handleTimerPress = () => {
    if (timerState === 'idle') {
      startTimer();
    } else if (timerState === 'running') {
      stopTimer();
    }
  };

  const handleContinue = () => {
    onNext(selectedPullerId, elapsedMs);
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={isOurPull ? 'WE ARE PULLING' : 'THEY ARE PULLING'}
        titleColor={palette.textInverse}
        onBack={onBack}
      />

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        {isOurPull && (
          <View style={styles.section}>
            <ThemedText style={[styles.label, { color: palette.textMuted }]}>PULLER</ThemedText>
            <View style={styles.chipGrid}>
              {activeParticipants.map((participant) => (
                <PlayerChip
                  key={participant.id}
                  name={participant.name}
                  number={participant.number}
                  matchingType={participant.matchingType}
                  role={participant.role}
                  selected={selectedPullerId === participant.id}
                  size="large"
                  compact={sizeClass === 'small'}
                  onPress={() => setSelectedPullerId(participant.id)}
                />
              ))}
              <PlayerChip
                name="Unknown"
                selected={selectedPullerId === null}
                size="large"
                compact={sizeClass === 'small'}
                onPress={() => setSelectedPullerId(null)}
              />
            </View>
          </View>
        )}

        <View style={styles.timerSection}>
          {isOurPull && (
            <ThemedText style={[styles.label, { color: palette.textMuted }]}>HANGTIME</ThemedText>
          )}
          <Pressable
            onPress={handleTimerPress}
            disabled={timerState === 'stopped'}
            style={({ pressed }) => [
              styles.timerCircle,
              {
                width: timerSize,
                height: timerSize,
                borderRadius: timerSize / 2,
                borderColor: palette.overlay20,
                backgroundColor: palette.overlay05,
              },
              timerState === 'running' && {
                borderColor: palette.accent,
                backgroundColor: palette.accent + '20',
              },
              pressed && { opacity: 0.8 },
            ]}>
            <ThemedText
              style={[
                styles.timerSecs,
                {
                  fontSize: timerFontSize,
                  color: timerState === 'running' ? palette.accent : palette.textInverse,
                },
              ]}>
              {formatHangtime(elapsedMs)}
            </ThemedText>
            <ThemedText style={[styles.timerSub, { color: palette.textMuted }]}>
              {getTimerInstruction(timerState)}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.actionArea}>
          {timerState === 'stopped' && (
            <Pressable
              testID="pull-timing-continue"
              onPress={handleContinue}
              style={({ pressed }) => [
                styles.continueButton,
                { backgroundColor: palette.accent },
                pressed && { opacity: 0.8 },
              ]}>
              <ThemedText style={[styles.continueButtonText, { color: palette.textOnAccent }]}>
                Continue
              </ThemedText>
            </Pressable>
          )}

          {timerState === 'idle' && (
            <Pressable
              testID="pull-skip-timing"
              onPress={() => onNext(selectedPullerId, 0)}
              style={styles.skipBtn}>
              <ThemedText style={[styles.skipBtnText, { color: palette.textMuted }]}>
                Skip timing
              </ThemedText>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
};

function getTimerInstruction(timerState: 'running' | 'stopped' | 'idle') {
  if (timerState === 'idle') return 'TAP TO START';
  if (timerState === 'running') return 'TAP TO STOP';
  return 'RECORDED';
}

function createStyles(sizeClass: SizeClass, timerFontSize: number) {
  return StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    content: { flexGrow: 1, paddingBottom: 32 },
    section: { paddingHorizontal: 20, paddingTop: 8, marginBottom: 24 },
    timerSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      gap: 16,
      marginBottom: scaleBySizeClass(32, sizeClass),
    },
    label: {
      fontFamily: Fonts.bold,
      fontSize: getSizeClassValue(LABEL_FONT_SIZE, sizeClass),
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginBottom: 12,
    },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    timerCircle: { borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
    timerSecs: { fontFamily: Fonts.black, lineHeight: timerFontSize * 1.05 },
    timerSub: {
      fontFamily: Fonts.bold,
      fontSize: getSizeClassValue(TIMER_SUB_FONT_SIZE, sizeClass),
      letterSpacing: 2,
      marginTop: 4,
    },
    actionArea: {
      minHeight: getSizeClassValue(ACTION_AREA_MIN_H, sizeClass),
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 20,
    },
    continueButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: getSizeClassValue(CONTINUE_MIN_H, sizeClass),
      borderRadius: 14,
      borderCurve: 'continuous',
      paddingHorizontal: 20,
    },
    continueButtonText: {
      fontFamily: Fonts.black,
      fontSize: getSizeClassValue(CONTINUE_FONT_SIZE, sizeClass),
    },
    skipBtn: { alignItems: 'center', paddingVertical: 16 },
    skipBtnText: {
      fontFamily: Fonts.semiBold,
      fontSize: getSizeClassValue(SKIP_FONT_SIZE, sizeClass),
      textDecorationLine: 'underline',
    },
  });
}
