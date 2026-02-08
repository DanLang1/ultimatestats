import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type EntryStep = 'goal' | 'assist';

interface StatEntryHeaderProps {
  teamName: string;
  step: EntryStep;
  badgeValue: string | null;
  badgeLabel: string | null;
}

export function StatEntryHeader({ teamName, step, badgeValue, badgeLabel }: StatEntryHeaderProps) {
  const { palette } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.teamName, { color: palette.modalText }]}>{teamName}</Text>
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
          <Text style={[styles.badgeLabel, { color: palette.accent }]}>
            {badgeLabel || 'SELECTED'}
          </Text>
          <Text style={[styles.badgeValue, { color: palette.accent }]}>{badgeValue}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 8,
    gap: 8,
  },
  leftGroup: {
    flex: 1,
  },
  teamName: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stepLabel: {
    fontSize: 22,
    fontWeight: 'bold',
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
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 2,
  },
  badgeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
