import { ThemedView } from '@/components/ThemedView';
import { Dropdown } from '@/components/ui/Dropdown';
import { Switch } from '@/components/ui/Switch';
import { palette } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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
    clearRosters,
    timerIsActive,
    team1Score,
    team2Score,
    savedTeams,
    loadSavedTeams,
    loadTeamRoster,
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

  // Load saved teams on mount
  useEffect(() => {
    loadSavedTeams();
  }, [loadSavedTeams]);

  const hasRoster = team1Roster.length > 0;

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

  const handleClearRosters = () => {
    clearRosters();
  };

  const handleEditRoster = () => {
    router.push({ pathname: '/EditRoster', params: { teamName: team1 } });
  };

  const handleLoadTeam = (option: { id: string; label: string }) => {
    loadTeamRoster(option.id, 'team1');
    setTeam1(option.label); // Update local state to match
  };

  const gameActive = timerIsActive || team1Score !== 0 || team2Score !== 0;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.columnsContainer}>
          {/* Left Column: Teams */}
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>TEAMS</Text>
            <View style={styles.inputGroupFullWidth}>
              <Text style={styles.inputLabel}>TEAM 1 NAME</Text>
              <View style={styles.teamInputRow}>
                <TextInput
                  style={[styles.inputStacked, styles.teamNameInput, { textAlign: 'left' }]}
                  value={team1}
                  onChangeText={setTeam1}
                  placeholder="Team 1 Name"
                  placeholderTextColor={palette.textMuted}
                />
                <Dropdown
                  options={savedTeams.map((t) => ({ id: t.id, label: t.name }))}
                  placeholder="Load"
                  onSelect={handleLoadTeam}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.editRosterButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleEditRoster}>
                  <MaterialCommunityIcons name="account-group" size={20} color={palette.accent} />
                  <Text style={styles.editRosterButtonText}>
                    {team1Roster.length > 0 ? team1Roster.length : 'Roster'}
                  </Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.inputGroupFullWidth}>
              <Text style={styles.inputLabel}>TEAM 2 NAME</Text>
              <TextInput
                style={[styles.inputStacked, { textAlign: 'left' }]}
                value={team2}
                onChangeText={setTeam2}
                placeholder="Team 2 Name"
                placeholderTextColor={palette.textMuted}
              />
            </View>

            <View style={styles.divider} />

            {/* Stat Tracking Mode */}
            <Text style={styles.sectionTitle}>STAT TRACKING</Text>
            <Switch
              label="Track Stats"
              value={statTrackingEnabled}
              onValueChange={setStatTrackingEnabledLocal}
            />

            {hasRoster && (
              <Pressable style={styles.clearRosterButton} onPress={handleClearRosters}>
                <Text style={styles.clearRosterText}>Clear Player Rosters</Text>
              </Pressable>
            )}
          </View>

          {/* Right Column: Rules */}
          <View style={styles.column}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>RULES</Text>
              {gameActive && <Text style={styles.helperText}>* Locked during game</Text>}
            </View>

            <View style={styles.inputsGrid}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {gameActive && (
                    <MaterialCommunityIcons name="lock" size={10} color={palette.textMuted} />
                  )}{' '}
                  GAME TO
                </Text>
                <TextInput
                  style={[styles.inputStacked, gameActive && styles.inputDisabled]}
                  value={gameTo}
                  onChangeText={setGameTo}
                  placeholder="15"
                  placeholderTextColor={palette.textMuted}
                  keyboardType="numeric"
                  editable={!gameActive}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {gameActive && (
                    <MaterialCommunityIcons name="lock" size={10} color={palette.textMuted} />
                  )}{' '}
                  GAME LENGTH
                </Text>
                <View style={styles.inputWithSuffix}>
                  <TextInput
                    style={[
                      styles.inputStacked,
                      styles.inputWithSuffixInput,
                      gameActive && styles.inputDisabled,
                    ]}
                    value={gameLength}
                    onChangeText={setGameLengthLocal}
                    placeholder="90"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="numeric"
                    editable={!gameActive}
                  />
                  <Text style={[styles.inputSuffix, gameActive && styles.inputDisabled]}>min</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {gameActive && (
                    <MaterialCommunityIcons name="lock" size={10} color={palette.textMuted} />
                  )}{' '}
                  SOFT CAP
                </Text>
                <View style={styles.inputWithSuffix}>
                  <TextInput
                    style={[
                      styles.inputStacked,
                      styles.inputWithSuffixInput,
                      gameActive && styles.inputDisabled,
                    ]}
                    value={softCapTime}
                    onChangeText={setSoftCapTimeLocal}
                    placeholder="70"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="numeric"
                    editable={!gameActive}
                  />
                  <Text style={[styles.inputSuffix, gameActive && styles.inputDisabled]}>min</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {gameActive && (
                    <MaterialCommunityIcons name="lock" size={10} color={palette.textMuted} />
                  )}{' '}
                  TIMEOUTS/HALF
                </Text>
                <TextInput
                  style={[styles.inputStacked, gameActive && styles.inputDisabled]}
                  value={timeoutsCount}
                  onChangeText={setTimeoutsCount}
                  placeholder="2"
                  placeholderTextColor={palette.textMuted}
                  keyboardType="numeric"
                  editable={!gameActive}
                />
              </View>

              <View style={styles.inputGroup}>
                <Switch
                  label="Floater"
                  value={floaterEnabled}
                  onValueChange={setFloaterEnabledLocal}
                  disabled={gameActive}
                  locked={gameActive}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.footerButton,
            styles.cancelButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.footerButton,
            styles.newGameButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleNewGame}>
          <Text style={styles.newGameButtonText}>New Game</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.footerButton,
            styles.saveButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    color: palette.textMuted,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 8,
  },
  columnsContainer: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: palette.accent,
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: palette.textInverse,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  // Stacked inputs grid
  inputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  inputGroup: {
    width: '47%',
  },
  inputGroupFullWidth: {
    width: '100%',
    marginBottom: 0,
  },
  teamInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  teamNameInput: {
    flex: 1,
  },
  editRosterButton: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: palette.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editRosterButtonText: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: palette.textMuted,
    marginBottom: 6,
  },
  inputStacked: {
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '600',
    color: palette.textInverse,
    backgroundColor: 'rgba(255,255,255,0.08)',
    textAlign: 'center',
  },
  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWithSuffixInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.textMuted,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    height: 48,
    lineHeight: 48,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: 'rgba(255,255,255,0.2)',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontSize: 15,
    color: palette.textInverse,
    fontWeight: '500',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledContainer: {
    opacity: 0.6,
  },
  disabledLabel: {
    color: palette.textMuted,
  },
  helperText: {
    fontSize: 11,
    color: palette.textMuted,
  },
  clearRosterButton: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: palette.danger,
  },
  clearRosterText: {
    color: palette.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cancelButtonText: {
    color: palette.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  newGameButton: {
    backgroundColor: palette.success,
  },
  newGameButtonText: {
    color: palette.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: palette.accent,
  },
  saveButtonText: {
    color: palette.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
});
