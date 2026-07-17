import React from 'react';
import { StyleSheet, View } from 'react-native';

import { TimeoutDots } from '@/components/advancedTracking/scoreBar/TimeoutDots';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { SideTimeoutState } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts } from '@/theme/theme';

const TEAM_NAME_MIN_FONT_SCALE = 0.82;

interface TeamScoreBlockProps {
  name: string;
  score: number;
  timeouts: SideTimeoutState;
  color: string;
  onTimeoutDotsPress?: () => void;
  timeoutDotsTestID?: string;
}

export function TeamScoreBlock({
  name,
  score,
  timeouts,
  color,
  onTimeoutDotsPress,
  timeoutDotsTestID,
}: TeamScoreBlockProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.block}>
      <View style={styles.nameWrap}>
        <ThemedText
          style={[styles.name, { color: palette.textInverse }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={TEAM_NAME_MIN_FONT_SCALE}>
          {name}
        </ThemedText>
      </View>
      <View style={styles.dotsWrap}>
        <TimeoutDots
          state={timeouts}
          activeColor={color}
          onPress={onTimeoutDotsPress}
          testID={timeoutDotsTestID}
        />
      </View>
      <ThemedText style={[styles.score, { color: color }]}>{score}</ThemedText>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    block: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
      minWidth: 0,
    },
    nameWrap: {
      minHeight: scaleBySizeClass(34, sizeClass),
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'stretch',
    },
    name: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      textAlign: 'center',
      lineHeight: scaleBySizeClass(18, sizeClass),
      includeFontPadding: false,
    },
    dotsWrap: {
      minHeight: scaleBySizeClass(16, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    score: {
      fontSize: scaleBySizeClass(48, sizeClass),
      fontFamily: Fonts.black,
      fontVariant: ['tabular-nums'],
      lineHeight: scaleBySizeClass(52, sizeClass),
    },
  });
}
