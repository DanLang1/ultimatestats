import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import { TeamColorPicker } from '@/components/ui/ColorPicker';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { useTheme } from '@/context/ThemeContext';
import { useNewGame } from '@/hooks/useNewGame';
import { SavedTeam } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import { useTutorialStore } from '@/store/tutorialStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SettingsScreen() {
  const { palette, themeMode, setThemeMode } = useTheme();
  const { showAlert } = useAlert();
  const { hasSeenStatsTutorial, triggerStatsTutorial } = useTutorialStore();

  const {
    currentTeam,
    setCurrentTeam,
    team2Name,
    setTeam2Name,
    team1BgColor,
    team2BgColor,
    gameTo,
    team1Timeouts,
    setTeamBgColor,
    setGameTo,
    resetTimeouts,
    floaterEnabled,
    setFloaterEnabled,
    autoHalftimeEnabled,
    setAutoHalftimeEnabled,
    setGameLength,
    gameLength,
    softCapMins,
    setSoftCapMins,
    statTrackingEnabled,
    setStatTrackingEnabled,
    timerIsActive,
    team1Score,
    team2Score,
    savedTeams,
    saveCurrentTeam,
  } = useGameStore();

  const { confirmNewGame } = useNewGame();

  // Derived values from currentTeam
  const team1Name = currentTeam?.name ?? 'Team 1';
  const team1Roster = currentTeam?.roster ?? [];

  const timeoutsCount = team1Timeouts.length;
  const [team1NameResetKey, setTeam1NameResetKey] = useState(0);
  const [team2NameResetKey, setTeam2NameResetKey] = useState(0);

  // Soft Cap displays as time (when soft cap triggers), converts to softCapMins for storage
  const softCapTime = gameLength - softCapMins;

  const handleGameLengthEndEditing = (e: { nativeEvent: { text: string } }) => {
    const num = parseInt(e.nativeEvent.text, 10);
    if (isNaN(num) || num < 1) return;
    // Clamp softCapMins if it would exceed new game length
    // This preserves "minutes before end" - only adjusting if necessary
    if (softCapMins > num) {
      setSoftCapMins(num);
    }
    setGameLength(num);
  };

  const handleSoftCapEndEditing = (e: { nativeEvent: { text: string } }) => {
    const num = parseInt(e.nativeEvent.text, 10);
    if (isNaN(num)) return;
    const clamped = Math.max(0, Math.min(gameLength, num));
    setSoftCapMins(Math.max(0, gameLength - clamped));
  };

  const handleEditRoster = () => {
    router.push({ pathname: '/EditRoster', params: { teamName: team1Name } });
  };

  // Save team when name editing finishes (not on every keystroke)
  const handleTeam1NameEndEditing = (e: { nativeEvent: { text: string } }) => {
    const newName = e.nativeEvent.text.trim();

    // Prevent empty name
    if (!newName) {
      setTeam1NameResetKey((k) => k + 1);
      return;
    }

    // Check if name already exists (case-insensitive, excluding current team)
    const existingTeam = savedTeams.find(
      (t) => t.name.toLowerCase() === newName.toLowerCase() && t.id !== currentTeam?.id,
    );

    if (existingTeam) {
      showAlert({
        title: 'Team Name Exists',
        message: `A team named "${existingTeam.name}" already exists. Please choose a different name.`,
        buttons: [{ text: 'I will not try to break the app again', style: 'default' }],
      });
      // Force TextInput to re-render with original name
      setTeam1NameResetKey((k) => k + 1);
      return;
    }

    // currentTeam should always exist by this point (set on load or when creating new team)
    if (!currentTeam) return;

    const updatedTeam: SavedTeam = { ...currentTeam, name: newName };
    setCurrentTeam(updatedTeam);
    saveCurrentTeam();
  };

  const handleTeam2NameEndEditing = (e: { nativeEvent: { text: string } }) => {
    const newName = e.nativeEvent.text.trim();
    if (!newName) {
      // Revert to previous value if empty
      setTeam2NameResetKey((k) => k + 1);
      return;
    }
    setTeam2Name(newName);
  };

  const handleGameToEndEditing = (e: { nativeEvent: { text: string } }) => {
    const num = parseInt(e.nativeEvent.text, 10);
    if (isNaN(num) || num < 1) return;
    setGameTo(num);
  };

  const handleTimeoutsChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      return;
    }
    resetTimeouts(num);
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
        <Pressable
          onPress={confirmNewGame}
          style={({ pressed }) => [
            styles.newGameButton,
            { backgroundColor: palette.overlay10 },
            pressed && styles.buttonPressed,
          ]}
          hitSlop={12}>
          <Text style={[styles.newGameButtonText, { color: palette.success }]}>New Game</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {gameActive && (
          <View
            style={[
              styles.activeGameBanner,
              { backgroundColor: palette.warning + '15', borderColor: palette.warning + '30' },
            ]}>
            <MaterialCommunityIcons name="lock-outline" size={16} color={palette.warning} />
            <Text style={[styles.activeGameBannerText, { color: palette.warning }]}>
              Game in progress: some settings are locked
            </Text>
          </View>
        )}
        <View style={styles.columnsContainer}>
          {/* Left Column: Teams */}
          <View style={styles.column}>
            <Text style={[styles.sectionTitle, textInverseStyle]}>TEAMS</Text>
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
                      gameActive && styles.inputDisabled,
                    ]}
                    key={team1NameResetKey}
                    defaultValue={team1Name}
                    onEndEditing={handleTeam1NameEndEditing}
                    placeholder="Team 1 Name"
                    placeholderTextColor={palette.textMuted}
                    maxLength={20}
                    editable={!gameActive}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.editRosterButton,
                    {
                      backgroundColor: palette.accentOverlay10,
                      borderColor: palette.accentOverlay30,
                    },
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleEditRoster}>
                  <MaterialCommunityIcons name="account-group" size={20} color={palette.accent} />
                  <Text style={[styles.editRosterButtonText, { color: palette.accent }]}>
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
                key={team2NameResetKey}
                defaultValue={team2Name}
                onEndEditing={handleTeam2NameEndEditing}
                placeholder="Team 2 Name"
                placeholderTextColor={palette.textMuted}
                maxLength={20}
              />
            </View>

            <View style={[styles.divider, dividerStyle]} />

            {/* Team Colors */}
            <Text style={[styles.sectionTitle, textInverseStyle]}>COLORS</Text>
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
                setTeamBgColor('team2', palette.primary);
              }}>
              <Text style={[styles.resetColorsButtonText, textMutedStyle]}>Reset to Default</Text>
            </Pressable>

            {/* Theme */}
            <Text style={[styles.sectionTitle, textInverseStyle]}>DISPLAY</Text>
            <Switch
              label="Light Theme"
              value={themeMode === 'light'}
              onValueChange={(val) => setThemeMode(val ? 'light' : 'dark')}
            />
          </View>

          {/* Right Column: Game Settings */}
          <View style={styles.column}>
            <Text style={[styles.sectionTitle, textInverseStyle]}>GAME SETTINGS</Text>

            <View style={styles.inputsGrid}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, textMutedStyle]}>GAME TO</Text>
                <TextInput
                  style={[styles.inputStacked, borderStyle, textInverseStyle, inputBgStyle]}
                  defaultValue={gameTo.toString()}
                  onEndEditing={handleGameToEndEditing}
                  placeholder="15"
                  placeholderTextColor={palette.textMuted}
                  keyboardType="numeric"
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
                    defaultValue={gameLength.toString()}
                    onEndEditing={handleGameLengthEndEditing}
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
                    defaultValue={softCapTime.toString()}
                    onEndEditing={handleSoftCapEndEditing}
                    placeholder="70"
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
                <SegmentedControl
                  label={autoHalftimeEnabled ? 'TIMEOUTS/HALF' : 'TIMEOUTS'}
                  options={[
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                  ]}
                  value={timeoutsCount.toString()}
                  onChange={handleTimeoutsChange}
                  disabled={gameActive}
                />
              </View>

              <View style={styles.inputGroup}>
                <Switch
                  label="Halftime"
                  value={autoHalftimeEnabled}
                  onValueChange={(enabled) => {
                    setAutoHalftimeEnabled(enabled);
                    if (!enabled) {
                      setFloaterEnabled(false);
                    }
                  }}
                  disabled={gameActive}
                  locked={gameActive}
                />
              </View>
              {autoHalftimeEnabled && (
                <View style={styles.inputGroup}>
                  <Switch
                    label="Floater"
                    value={floaterEnabled}
                    onValueChange={setFloaterEnabled}
                    disabled={gameActive}
                    locked={gameActive}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <View style={styles.switchWithHelp}>
                  <Switch
                    label="Track Stats"
                    value={statTrackingEnabled}
                    onValueChange={(enabled) => {
                      setStatTrackingEnabled(enabled);
                      if (enabled && !hasSeenStatsTutorial) {
                        triggerStatsTutorial();
                      }
                    }}
                    disabled={gameActive}
                    locked={gameActive}
                  />
                  <Pressable
                    onPress={triggerStatsTutorial}
                    hitSlop={8}
                    style={[styles.helpButton, { backgroundColor: palette.overlay08 }]}>
                    <MaterialCommunityIcons
                      name="help-circle-outline"
                      size={18}
                      color={palette.textMuted}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
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
  buttonDisabled: {
    opacity: 0.5,
  },
  newTeamButton: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newTeamButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  newGameButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  newGameButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  switchWithHelp: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpButton: {
    padding: 4,
    borderRadius: 12,
  },
  activeGameBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  activeGameBannerText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
