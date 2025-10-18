import ScoreDisplay from '@/components/score-display';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StyleSheet } from 'react-native';

export default function BasicScoreboard() {
  return (
    <>
      <ThemedView style={styles.team1}>
        <ThemedText style={styles.team1Text} type="title">
          Team 1
        </ThemedText>
        <ScoreDisplay bgColor="powderblue" textColor="black" />
      </ThemedView>
      <ThemedView style={styles.team2}>
        <ThemedText style={styles.team2Text} type="title">
          Team 2
        </ThemedText>
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
  team1Text: {
    marginTop: 15,
    color: 'black',
  },

  team2: {
    alignItems: 'center',
    backgroundColor: 'black',
    flex: 1,
  },
  team2Text: {
    marginTop: 15,
  },
});
