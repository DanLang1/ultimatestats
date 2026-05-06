import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useStopwatch } from '@/hooks/advancedTracking/useTimer';
import { formatHangtime } from '@/lib/advancedTracking/pullTrackingUtils';
import { Participant } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
  const styles = createStyles(sizeClass);

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
  const timerSize = scaleBySizeClass(260, sizeClass);
  const timerFontSize = scaleBySizeClass(72, sizeClass);

  const handleTimerPress = () => {
    if (timerState === 'idle') {
      startTimer();
    } else if (timerState === 'running') {
      stopTimer();
      onNext(selectedPullerId, elapsedMs);
    }
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
              {activeParticipants.map((participant) => {
                const selected = selectedPullerId === participant.id;
                return (
                  <Pressable
                    key={participant.id}
                    onPress={() => setSelectedPullerId(participant.id)}
                    style={[
                      styles.chip,
                      { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
                      selected && {
                        borderColor: palette.accent,
                        backgroundColor: palette.accent + '25',
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: selected ? palette.accent : palette.textInverse },
                      ]}>
                      {participant.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setSelectedPullerId(null)}
                style={[
                  styles.chip,
                  { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
                  selectedPullerId === null && {
                    borderColor: palette.accent,
                    backgroundColor: palette.accent + '25',
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: selectedPullerId === null ? palette.accent : palette.textMuted },
                  ]}>
                  Unknown
                </ThemedText>
              </Pressable>
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
              {timerState === 'idle' ? 'TAP TO START' : 'TAP TO STOP'}
            </ThemedText>
          </Pressable>
        </View>

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
      </ScrollView>
    </ThemedView>
  );
};

function createStyles(sizeClass: SizeClass) {
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
    },
    label: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(11, sizeClass),
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginBottom: 12,
    },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
    chipText: { fontFamily: Fonts.bold, fontSize: scaleBySizeClass(14, sizeClass) },
    timerCircle: { borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
    timerSecs: { fontFamily: Fonts.black, lineHeight: scaleBySizeClass(70, sizeClass) },
    timerSub: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(13, sizeClass),
      letterSpacing: 2,
      marginTop: 4,
    },
    skipBtn: { alignItems: 'center', paddingVertical: 20 },
    skipBtnText: {
      fontFamily: Fonts.semiBold,
      fontSize: scaleBySizeClass(14, sizeClass),
      textDecorationLine: 'underline',
    },
  });
}
