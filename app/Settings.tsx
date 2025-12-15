import { ThemedView } from '@/components/ThemedView';
import { useGameStore } from '@/store/gameStore';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Button, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

export default function SettingsScreen() {
  const {
    team1Name,
    team2Name,
    gameTo: gameToStore,
    team1Timeouts,
    setTeamNames,
    setGameTo: setGameToStore,
    resetTimeouts,
    floaterEnabled: floaterEnabledStore,
    setFloaterEnabled,
    resetGame,
  } = useGameStore();

  const [team1, setTeam1] = useState(team1Name);
  const [team2, setTeam2] = useState(team2Name);
  const [gameTo, setGameTo] = useState(gameToStore.toString());
  const [timeoutsCount, setTimeoutsCount] = useState(team1Timeouts.length.toString());
  const [floaterEnabled, setFloaterEnabledLocal] = useState(floaterEnabledStore);

  const handleSave = () => {
    setTeamNames(team1, team2);
    setGameToStore(Number(gameTo) || 15);
    setFloaterEnabled(floaterEnabled);

    const newCount = parseInt(timeoutsCount, 10);
    const currentCount = team1Timeouts.length;

    if (!isNaN(newCount) && newCount !== currentCount) {
      resetTimeouts(newCount);
    }

    router.back();
  };

  const handleNewGame = () => {
    resetGame();
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.card}>
        <Text style={styles.headerTitle}>Game Settings</Text>

        <View style={styles.columnsContainer}>
          {/* Left Column: Teams */}
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Teams</Text>
            <TextInput
              style={styles.input}
              value={team1}
              onChangeText={setTeam1}
              placeholder="Team 1 Name"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              value={team2}
              onChangeText={setTeam2}
              placeholder="Team 2 Name"
              placeholderTextColor="#999"
            />
          </View>

          {/* Right Column: Rules */}
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Rules</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Game To:</Text>
              <TextInput
                keyboardType="numeric"
                style={styles.inputSmall}
                value={gameTo}
                onChangeText={setGameTo}
                placeholder="15"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Timeouts per Half:</Text>
              <TextInput
                keyboardType="numeric"
                style={styles.inputSmall}
                value={timeoutsCount}
                onChangeText={setTimeoutsCount}
                placeholder="2"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.label}>Enable Floater Timeout</Text>
              <Switch
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={floaterEnabled ? '#f5dd4b' : '#f4f3f4'}
                onValueChange={setFloaterEnabledLocal}
                value={floaterEnabled}
              />
            </View>
          </View>
        </View>

        <View style={styles.buttons}>
          <Button title="Cancel" onPress={() => router.back()} color="red" />
          <Button title="New Game" onPress={handleNewGame} color="orange" />
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
    padding: 20,
  },
  card: {
    width: '100%',
    maxHeight: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    // justifyContent: 'space-between', // Removed to let columns flex
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10, // Reduced from 20
    color: '#333',
    textAlign: 'center',
  },
  columnsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 20,
    flex: 1, // Take available vertical space
    // alignItems: 'center', // Optional: Center vertically?
  },
  column: {
    flex: 1,
    gap: 10,
    justifyContent: 'flex-start', // Align content to top
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    color: '#666',
  },
  input: {
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    color: 'black',
    backgroundColor: '#f9f9f9',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
  },
  inputSmall: {
    width: 50,
    textAlign: 'right',
    color: 'black',
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 45,
    paddingHorizontal: 5,
  },
  label: {
    fontSize: 16,
    color: '#333',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10, // Reduced from 30
    paddingTop: 10, // Reduced from 20
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});
