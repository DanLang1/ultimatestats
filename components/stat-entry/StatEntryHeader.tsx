import { palette } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type EntryStep = 'goal' | 'assist';

interface StatEntryHeaderProps {
  teamName: string;
  step: EntryStep;
  selectedGoal: string | null;
}

export function StatEntryHeader({ teamName, step, selectedGoal }: StatEntryHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <Text style={styles.teamName}>{teamName}</Text>
        <Animated.Text key={step} entering={FadeIn.duration(300)} style={styles.stepLabel}>
          {step === 'goal' ? 'Who scored?' : 'Who threw the assist?'}
        </Animated.Text>
      </View>

      {selectedGoal && (
        <Animated.View entering={FadeIn} style={styles.badge}>
          <Text style={styles.badgeLabel}>GOAL</Text>
          <Text style={styles.badgeValue}>{selectedGoal}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end', // Align step label and badge better
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  leftGroup: {
    flex: 1,
  },
  teamName: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stepLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  badge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 1,
    marginTop: 2,
  },
  badgeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
