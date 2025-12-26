import { ThemedView } from '@/components/ThemedView';
import { TeamColorPicker } from '@/components/ui/ColorPicker';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { TeamDropdown } from '@/components/ui/TeamDropdown';
import { useTheme } from '@/context/ThemeContext';
import { useGameStore } from '@/store/gameStore';
// import { palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SettingsScreen() {
  const { palette, themeMode, setThemeMode } = useTheme();

  const {
    team1Name,
    team2Name,
    // ... (rest of store)
    team1BgColor,
    team2BgColor,
    gameTo: gameToStore,
    team1Timeouts,
    setTeamNames,
    setTeamBgColor,
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
    clearRoster,
    timerIsActive,
    team1Score,
    team2Score,
    savedTeams,
    loadSavedTeams,
    loadTeamRoster,
    deleteTeam,
    saveTeam,
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

  // Check if team name conflicts with an existing saved team (case-insensitive)
  const teamNameConflict =
    team1.trim() !== '' &&
    team1.trim().toLowerCase() !== team1Name.toLowerCase() &&
    savedTeams.some((t) => t.name.toLowerCase() === team1.trim().toLowerCase());

  const handleSave = () => {
    performSave(team1);
  };

  const performSave = (newTeamName: string) => {
    const gLength = Number(gameLength) || 90;
    const sCapTime = Number(softCapTime) || gLength - 20;

    setTeamNames(newTeamName, team2);
    setGameToStore(Number(gameTo) || 15);
    setFloaterEnabled(floaterEnabled);
    setGameLength(gLength);
    setSoftCapMins(Math.max(0, gLength - sCapTime));
    setStatTrackingEnabled(statTrackingEnabled);

    // If keeping players with new name, save the team
    if (hasRoster) {
      saveTeam(newTeamName, team1Roster);
    }

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

  const handleEditRoster = () => {
    router.push({ pathname: '/EditRoster', params: { teamName: team1 } });
  };

  const handleLoadTeam = (option: { id: string; label: string }) => {
    if (option.id === 'new-team') {
      // Create new team
      clearRoster();
      setTeam1('New Team');
      setTeamNames('New Team', team2);
    } else {
      // Load existing team
      loadTeamRoster(option.id, 'team1');
      setTeam1(option.label);
    }
  };

  const handleDeleteTeam = (option: { id: string; label: string }) => {
    deleteTeam(option.id);
  };

  const gameActive = timerIsActive || team1Score !== 0 || team2Score !== 0;

  // Dynamic Styles
  const containerStyle = { backgroundColor: palette.primary };
  const textInverseStyle = { color: palette.textInverse };
  const textMutedStyle = { color: palette.textMuted };
  const borderStyle = { borderColor: palette.overlay20 };
  const inputBgStyle = { backgroundColor: palette.overlay08 };
  const dividerStyle = { backgroundColor: palette.overlay10 };

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
          hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>SETTINGS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.columnsContainer}>
          {/* Left Column: Teams */}
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>TEAMS</Text>
            <View style={styles.inputGroupFullWidth}>
              <Text style={[styles.inputLabel, textMutedStyle]}>My Team</Text>
              <View style={styles.teamInputRow}>
                <View style={styles.teamNameInputWrapper}>
                  <TextInput
                    style={[
                      styles.inputStacked,
                      styles.teamNameInput,
                      { textAlign: 'left' },
                      borderStyle,
                      textInverseStyle,
                      inputBgStyle,
                      teamNameConflict && { borderColor: palette.danger },
                    ]}
                    value={team1}
                    onChangeText={setTeam1}
                    placeholder="Team 1 Name"
                    placeholderTextColor={palette.textMuted}
                    maxLength={20}
                  />
                  {teamNameConflict && (
                    <Text style={styles.errorText}>{team1.trim()} already exists</Text>
                  )}
                </View>
                <TeamDropdown
                  options={[
                    { id: 'new-team', label: '+ New Team' },
                    ...savedTeams
                      .filter((t) => t.name !== team1)
                      .map((t) => ({ id: t.id, label: t.name })),
                  ]}
                  placeholder="Teams"
                  onSelect={handleLoadTeam}
                  onDelete={handleDeleteTeam}
                />

                <Pressable
                  style={({ pressed }) => [
                    styles.editRosterButton,
                    teamNameConflict && styles.buttonDisabled,
                    pressed && !teamNameConflict && styles.buttonPressed,
                  ]}
                  onPress={handleEditRoster}
                  disabled={teamNameConflict}>
                  {teamNameConflict && (
                    <MaterialCommunityIcons name="lock" size={14} color={palette.textMuted} />
                  )}
                  <MaterialCommunityIcons name="account-group" size={20} color={palette.accent} />
                  <Text style={styles.editRosterButtonText}>
                    {team1Roster.length > 0 ? team1Roster.length : 'Roster'}
                  </Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.inputGroupFullWidth}>
              <Text style={[styles.inputLabel, textMutedStyle]}>Opposing Team</Text>
              <TextInput
                style={[
                  styles.inputStacked,
                  { textAlign: 'left' },
                  borderStyle,
                  textInverseStyle,
                  inputBgStyle,
                ]}
                value={team2}
                onChangeText={setTeam2}
                placeholder="Team 2 Name"
                placeholderTextColor={palette.textMuted}
                maxLength={20}
              />
            </View>

            <View style={[styles.divider, dividerStyle]} />

            {/* Team Colors */}
            <Text style={styles.sectionTitle}>COLORS</Text>
            <TeamColorPicker
              label="MY TEAM COLOR"
              value={team1BgColor}
              onChange={(color) => setTeamBgColor('team1', color)}
            />
            <View style={{ height: 12 }} />
            <TeamColorPicker
              label="OPPOSING TEAM COLOR"
              value={team2BgColor}
              onChange={(color) => setTeamBgColor('team2', color)}
            />
            <Pressable
              style={({ pressed }) => [styles.resetColorsButton, pressed && { opacity: 0.7 }]}
              onPress={() => {
                setTeamBgColor('team1', palette.surface);
                setTeamBgColor('team2', palette.primary); // Note: This sets colors to current theme defaults actually.
                // To be strictly correct, we might want reference to original defaults or dynamic defaults.
                // But for now, this uses the ACTIVE palette which is better than hardcoded.
              }}>
              <Text style={[styles.resetColorsButtonText, textMutedStyle]}>Reset to Default</Text>
            </Pressable>

            <View style={[styles.divider, dividerStyle]} />

            {/* Stat Tracking Mode */}
            <Text style={styles.sectionTitle}>STAT TRACKING</Text>
            <Switch
              label="Track Stats"
              value={statTrackingEnabled}
              onValueChange={setStatTrackingEnabledLocal}
            />

            <View style={[styles.divider, dividerStyle]} />

            {/* Theme */}
            <Text style={styles.sectionTitle}>DISPLAY</Text>
            <Switch
              label="Light Theme"
              value={themeMode === 'light'}
              onValueChange={(val) => setThemeMode(val ? 'light' : 'dark')}
            />
          </View>

          {/* Right Column: Rules */}
          <View style={styles.column}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>RULES</Text>
              {gameActive && (
                <Text style={[styles.helperText, textMutedStyle]}>* Locked during game</Text>
              )}
            </View>

            <View style={styles.inputsGrid}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, textMutedStyle]}>
                  {gameActive && (
                    <MaterialCommunityIcons name="lock" size={10} color={palette.textMuted} />
                  )}{' '}
                  GAME TO
                </Text>
                <TextInput
                  style={[
                    styles.inputStacked,
                    gameActive && styles.inputDisabled,
                    borderStyle,
                    textInverseStyle,
                    inputBgStyle,
                  ]}
                  value={gameTo}
                  onChangeText={setGameTo}
                  placeholder="15"
                  placeholderTextColor={palette.textMuted}
                  keyboardType="numeric"
                  editable={!gameActive}
                  maxLength={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, textMutedStyle]}>
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
                      borderStyle,
                      textInverseStyle,
                      inputBgStyle,
                    ]}
                    value={gameLength}
                    onChangeText={setGameLengthLocal}
                    placeholder="90"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="numeric"
                    editable={!gameActive}
                    maxLength={4}
                  />
                  <Text
                    style={[
                      styles.inputSuffix,
                      gameActive && styles.inputDisabled,
                      borderStyle,
                      {
                        color: palette.textMuted,
                        borderLeftWidth: 0,
                        backgroundColor: palette.overlay05,
                      },
                    ]}>
                    min
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, textMutedStyle]}>
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
                      borderStyle,
                      textInverseStyle,
                      inputBgStyle,
                    ]}
                    value={softCapTime}
                    onChangeText={setSoftCapTimeLocal}
                    placeholder="70"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="numeric"
                    editable={!gameActive}
                    maxLength={gameLength.length || 4}
                  />
                  <Text
                    style={[
                      styles.inputSuffix,
                      gameActive && styles.inputDisabled,
                      borderStyle,
                      {
                        color: palette.textMuted,
                        borderLeftWidth: 0,
                        backgroundColor: palette.overlay05,
                      },
                    ]}>
                    min
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <SegmentedControl
                  label="TIMEOUTS/HALF"
                  options={[
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                  ]}
                  value={timeoutsCount}
                  onChange={setTimeoutsCount}
                  disabled={gameActive}
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
      <View style={[styles.footer, { borderTopColor: palette.overlay10 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.footerButton,
            styles.cancelButton,
            { borderColor: palette.overlay20, backgroundColor: palette.overlay10 },
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.back()}>
          <Text style={[styles.cancelButtonText, { color: palette.textInverse }]}>Cancel</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.footerButton, pressed && styles.buttonPressed]}
          onPress={handleNewGame}>
          <Text style={[styles.newGameButtonText, { color: palette.primary }]}>New Game</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.footerButton,
            teamNameConflict && styles.buttonDisabled,
            pressed && !teamNameConflict && styles.buttonPressed,
          ]}
          onPress={handleSave}
          disabled={teamNameConflict}>
          {teamNameConflict && (
            <MaterialCommunityIcons name="lock" size={14} color={palette.textMuted} />
          )}
          <Text style={[styles.saveButtonText, { color: palette.textInverse }]}>Save</Text>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
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
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
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
  teamNameInputWrapper: {
    flex: 1,
  },
  teamNameInput: {
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  editRosterButton: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editRosterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  inputStacked: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '600',
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
    paddingHorizontal: 12,
    height: 48,
    lineHeight: 48,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  helperText: {
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
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
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  newGameButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  resetColorsButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  resetColorsButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
