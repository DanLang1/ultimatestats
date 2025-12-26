import { useGameStore } from '@/store/gameStore';
import { palette } from '@/theme/theme';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

export default function PullPromptScreen() {
  const { possession, statTrackingEnabled, team1Name, team2Name, setPossession } = useGameStore();

  // If possession is already set or tracking disabled, just render nothing
  if (possession !== null || !statTrackingEnabled) {
    return null;
  }

  const handleSelect = (team: 'team1' | 'team2') => {
    setPossession(team);
    router.dismissTo('/');
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.overlay}>
        <Animated.View entering={SlideInDown.duration(400)} style={styles.sheet}>
          <Animated.Text entering={FadeIn.delay(200)} style={styles.title}>
            Who is receiving the pull?
          </Animated.Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.teamButton, { backgroundColor: palette.surface }]}
              onPress={() => handleSelect('team1')}>
              <Text style={[styles.teamButtonText, { color: palette.primary }]}>{team1Name}</Text>
            </Pressable>

            <Pressable
              style={[styles.teamButton, { backgroundColor: palette.primary }]}
              onPress={() => handleSelect('team2')}>
              <Text style={[styles.teamButtonText, { color: palette.textInverse }]}>
                {team2Name}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: palette.overlayDark60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 24,
    minWidth: 300,
    alignItems: 'center',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  teamButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.primary,
  },
  teamButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
