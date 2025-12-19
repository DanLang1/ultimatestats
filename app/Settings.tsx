import { ThemedView } from '@/components/ThemedView';
import { InputNumber } from '@/components/ui/InputNumber';
import { palette } from '@/constants/theme';
import { StatTrackingMode, useGameStore } from '@/store/gameStore';
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
    statTrackingMode: statTrackingModeStore,
    setStatTrackingMode,
    team1Roster,
    team2Roster,
    clearRosters,
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
  const [statTrackingMode, setStatTrackingModeLocal] =
    useState<StatTrackingMode>(statTrackingModeStore);

  const hasRoster = team1Roster.length > 0 || team2Roster.length > 0;

  const handleSave = () => {
    const gLength = Number(gameLength) || 90;
    const sCapTime = Number(softCapTime) || gLength - 20;

    setTeamNames(team1, team2);
    setGameToStore(Number(gameTo) || 15);
    setFloaterEnabled(floaterEnabled);
    setGameLength(gLength);
    setSoftCapMins(Math.max(0, gLength - sCapTime));
    setStatTrackingMode(statTrackingMode);

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
              <InputNumber
                label="Game To:"
                value={gameTo}
                onChangeText={setGameTo}
                placeholder="15"
              />

              <InputNumber
                label="Game Length (mins):"
                value={gameLength}
                onChangeText={setGameLengthLocal}
                placeholder="90"
              />

              <InputNumber
                label="Soft Cap (mins):"
                value={softCapTime}
                onChangeText={setSoftCapTimeLocal}
                placeholder="70"
              />

              <InputNumber
                label="Timeouts per Half:"
                value={timeoutsCount}
                onChangeText={setTimeoutsCount}
                placeholder="2"
              />

              <View style={styles.switchContainer}>
                <Text style={styles.label}>Enable Floater Timeout</Text>
                <Switch
                  trackColor={{ false: '#767577', true: palette.accent }}
                  thumbColor={floaterEnabled ? palette.accent : '#f4f3f4'}
                  onValueChange={setFloaterEnabledLocal}
                  value={floaterEnabled}
                />
              </View>

              {/* Stat Tracking Mode */}
              <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Stat Tracking</Text>
              <View style={styles.segmentedControl}>
                {(['off', 'team1', 'both'] as StatTrackingMode[]).map((mode) => (
                  <Pressable
                    key={mode}
                    style={[
                      styles.segmentButton,
                      statTrackingMode === mode && styles.segmentButtonActive,
                    ]}
                    onPress={() => setStatTrackingModeLocal(mode)}>
                    <Text
                      style={[
                        styles.segmentText,
                        statTrackingMode === mode && styles.segmentTextActive,
                      ]}>
                      {mode === 'off' ? 'Off' : mode === 'team1' ? 'My Team' : 'Both'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {hasRoster && (
                <Pressable style={styles.clearRosterButton} onPress={clearRosters}>
                  <Text style={styles.clearRosterText}>Clear Player Rosters</Text>
                </Pressable>
              )}

              {statTrackingMode !== 'off' && (
                <Pressable style={styles.viewStatsButton} onPress={() => router.push('/ViewStats')}>
                  <Text style={styles.viewStatsText}>View Stats</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.buttons}>
            <Button title="Cancel" onPress={() => router.back()} color="red" />
            <Button title="New Game" onPress={handleNewGame} color="orange" />
            <Button title="Save" onPress={handleSave} />
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
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
  viewStatsButton: {
    marginTop: 10,
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#eefeff',
    borderWidth: 1,
    borderColor: palette.primary,
  },
  viewStatsText: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});
