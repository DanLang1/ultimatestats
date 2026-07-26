import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PlayerChip } from '@/components/ui/PlayerChip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useStopwatch } from '@/hooks/advancedTracking/useTimer';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatHangtime, getPullingSideTitle } from '@/lib/advancedTracking/pullTrackingUtils';
import { Participant } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';

const TIMER_CIRCLE_SIZE: Record<SizeClass, number> = { small: 260, medium: 360, large: 460 };
const LANDSCAPE_TIMER_CIRCLE_SIZE: Record<SizeClass, number> = {
  small: 260,
  medium: 340,
  large: 380,
};
const TIMER_FONT_SIZE: Record<SizeClass, number> = { small: 72, medium: 104, large: 150 };
const LANDSCAPE_TIMER_FONT_SIZE: Record<SizeClass, number> = {
  small: 72,
  medium: 96,
  large: 112,
};
const LABEL_FONT_SIZE: Record<SizeClass, number> = { small: 13, medium: 16, large: 20 };
const TIMER_SUB_FONT_SIZE: Record<SizeClass, number> = { small: 13, medium: 16, large: 22 };
const ACTION_AREA_MIN_H: Record<SizeClass, number> = { small: 76, medium: 88, large: 110 };
const CONTINUE_MIN_H: Record<SizeClass, number> = { small: 52, medium: 58, large: 68 };
const CONTINUE_FONT_SIZE: Record<SizeClass, number> = { small: 15, medium: 17, large: 22 };
const SKIP_FONT_SIZE: Record<SizeClass, number> = { small: 14, medium: 16, large: 22 };

interface PullTimingStepProps {
  isOurPull: boolean;
  sideLabel?: string;
  isPullerTracked?: boolean;
  activeParticipants: Participant[];
  onNext: (pullerId: string | null | undefined, hangTimeMs: number) => void;
  onBack: () => void;
}

export const PullTimingStep = ({
  isOurPull,
  sideLabel,
  isPullerTracked = isOurPull,
  activeParticipants,
  onNext,
  onBack,
}: PullTimingStepProps) => {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const densitySizeClass = isLandscape ? 'small' : sizeClass;
  const timerSizes = isLandscape ? LANDSCAPE_TIMER_CIRCLE_SIZE : TIMER_CIRCLE_SIZE;
  const timerFontSizes = isLandscape ? LANDSCAPE_TIMER_FONT_SIZE : TIMER_FONT_SIZE;
  const timerSize = getSizeClassValue(timerSizes, sizeClass);
  const timerFontSize = getSizeClassValue(timerFontSizes, sizeClass);

  const styles = createStyles(sizeClass, densitySizeClass, timerFontSize, isLandscape);

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

  const timingContent = (
    <>
      {isPullerTracked && (
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
                compact={sizeClass === 'small' || isLandscape}
                onPress={() => setSelectedPullerId(participant.id)}
              />
            ))}
            <PlayerChip
              name="Unknown"
              selected={selectedPullerId === null}
              size="large"
              compact={sizeClass === 'small' || isLandscape}
              onPress={() => setSelectedPullerId(null)}
            />
          </View>
        </View>
      )}

      <View style={styles.timerSection}>
        {isPullerTracked && (
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
    </>
  );

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={getPullingSideTitle(isOurPull, sideLabel)}
        titleColor={palette.textInverse}
        onBack={onBack}
      />

      {isLandscape ? (
        <View style={styles.content}>{timingContent}</View>
      ) : (
        <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
          {timingContent}
        </ScrollView>
      )}

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
    </ThemedView>
  );
};

function getTimerInstruction(timerState: 'running' | 'stopped' | 'idle') {
  if (timerState === 'idle') return 'TAP TO START';
  if (timerState === 'running') return 'TAP TO STOP';
  return 'RECORDED';
}

function createStyles(
  sizeClass: SizeClass,
  densitySizeClass: SizeClass,
  timerFontSize: number,
  isLandscape: boolean,
) {
  return StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    content: {
      flex: 1,
      flexDirection: isLandscape ? 'row' : 'column',
      alignItems: isLandscape ? 'center' : 'stretch',
      alignSelf: isLandscape ? 'center' : 'stretch',
      gap: isLandscape ? scaleBySizeClass(48, densitySizeClass) : 0,
      maxWidth: isLandscape ? 1200 : undefined,
      paddingHorizontal: isLandscape ? 40 : 0,
      paddingBottom: 8,
      width: '100%',
    },
    section: {
      flex: isLandscape ? 1 : undefined,
      justifyContent: isLandscape ? 'center' : 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 8,
      marginBottom: isLandscape ? 0 : 24,
      maxWidth: isLandscape ? 580 : undefined,
    },
    timerSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      gap: isLandscape ? 4 : 16,
      marginBottom: isLandscape ? 0 : scaleBySizeClass(32, sizeClass),
      maxWidth: isLandscape ? 460 : undefined,
    },
    label: {
      fontFamily: Fonts.bold,
      fontSize: getSizeClassValue(LABEL_FONT_SIZE, densitySizeClass),
      letterSpacing: scaleBySizeClass(1.5, densitySizeClass, { rounding: 'none' }),
      marginBottom: isLandscape ? 8 : 12,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isLandscape ? 12 : 12,
      justifyContent: isLandscape ? 'center' : 'flex-start',
    },
    timerCircle: { borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
    timerSecs: { fontFamily: Fonts.black, lineHeight: timerFontSize * 1.05 },
    timerSub: {
      fontFamily: Fonts.bold,
      fontSize: getSizeClassValue(TIMER_SUB_FONT_SIZE, densitySizeClass),
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
