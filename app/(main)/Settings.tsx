import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import { TeamColorPicker } from '@/components/ui/ColorPicker';
import { NumberPicker } from '@/components/ui/NumberPicker';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { useTheme } from '@/context/ThemeContext';
import { useIsGameActive } from '@/hooks/useIsGameActive';
import { useKeyboardDidHide } from '@/hooks/useKeyboardDidHide';
import { useLayout } from '@/hooks/useLayout';
import { useNewGame } from '@/hooks/useNewGame';
import { MAX_TEAM_NAME_LENGTH } from '@/lib/constants';
import { SavedTeam } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTutorialStore } from '@/store/tutorialStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SettingsScreen() {
  const { currentTeam } = useGameStore();
  return <SettingsContent key={currentTeam?.id} />;
}

function SettingsContent() {
  const { isLandscape } = useLayout();
  const styles = createStyles(isLandscape);
  const { palette, themeMode, setThemeMode } = useTheme();
  const { showAlert } = useAlert();
  const { hasSeenStatsTutorial, triggerStatsTutorial } = useTutorialStore();
  const {
    mmpColor,
    fmpColor,
    setMmpColor,
    setFmpColor,
    resetMatchingTypeColors,
    genderRatioEnabled,
    setGenderRatioEnabled,
    lineCallingEnabled,
    setLineCallingEnabled,
    numPlayers,
    setNumPlayers,
    statEntryOrder,
    setStatEntryOrder,
  } = useSettingsStore();

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
    pointTimerEnabled,
    setPointTimerEnabled,
    savedTeams,
    saveCurrentTeam,
  } = useGameStore();

  const { confirmNewGame } = useNewGame({ onSuccess: () => router.push('/') });

  // Derived values from currentTeam
  const team1Name = currentTeam?.name ?? 'Team 1';
  const team1Roster = currentTeam?.roster ?? [];

  const timeoutsCount = team1Timeouts.length;
  // Local draft state for controlled inputs (needed for validation or string->number conversion)
  const [team1NameDraft, setTeam1NameDraft] = useState(team1Name);

  // Soft Cap displays as time (when soft cap triggers), converts to softCapMins for storage
  const softCapTime = gameLength - softCapMins;

  const gameActive = useIsGameActive();

  // Save all draft inputs - called on keyboard hide (for Android back button)
  const saveAllDrafts = () => {
    // Team 1 name
    const newTeam1Name = team1NameDraft.trim();
    if (newTeam1Name && currentTeam) {
      const existingTeam = savedTeams.find(
        (t) => t.name.toLowerCase() === newTeam1Name.toLowerCase() && t.id !== currentTeam.id,
      );
      if (!existingTeam && newTeam1Name !== team1Name) {
        const updatedTeam: SavedTeam = { ...currentTeam, name: newTeam1Name };
        setCurrentTeam(updatedTeam);
        saveCurrentTeam();
      }
    }
  };

  // Handle Android back button dismissing keyboard (doesn't trigger onBlur)
  useKeyboardDidHide(saveAllDrafts);

  const handleEditRoster = () => {
    router.push({ pathname: '/EditRoster', params: { teamName: team1Name } });
  };

  const handleImportTeamFromApi = () => {
    router.push('/ImportTeam');
  };

  // Save team when name editing finishes (on blur)
  const handleTeam1NameBlur = () => {
    const newName = team1NameDraft.trim();

    // Prevent empty name - revert to current
    if (!newName) {
      setTeam1NameDraft(team1Name);
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
      setTeam1NameDraft(team1Name); // Revert to current name
      return;
    }

    // currentTeam should always exist by this point (set on load or when creating new team)
    if (!currentTeam) return;

    const updatedTeam: SavedTeam = { ...currentTeam, name: newName };
    setCurrentTeam(updatedTeam);
    saveCurrentTeam();
  };

  // Dynamic Styles
  const containerStyle = { backgroundColor: palette.primary };
  const textInverseStyle = { color: palette.textInverse };
  const textMutedStyle = { color: palette.textMuted };
  const borderStyle = { borderColor: palette.overlay20 };
  const inputBgStyle = { backgroundColor: palette.overlay08 };
  const dividerStyle = { backgroundColor: palette.overlay10 };

  const renderColorSettings = () => (
    <>
      <View style={[styles.divider, dividerStyle]} />

      <Text style={[styles.sectionTitle, textInverseStyle]}>TEAM COLORS</Text>
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

      <View style={[styles.divider, dividerStyle]} />

      <Text style={[styles.sectionTitle, textInverseStyle]}>PLAYER NAME COLORS</Text>
      <TeamColorPicker label="MMP (MALE MATCHING)" value={mmpColor} onChange={setMmpColor} />
      <View style={{ height: 12 }} />
      <TeamColorPicker label="FMP (FEMALE MATCHING)" value={fmpColor} onChange={setFmpColor} />
      <Pressable
        style={({ pressed }) => [styles.resetColorsButton, pressed && { opacity: 0.7 }]}
        onPress={resetMatchingTypeColors}>
        <Text style={[styles.resetColorsButtonText, textMutedStyle]}>Reset to Default</Text>
      </Pressable>
    </>
  );

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
          hitSlop={24}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>SETTINGS</Text>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            style={({ pressed }) => [styles.themeButton, pressed && styles.buttonPressed]}
            hitSlop={12}>
            <MaterialIcons
              name={themeMode === 'light' ? 'dark-mode' : 'light-mode'}
              size={20}
              color={palette.textInverse}
            />
          </Pressable>
          <Pressable
            onPress={confirmNewGame}
            style={({ pressed }) => [styles.newGameButton, pressed && styles.buttonPressed]}
            hitSlop={12}>
            <Text style={[styles.newGameButtonText, { color: palette.success }]}>New Game</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent]}>
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
        <View key={isLandscape ? 'landscape' : 'portrait'} style={styles.columnsContainer}>
          {/* Left Column: Teams */}
          <View style={styles.column}>
            <Text style={[styles.sectionTitle, textInverseStyle]}>TEAMS</Text>
            <Pressable
              style={({ pressed }) => [
                styles.importTeamButton,
                { backgroundColor: palette.accentOverlay10, borderColor: palette.accentOverlay30 },
                pressed && styles.buttonPressed,
              ]}
              onPress={handleImportTeamFromApi}>
              <MaterialCommunityIcons
                name="cloud-download-outline"
                size={20}
                color={palette.accent}
              />
              <Text style={[styles.importTeamButtonText, { color: palette.accent }]}>
                Import from USA Ultimate
              </Text>
            </Pressable>
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
                    ]}
                    value={team1NameDraft}
                    onChangeText={setTeam1NameDraft}
                    onBlur={handleTeam1NameBlur}
                    placeholder="Team 1 Name"
                    placeholderTextColor={palette.textMuted}
                    maxLength={MAX_TEAM_NAME_LENGTH}
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
                value={team2Name}
                onChangeText={setTeam2Name}
                placeholder="Team 2 Name"
                placeholderTextColor={palette.textMuted}
                maxLength={MAX_TEAM_NAME_LENGTH}
              />
            </View>

            {isLandscape && renderColorSettings()}
          </View>

          {/* Right Column: Game Settings */}
          <View style={styles.column}>
            <Text style={[styles.sectionTitle, textInverseStyle]}>GAME SETTINGS</Text>

            <View style={styles.inputsGrid}>
              <View style={styles.inputGroup}>
                <NumberPicker
                  label="GAME TO"
                  value={gameTo}
                  onChange={setGameTo}
                  min={1}
                  max={99}
                  quickOptions={[13, 15]}
                  disabled={gameActive}
                />
              </View>

              <View style={styles.inputGroup}>
                <NumberPicker
                  label="HARD CAP"
                  value={gameLength}
                  onChange={(val) => {
                    setGameLength(val);
                    // Clamp soft cap if needed
                    if (softCapTime > val) {
                      setSoftCapMins(Math.max(0, val - softCapTime));
                    }
                  }}
                  min={1}
                  max={180}
                  suffix="min"
                  quickOptions={[90, 105, 110, 120]}
                  disabled={gameActive}
                />
              </View>

              <View style={styles.inputGroup}>
                <NumberPicker
                  label="SOFT CAP"
                  value={softCapTime}
                  onChange={(val) => setSoftCapMins(gameLength - val)}
                  min={0}
                  max={gameLength}
                  suffix="min"
                  quickOptions={[
                    Math.max(0, gameLength - 30),
                    Math.max(0, gameLength - 20),
                    Math.max(0, gameLength - 15),
                    Math.max(0, gameLength - 10),
                  ]}
                  disabled={gameActive}
                />
              </View>

              <View style={styles.inputGroup}>
                <NumberPicker
                  label="NUM PLAYERS"
                  value={numPlayers}
                  onChange={setNumPlayers}
                  min={1}
                  max={7}
                  quickOptions={[3, 5, 7]}
                  disabled={gameActive}
                />
              </View>

              <View style={styles.inputGroup}>
                <SegmentedControl
                  label={autoHalftimeEnabled ? 'TIMEOUTS/HALF' : 'TIMEOUTS'}
                  options={[
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                  ]}
                  value={timeoutsCount.toString()}
                  onChange={(val) => {
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) resetTimeouts(num);
                  }}
                  disabled={gameActive}
                />
              </View>

              <View style={styles.inputGroup} />

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
                      // Disable point timer and line calling if stat tracking is disabled
                      if (!enabled) {
                        setPointTimerEnabled(false);
                        setLineCallingEnabled(false);
                      }
                    }}
                    disabled={gameActive}
                    locked={gameActive}
                  />
                </View>
              </View>
              {statTrackingEnabled && (
                <>
                  <View style={styles.inputGroup}>
                    <Switch
                      label="Track Goal First"
                      value={statEntryOrder === 'goal_first'}
                      onValueChange={(enabled) =>
                        setStatEntryOrder(enabled ? 'goal_first' : 'assist_first')
                      }
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Switch
                      label="Point Timer"
                      value={pointTimerEnabled}
                      onValueChange={setPointTimerEnabled}
                      disabled={gameActive}
                      locked={gameActive}
                    />
                  </View>
                </>
              )}
              <View style={styles.inputGroup}>
                <Switch
                  label="Gender Ratio"
                  value={genderRatioEnabled}
                  onValueChange={setGenderRatioEnabled}
                  disabled={gameActive}
                  locked={gameActive}
                />
              </View>
              {statTrackingEnabled && (
                <View style={styles.inputGroup}>
                  <Switch
                    label="Line Calling"
                    value={lineCallingEnabled}
                    onValueChange={setLineCallingEnabled}
                    disabled={gameActive}
                    locked={gameActive}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
        {!isLandscape && renderColorSettings()}
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
      zIndex: 10,
    },
    headerTitle: {
      position: isLandscape ? 'absolute' : 'relative',
      left: isLandscape ? 0 : undefined,
      right: isLandscape ? 0 : undefined,
      textAlign: isLandscape ? 'center' : 'left',
      flex: isLandscape ? undefined : 1,
      marginLeft: isLandscape ? undefined : 8,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    headerSpacer: {
      width: 40,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    themeButton: {
      padding: 8,
    },
    scrollContent: {
      padding: 24,
      paddingTop: 8,
    },
    columnsContainer: {
      flexDirection: isLandscape ? 'row' : 'column',
      gap: 24,
      alignItems: isLandscape ? 'flex-start' : 'stretch',
    },
    column: {
      flex: isLandscape ? 1 : 0,
      width: isLandscape ? undefined : '100%',
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
      width: '48%',
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
    importTeamButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 44,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
    },
    importTeamButtonText: {
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
      paddingHorizontal: 8,
      paddingVertical: 8,
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
}
