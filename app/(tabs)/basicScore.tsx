import ScoreDisplay from '@/components/ScoreDisplay';
import TeamText from '@/components/TeamText';
import { ThemedView } from '@/components/ThemedView';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

export default function BasicScoreboard() {
  const [team1, setTeam1] = useState<string>('Team 1');
  const [team2, setTeam2] = useState<string>('Team 2');
  return (
    <>
      <ThemedView style={styles.team1}>
        <TeamText color="black" initialTeamName="Team 1" />
        <ScoreDisplay bgColor="powderblue" textColor="black" />
      </ThemedView>
      <ThemedView style={styles.team2}>
        <TeamText color="white" initialTeamName="Team 2" />
        <ScoreDisplay bgColor="black" textColor="white" />
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  team1: {
    alignItems: 'center',
    backgroundColor: 'powderblue',
    flex: 1,
  },

  team2: {
    alignItems: 'center',
    backgroundColor: 'black',
    flex: 1,
  },
});
