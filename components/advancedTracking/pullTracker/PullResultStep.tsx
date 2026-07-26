import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  formatHangtime,
  getPullerName,
  getPullingSideTitle,
  PULL_RESULTS,
} from '@/lib/advancedTracking/pullTrackingUtils';
import { Participant, PullResult } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';

const RESULT_MIN_H: Record<SizeClass, number> = { small: 56, medium: 64, large: 72 };
const RESULT_FONT_SIZE: Record<SizeClass, number> = { small: 15, medium: 17, large: 20 };
const BANNER_LABEL_FONT_SIZE: Record<SizeClass, number> = { small: 11, medium: 13, large: 15 };
const BANNER_VALUE_FONT_SIZE: Record<SizeClass, number> = { small: 22, medium: 26, large: 32 };
const LABEL_FONT_SIZE: Record<SizeClass, number> = { small: 11, medium: 14, large: 18 };

interface PullResultStepProps {
  isOurPull: boolean;
  sideLabel?: string;
  isPullerTracked?: boolean;
  canSelectDropper?: boolean;
  activeParticipants: Participant[];
  pullerId: string | null | undefined;
  hangTimeMs: number;
  onComplete: (result: PullResult, receiverId?: string | null) => void;
  onDropped: () => void;
  onBack: () => void;
}

export const PullResultStep = ({
  isOurPull,
  sideLabel,
  isPullerTracked = isOurPull,
  canSelectDropper = !isOurPull,
  activeParticipants,
  pullerId,
  hangTimeMs,
  onComplete,
  onDropped,
  onBack,
}: PullResultStepProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const pullerName = getPullerName(activeParticipants, pullerId);
  const showHangtimeBanner = hangTimeMs > 0 || (isPullerTracked && pullerName !== null);

  const handleResultSelect = (result: PullResult) => {
    if (result === 'dropped' && canSelectDropper) {
      onDropped();
      return;
    }
    onComplete(result);
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={getPullingSideTitle(isOurPull, sideLabel)}
        titleColor={palette.textInverse}
        onBack={onBack}
      />

      <View style={styles.flex}>
        {showHangtimeBanner && (
          <View
            style={[
              styles.hangtimeBanner,
              { borderBottomColor: palette.overlay10, backgroundColor: palette.overlay05 },
            ]}>
            {hangTimeMs > 0 && (
              <View style={styles.hangtimeBannerItem}>
                <ThemedText style={[styles.hangtimeBannerLabel, { color: palette.textMuted }]}>
                  HANGTIME
                </ThemedText>
                <ThemedText style={[styles.hangtimeBannerValue, { color: palette.textInverse }]}>
                  {formatHangtime(hangTimeMs)}
                </ThemedText>
              </View>
            )}
            {isPullerTracked && pullerName !== null && (
              <View style={styles.hangtimeBannerItem}>
                <ThemedText style={[styles.hangtimeBannerLabel, { color: palette.textMuted }]}>
                  PULLER
                </ThemedText>
                <ThemedText style={[styles.hangtimeBannerValue, { color: palette.textInverse }]}>
                  {pullerName}
                </ThemedText>
              </View>
            )}
          </View>
        )}

        <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
          <ThemedText style={[styles.label, { color: palette.textMuted }]}>PULL RESULT</ThemedText>
          <View style={styles.resultList}>
            {PULL_RESULTS.map((resultOption) => (
              <Pressable
                key={resultOption.value}
                testID={`pull-result-${resultOption.value}`}
                onPress={() => handleResultSelect(resultOption.value)}
                style={[
                  styles.resultButton,
                  { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
                ]}>
                <ThemedText style={[styles.resultButtonText, { color: palette.textInverse }]}>
                  {resultOption.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </ThemedView>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    content: { padding: 20, paddingTop: 24, flexGrow: 1 },
    label: {
      fontFamily: Fonts.bold,
      fontSize: getSizeClassValue(LABEL_FONT_SIZE, sizeClass),
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginBottom: 12,
    },
    resultList: { gap: 10 },
    resultButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: getSizeClassValue(RESULT_MIN_H, sizeClass),
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    resultButtonText: {
      fontFamily: Fonts.black,
      fontSize: getSizeClassValue(RESULT_FONT_SIZE, sizeClass),
      textAlign: 'center',
    },
    hangtimeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 28,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    hangtimeBannerItem: { gap: 2 },
    hangtimeBannerLabel: {
      fontFamily: Fonts.bold,
      fontSize: getSizeClassValue(BANNER_LABEL_FONT_SIZE, sizeClass),
      letterSpacing: 1.5,
    },
    hangtimeBannerValue: {
      fontFamily: Fonts.black,
      fontSize: getSizeClassValue(BANNER_VALUE_FONT_SIZE, sizeClass),
    },
  });
}
