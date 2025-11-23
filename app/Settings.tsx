import { ThemedView } from '@/components/ThemedView';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Button, StyleSheet, TextInput, View } from 'react-native';

export default function SettingsScreen() {
  const params = useLocalSearchParams<{ team1: string; team2: string }>();
  const [team1, setTeam1] = useState(params.team1 || 'Team 1');
  const [team2, setTeam2] = useState(params.team2 || 'Team 2');

  const handleSave = () => {
    router.navigate({ pathname: '/', params: { team1, team2 } });
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
