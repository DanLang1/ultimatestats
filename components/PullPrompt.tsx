import { palette } from '@/constants/theme';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { useGameStore } from '@/store/gameStore';

export default function PullPrompt() {
  const { possession, statTrackingEnabled, team1Name, team2Name, setPossession } = useGameStore();

  // Only show when stat tracking is enabled and possession is null
  const visible = statTrackingEnabled && possession === null;

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <Animated.View entering={SlideInDown.duration(400)} style={styles.sheet}>
          <Animated.Text entering={FadeIn.delay(200)} style={styles.title}>
            Who is receiving the pull?
          </Animated.Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.teamButton, { backgroundColor: palette.surface }]}
              onPress={() => setPossession('team1')}>
              <Text style={[styles.teamButtonText, { color: palette.primary }]}>{team1Name}</Text>
            </Pressable>

            <Pressable
              style={[styles.teamButton, { backgroundColor: palette.primary }]}
              onPress={() => setPossession('team2')}>
              <Text style={[styles.teamButtonText, { color: palette.textInverse }]}>
                {team2Name}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
