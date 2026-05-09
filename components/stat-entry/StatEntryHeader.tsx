import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';
import Animated, { FadeIn } from 'react-native-reanimated';

type EntryStep = 'goal' | 'assist';

interface StatEntryHeaderProps {
  teamName: string;
  step: EntryStep;
  badgeValue: string | null;
  badgeLabel: string | null;
}

export function StatEntryHeader({ teamName, step, badgeValue, badgeLabel }: StatEntryHeaderProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.teamName, { color: palette.modalText }]}>{teamName}</ThemedText>
      <Animated.Text
        key={step}
        entering={FadeIn.duration(300)}
        style={[styles.stepLabel, { color: palette.modalText }]}>
        {step === 'goal' ? 'Who scored?' : 'Who threw the assist?'}
      </Animated.Text>

      {badgeValue && (
        <Animated.View
          entering={FadeIn}
          style={[
            styles.badge,
            { backgroundColor: palette.accentOverlay15, borderColor: palette.accent },
          ]}>
          <ThemedText style={[styles.badgeLabel, { color: palette.accent }]}>
            {badgeLabel || 'SELECTED'}
          </ThemedText>
          <ThemedText style={[styles.badgeValue, { color: palette.accent }]}>
            {badgeValue}
          </ThemedText>
        </Animated.View>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      width: '100%',
      marginBottom: 8,
      gap: 8,
    },
    leftGroup: {
      flex: 1,
    },
    teamName: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    stepLabel: {
      fontSize: scaleBySizeClass(22, sizeClass),
      fontFamily: Fonts.bold,
    },
    badge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
    badgeLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      marginTop: 2,
    },
    badgeValue: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
