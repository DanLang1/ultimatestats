import { useTheme } from '@/context/ThemeContext';
import { useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

export default function PullPromptScreen() {
  const { possession, statTrackingEnabled, currentTeam, team2Name, setPossession } = useGameStore();
  const { palette } = useTheme();
  const team1Name = currentTeam?.name ?? 'Team 1';

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
      <View style={[styles.overlay, { backgroundColor: palette.overlayDark60 }]}>
        <Animated.View
          entering={SlideInDown.duration(400)}
          style={[styles.sheet, { backgroundColor: palette.modalBg, shadowColor: palette.shadow }]}>
          <Animated.Text
            entering={FadeIn.delay(200)}
            style={[styles.title, { color: palette.modalText }]}>
            Who is receiving the pull?
          </Animated.Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={[
                styles.teamButton,
                { backgroundColor: palette.accent, borderColor: palette.accent },
              ]}
              onPress={() => handleSelect('team1')}>
              <Text style={[styles.teamButtonText, { color: palette.textOnAccent }]}>
                {team1Name}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.teamButton,
                { backgroundColor: palette.accent, borderColor: palette.accent },
              ]}
              onPress={() => handleSelect('team2')}>
              <Text style={[styles.teamButtonText, { color: palette.textOnAccent }]}>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    borderRadius: 20,
    padding: 24,
    minWidth: 300,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
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
  },
  teamButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
