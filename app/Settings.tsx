import { ThemedView } from '@/components/ThemedView';
import { useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Button, StyleSheet, TextInput, View } from 'react-native';

export default function SettingsScreen() {
  const {
    team1Name,
    team2Name,
    gameTo: gameToStore,
    team1Timeouts,
    setTeamNames,
    setGameTo: setGameToStore,
    resetTimeouts,
  } = useGameStore();

  const [team1, setTeam1] = useState(team1Name);
  const [team2, setTeam2] = useState(team2Name);
  const [gameTo, setGameTo] = useState(gameToStore.toString());
  const [timeoutsCount, setTimeoutsCount] = useState(team1Timeouts.length.toString());

  // Initialize timeouts count from the team1Timeouts array length or default to 2

  const handleSave = () => {
    setTeamNames(team1, team2);
    setGameToStore(Number(gameTo) || 15);

    const newCount = parseInt(timeoutsCount, 10);
    const currentCount = team1Timeouts.length;

    if (!isNaN(newCount) && newCount !== currentCount) {
      resetTimeouts(newCount);
    }

    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <TextInput
          style={styles.input}
          value={team1}
          onChangeText={setTeam1}
          placeholder="Team 1 Name"
        />
        <TextInput
          style={styles.input}
          value={team2}
          onChangeText={setTeam2}
          placeholder="Team 2 Name"
        />
        <TextInput
          keyboardType="numeric"
          style={styles.input}
          value={gameTo}
          onChangeText={setGameTo}
          placeholder="Game To"
        />
        <TextInput
          keyboardType="numeric"
          style={styles.input}
          value={timeoutsCount}
          onChangeText={setTimeoutsCount}
          placeholder="Number of Timeouts"
        />
        <View style={styles.buttons}>
          <Button title="Cancel" onPress={() => router.back()} color="red" />
          <Button title="Save" onPress={handleSave} />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    width: '100%',
    color: 'black',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
});
