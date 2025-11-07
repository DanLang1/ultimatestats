import ScoreDisplay from '@/components/ScoreDisplay';
import TeamText from '@/components/TeamText';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { palette } from '@/constants/theme';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

export default function BasicScoreboard() {
  const [team1, setTeam1] = useState<string>('Team 1');
  const [team2, setTeam2] = useState<string>('Team 2');
  return (
    <>
      <ThemedView style={styles.team1}>
        <TeamText color={palette.primary} initialTeamName="Team 1" />
        <ScoreDisplay bgColor={palette.white} textColor={palette.primary} />
      </ThemedView>
      <Pressable style={styles.settingButton}>
        <ThemedText>Settings</ThemedText>
      </Pressable>
      <ThemedView style={styles.team2}>
        <TeamText color={palette.white} initialTeamName="Team 2" />
        <ScoreDisplay bgColor={palette.primary} textColor={palette.white} />
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  team1: {
    alignItems: 'center',
    backgroundColor: palette.white,
    flex: 1,
  },

  team2: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    flex: 1,
  },
  settingButton: {
    position: 'absolute', // 👈 take it out of the normal flex flow
    top: '53.5%', // 👈 halfway down the screen
    left: '50%', // 👈 halfway across
    transform: [
      { translateX: -50 }, // 👈 adjust back by half its own width
      { translateY: -50 }, // 👈 adjust back by half its own height
    ],
    backgroundColor: palette.secondary,
    borderWidth: 2,
    borderColor: palette.accent,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10, // 👈 ensure it appears *above* other views
    elevation: 10,
  },
});
