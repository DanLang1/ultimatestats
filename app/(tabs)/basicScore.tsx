import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

export default function BasicScoreboard() {
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);

  return (
    <>
      <ThemedView style={styles.team1}>
        <ThemedText style={styles.team1Text} type="title">
          Team 1
        </ThemedText>
        <ThemedView style={[styles.scoreContainer, { backgroundColor: 'powderblue' }]}>
          <Pressable onPress={() => setTeam1Score(Math.max(0, team1Score - 1))}>
            <AntDesign name="caret-down" size={50} color="black" />
          </Pressable>
          <ThemedText style={[styles.scoreText, { color: 'black' }]} type="title">
            {team1Score}
          </ThemedText>
          <Pressable onPress={() => setTeam1Score(team1Score + 1)}>
            <AntDesign name="caret-up" size={50} color="black" />
          </Pressable>
        </ThemedView>
      </ThemedView>
      <ThemedView style={styles.team2}>
        <ThemedText style={styles.team2Text} type="title">
          Team 2
        </ThemedText>
        <ThemedView style={[styles.scoreContainer, { backgroundColor: 'black' }]}>
          <Pressable onPress={() => setTeam2Score(Math.max(0, team2Score - 1))}>
            <AntDesign name="caret-down" size={50} color="white" />
          </Pressable>
          <ThemedText style={styles.scoreText} type="title">
            {team2Score}
          </ThemedText>
          <Pressable onPress={() => setTeam2Score(team2Score + 1)}>
            <AntDesign name="caret-up" size={50} color="white" />
          </Pressable>
        </ThemedView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  team1: {
    alignItems: 'center',
    backgroundColor: 'powderblue',
    flex: 3,
  },
  team1Text: {
    flex: 1,
    marginTop: 15,
    color: 'black',
  },
  scoreText: {
    fontSize: 150,
    lineHeight: 150,
  },
  team2: {
    alignItems: 'center',
    backgroundColor: 'black',
    flex: 3,
  },
  team2Text: {
    marginTop: 15,
    flex: 1,
  },
  scoreContainer: {
    flex: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
});
