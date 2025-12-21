import { ThemedView } from '@/components/ThemedView';
import { InputNumber } from '@/components/ui/InputNumber';
import { palette } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

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
    setGameLength,
    gameLength: gameLengthStore,
    softCapMins: softCapMinsStore,
    setSoftCapMins,
    resetGame,
    statTrackingEnabled: statTrackingEnabledStore,
    setStatTrackingEnabled,
    team1Roster,
    team2Roster,
    clearRosters,
    timerIsActive,
    team1Score,
    team2Score,
  } = useGameStore();

  const [team1, setTeam1] = useState(team1Name);
  const [team2, setTeam2] = useState(team2Name);
  const [gameTo, setGameTo] = useState(gameToStore.toString());
  const [timeoutsCount, setTimeoutsCount] = useState(team1Timeouts.length.toString());
  const [floaterEnabled, setFloaterEnabledLocal] = useState(floaterEnabledStore);
  const [gameLength, setGameLengthLocal] = useState((gameLengthStore || 90).toString());
  const [softCapTime, setSoftCapTimeLocal] = useState(
    ((gameLengthStore || 90) - (softCapMinsStore || 20)).toString(),
  );
  const [statTrackingEnabled, setStatTrackingEnabledLocal] = useState(statTrackingEnabledStore);

  const hasRoster = team1Roster.length > 0 || team2Roster.length > 0;

  const handleSave = () => {
    const gLength = Number(gameLength) || 90;
    const sCapTime = Number(softCapTime) || gLength - 20;

    setTeamNames(team1, team2);
    setGameToStore(Number(gameTo) || 15);
    setFloaterEnabled(floaterEnabled);
    setGameLength(gLength);
    setSoftCapMins(Math.max(0, gLength - sCapTime));
    setStatTrackingEnabled(statTrackingEnabled);

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

  const gameActive = timerIsActive || team1Score !== 0 || team2Score !== 0;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
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

            {/* Stat Tracking Mode */}
            <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Stat Tracking</Text>
            <View style={[styles.switchContainer, { marginTop: 0 }]}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Track My Team Stats</Text>
              </View>
              <Switch
                trackColor={{ false: '#767577', true: palette.accent }}
                thumbColor={statTrackingEnabled ? palette.accent : '#f4f3f4'}
                onValueChange={setStatTrackingEnabledLocal}
                value={statTrackingEnabled}
              />
            </View>

            {hasRoster && (
              <Pressable style={styles.clearRosterButton} onPress={clearRosters}>
                <Text style={styles.clearRosterText}>Clear Player Rosters</Text>
              </Pressable>
            )}
          </View>

          {/* Right Column: Rules */}
          <View style={styles.column}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Rules</Text>
              {gameActive && <Text style={styles.helperText}>* Cannot edit during game</Text>}
            </View>
            <InputNumber
              label="Game To:"
              value={gameTo}
              onChangeText={setGameTo}
              placeholder="15"
              editable={!gameActive}
            />

            <InputNumber
              label="Game Length (mins):"
              value={gameLength}
              onChangeText={setGameLengthLocal}
              placeholder="90"
              editable={!gameActive}
            />

            <InputNumber
              label="Soft Cap (mins):"
              value={softCapTime}
              onChangeText={setSoftCapTimeLocal}
              placeholder="70"
              editable={!gameActive}
            />

            <InputNumber
              label="Timeouts per Half:"
              value={timeoutsCount}
              onChangeText={setTimeoutsCount}
              placeholder="2"
              editable={!gameActive}
            />

            <View style={[styles.switchContainer, gameActive && styles.disabledContainer]}>
              <View style={styles.labelContainer}>
                {gameActive && (
                  <MaterialCommunityIcons
                    name="lock"
                    size={14}
                    color="#999"
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[styles.label, gameActive && styles.disabledLabel]}>
                  Enable Floater Timeout
                </Text>
              </View>
              <Switch
                trackColor={{ false: '#767577', true: gameActive ? '#ccc' : palette.accent }}
                thumbColor={floaterEnabled ? (gameActive ? '#eee' : palette.accent) : '#f4f3f4'}
                onValueChange={setFloaterEnabledLocal}
                value={floaterEnabled}
                disabled={gameActive}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttons}>
        <Button title="Cancel" onPress={() => router.back()} color="red" />
        <Button title="New Game" onPress={handleNewGame} color="orange" />
        <Button title="Save" onPress={handleSave} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    padding: 24,
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
  },
  column: {
    flex: 1,
    gap: 10,
    justifyContent: 'flex-start', // Align content to top
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 5,
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
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledContainer: {
    opacity: 0.8,
  },
  disabledLabel: {
    color: '#999',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 15,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  segmentButtonActive: {
    backgroundColor: palette.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  segmentTextActive: {
    color: 'white',
  },
  clearRosterButton: {
    marginTop: 10,
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#fee',
  },
  clearRosterText: {
    color: '#c00',
    fontSize: 14,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
  },
});
