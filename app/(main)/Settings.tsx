import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import { TeamColorPicker } from '@/components/ui/ColorPicker';
import { NumberPicker } from '@/components/ui/NumberPicker';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { useTheme } from '@/context/ThemeContext';
import { useIsGameActive } from '@/hooks/useIsGameActive';
import { useKeyboardDidHide } from '@/hooks/useKeyboardDidHide';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useNewGame } from '@/hooks/useNewGame';
import { MAX_TEAM_NAME_LENGTH } from '@/lib/constants';
import { SavedTeam } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import { OrientationMode, useSettingsStore } from '@/store/settingsStore';
import { useTutorialStore } from '@/store/tutorialStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useIsFocused } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

export default function SettingsScreen() {
  const { currentTeam } = useGameStore();
  const settingsKey = `${currentTeam?.id ?? 'no-team'}:${currentTeam?.name ?? 'Team 1'}`;
  return <SettingsContent key={settingsKey} />;
}

function SettingsContent() {
  const isFocused = useIsFocused();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const metrics = createMetrics(sizeClass);
  const useCompactColorLayout = sizeClass !== 'small';
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
    orientationMode,
    setOrientationMode,
    statEntryOrder,
    setStatEntryOrder,
    linePlayerSortOrder,
    setLinePlayerSortOrder,
  } = useSettingsStore();

  const {
    currentTeam,
    setCurrentTeam,
    team2Name,
    setTeam2Name,
    team1BgColor,
    team2BgColor,
    gameTo,
    team1Score,
    team2Score,
    team1Timeouts,
    setTeamBgColor,
    isSoftCap,
    softCapPending,
    setGameTo,
    setGameToInGame,
    resetTimeouts,
    floaterEnabled,
    setFloaterEnabled,
    autoHalftimeEnabled,
    gameHalf,
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

  const { confirmNewGame } = useNewGame({ onSuccess: () => router.push('/Scoreboard') });

  const team1Name = currentTeam?.name ?? 'Team 1';
  const team1Roster = currentTeam?.roster ?? [];

  const timeoutsCount = team1Timeouts.length;
  const [team1NameDraft, setTeam1NameDraft] = useState(team1Name);

  const softCapTime = gameLength - softCapMins;
  const isAndroidLargeScreen = Platform.OS === 'android' && sizeClass !== 'small';

  const gameActive = useIsGameActive();
  const maxScore = Math.max(team1Score, team2Score);
  const canEditGameToInGame = gameHalf === 1 && !isSoftCap && !softCapPending;
  const gameToMin =
    gameActive && canEditGameToInGame ? (autoHalftimeEnabled ? 2 * maxScore + 1 : maxScore + 1) : 1;
  const gameToSettingsHelperText = gameActive
    ? autoHalftimeEnabled
      ? 'Adjustable during first half'
      : 'Adjustable until soft cap'
    : null;
  const gameToValidationText =
    gameActive && canEditGameToInGame
      ? autoHalftimeEnabled
        ? `Must be at least ${gameToMin} to keep halftime reachable`
        : `Must be at least ${gameToMin}`
      : undefined;
  const gameToQuickOptions = gameActive ? undefined : [13, 15];

  const handleOrientationModeChange = (nextMode: OrientationMode) => {
    if (nextMode === orientationMode) return;

    if (isAndroidLargeScreen && nextMode !== 'system') {
      showAlert({
        title: 'Orientation Lock Warning',
        message:
          '1. Landscape / Portrait mode may not apply on this large device.\n2. Setting these modes may cause letterboxing.',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set Anyway',
            style: 'default',
            onPress: () => setOrientationMode(nextMode),
          },
        ],
      });
      return;
    }

    setOrientationMode(nextMode);
  };

  const saveAllDrafts = () => {
    void persistTeamNameDraft();
  };

  const persistTeamNameDraft = async () => {
    const newTeam1Name = team1NameDraft.trim();
    if (newTeam1Name && currentTeam) {
      const existingTeam = savedTeams.find(
        (t) => t.name.toLowerCase() === newTeam1Name.toLowerCase() && t.id !== currentTeam.id,
      );
      if (!existingTeam && newTeam1Name !== team1Name) {
        const updatedTeam: SavedTeam = { ...currentTeam, name: newTeam1Name };
        setCurrentTeam(updatedTeam);
        await saveCurrentTeam(updatedTeam);
      }
    }
  };

  useKeyboardDidHide(saveAllDrafts, isFocused);

  const handleEditRoster = () => {
    router.push({ pathname: '/EditRoster', params: { teamName: team1Name } });
  };

  const handleImportTeamFromApi = () => {
    router.push('/ImportTeam');
  };

  const handleTeam1NameBlur = async () => {
    const newName = team1NameDraft.trim();

    if (!newName) {
      setTeam1NameDraft(team1Name);
      return;
    }

    const existingTeam = savedTeams.find(
      (t) => t.name.toLowerCase() === newName.toLowerCase() && t.id !== currentTeam?.id,
    );

    if (existingTeam) {
      showAlert({
        title: 'Team Name Exists',
        message: `A team named "${existingTeam.name}" already exists. Please choose a different name.`,
        buttons: [{ text: 'I will not try to break the app again', style: 'default' }],
      });
      setTeam1NameDraft(team1Name);
      return;
    }

    if (!currentTeam) return;

    const updatedTeam: SavedTeam = { ...currentTeam, name: newName };
    setCurrentTeam(updatedTeam);
    await saveCurrentTeam(updatedTeam);
  };

  const containerStyle: ViewStyle = { backgroundColor: palette.primary };
  const textInverseStyle: TextStyle = { color: palette.textInverse };
  const textMutedStyle: TextStyle = { color: palette.textMuted };
  const borderStyle: TextStyle = { borderColor: palette.overlay20 };
  const inputBgStyle: TextStyle = { backgroundColor: palette.overlay08 };
  const dividerStyle: ViewStyle = { backgroundColor: palette.overlay10 };

  const renderColorSettings = (compact: boolean) => (
    <>
      <View style={[styles.divider, dividerStyle]} />

      <Text style={[styles.sectionTitle, textInverseStyle]}>TEAM COLORS</Text>
      {compact ? (
        <View style={styles.compactColorGrid}>
          <View style={styles.compactColorItem}>
            <TeamColorPicker
              label="MY TEAM COLOR"
              value={team1BgColor}
              onChange={(color) => setTeamBgColor('team1', color)}
              sizeClass={sizeClass}
            />
          </View>
          <View style={styles.compactColorItem}>
            <TeamColorPicker
              label="OPPOSING TEAM COLOR"
              value={team2BgColor}
              onChange={(color) => setTeamBgColor('team2', color)}
              sizeClass={sizeClass}
            />
          </View>
        </View>
      ) : (
        <>
          <TeamColorPicker
            label="MY TEAM COLOR"
            value={team1BgColor}
            onChange={(color) => setTeamBgColor('team1', color)}
            sizeClass={sizeClass}
          />
          <View style={styles.colorPickerSpacer} />
          <TeamColorPicker
            label="OPPOSING TEAM COLOR"
            value={team2BgColor}
            onChange={(color) => setTeamBgColor('team2', color)}
            sizeClass={sizeClass}
          />
        </>
      )}
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
      {compact ? (
        <View style={styles.compactColorGrid}>
          <View style={styles.compactColorItem}>
            <TeamColorPicker
              label="MMP (MALE MATCHING)"
              value={mmpColor}
              onChange={setMmpColor}
              sizeClass={sizeClass}
            />
          </View>
          <View style={styles.compactColorItem}>
            <TeamColorPicker
              label="FMP (FEMALE MATCHING)"
              value={fmpColor}
              onChange={setFmpColor}
              sizeClass={sizeClass}
            />
          </View>
        </View>
      ) : (
        <>
          <TeamColorPicker
            label="MMP (MALE MATCHING)"
            value={mmpColor}
            onChange={setMmpColor}
            sizeClass={sizeClass}
          />
          <View style={styles.colorPickerSpacer} />
          <TeamColorPicker
            label="FMP (FEMALE MATCHING)"
            value={fmpColor}
            onChange={setFmpColor}
            sizeClass={sizeClass}
          />
        </>
      )}
      <Pressable
        style={({ pressed }) => [styles.resetColorsButton, pressed && { opacity: 0.7 }]}
        onPress={resetMatchingTypeColors}>
        <Text style={[styles.resetColorsButtonText, textMutedStyle]}>Reset to Default</Text>
      </Pressable>
    </>
  );

  const renderAppearanceSettings = () => (
    <View style={styles.appearanceSection}>
      <Text style={[styles.sectionTitle, textInverseStyle]}>APP</Text>
      <SegmentedControl
        label="THEME"
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={themeMode}
        onChange={(next) => setThemeMode(next as 'light' | 'dark')}
        sizeClass={sizeClass}
      />
      <SegmentedControl
        label="ORIENTATION"
        options={[
          { value: 'system', label: 'System' },
          { value: 'portrait', label: 'Portrait' },
          { value: 'landscape', label: 'Landscape' },
        ]}
        value={orientationMode}
        onChange={(next) => handleOrientationModeChange(next as OrientationMode)}
        sizeClass={sizeClass}
      />
      {isAndroidLargeScreen && (
        <Text style={[styles.helperText, textMutedStyle]}>
          On large Android devices, orientation locks may be ignored (blame Android not me please).
        </Text>
      )}
    </View>
  );

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="SETTINGS"
        onBack={() => router.back()}
        backHitSlop={24}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        titleOverlayPaddingPortrait={96}
        rightSlot={
          <View style={styles.headerRight}>
            <Pressable
              onPress={confirmNewGame}
              style={({ pressed }) => [styles.newGameButton, pressed && styles.buttonPressed]}
              hitSlop={12}>
              <Text style={[styles.newGameButtonText, { color: palette.success }]}>New Game</Text>
            </Pressable>
          </View>
        }
      />

      <ScrollView contentContainerStyle={[styles.scrollContent]}>
        {gameActive && (
          <View
            style={[
              styles.activeGameBanner,
              { backgroundColor: palette.warning + '15', borderColor: palette.warning + '30' },
            ]}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={metrics.bannerIconSize}
              color={palette.warning}
            />
            <Text style={[styles.activeGameBannerText, { color: palette.warning }]}>
              Game in progress: some settings are locked
            </Text>
          </View>
        )}

        <View key={isLandscape ? 'landscape' : 'portrait'} style={styles.columnsContainer}>
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
                size={metrics.actionIconSize}
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
                  <MaterialCommunityIcons
                    name="account-group"
                    size={metrics.actionIconSize}
                    color={palette.accent}
                  />
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
            {isLandscape && renderAppearanceSettings()}
            {isLandscape && renderColorSettings(useCompactColorLayout)}
          </View>

          <View style={styles.column}>
            <Text style={[styles.sectionTitle, textInverseStyle]}>GAME SETTINGS</Text>

            <View style={styles.inputsGrid}>
              <View style={styles.inputGroup}>
                <NumberPicker
                  label="GAME TO"
                  value={gameTo}
                  onChange={gameActive ? setGameToInGame : setGameTo}
                  min={gameToMin}
                  max={99}
                  quickOptions={gameToQuickOptions}
                  helperText={gameToValidationText}
                  disabled={gameActive && !canEditGameToInGame}
                  sizeClass={sizeClass}
                />
                {gameToSettingsHelperText && (
                  <Text style={[styles.helperText, textMutedStyle]}>
                    {gameToSettingsHelperText}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <NumberPicker
                  label="HARD CAP"
                  value={gameLength}
                  onChange={(val) => {
                    setGameLength(val);
                    if (softCapTime > val) {
                      setSoftCapMins(Math.max(0, val - softCapTime));
                    }
                  }}
                  min={1}
                  max={180}
                  suffix="min"
                  quickOptions={[90, 105, 110, 120]}
                  disabled={gameActive}
                  sizeClass={sizeClass}
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
                  sizeClass={sizeClass}
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
                  sizeClass={sizeClass}
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
                  sizeClass={sizeClass}
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
                  sizeClass={sizeClass}
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
                    sizeClass={sizeClass}
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
                      if (!enabled) {
                        setPointTimerEnabled(false);
                        setLineCallingEnabled(false);
                      }
                    }}
                    disabled={gameActive}
                    locked={gameActive}
                    sizeClass={sizeClass}
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
                      sizeClass={sizeClass}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Switch
                      label="Point Timer"
                      value={pointTimerEnabled}
                      onValueChange={setPointTimerEnabled}
                      disabled={gameActive}
                      locked={gameActive}
                      sizeClass={sizeClass}
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
                  sizeClass={sizeClass}
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
                    sizeClass={sizeClass}
                  />
                </View>
              )}
              {statTrackingEnabled && lineCallingEnabled && (
                <View style={styles.inputGroupFullWidth}>
                  <SegmentedControl
                    label="SORT PLAYERS"
                    options={[
                      { value: 'alpha', label: 'Alphabetically' },
                      { value: 'points', label: 'Points Played' },
                    ]}
                    value={linePlayerSortOrder}
                    onChange={(val) => setLinePlayerSortOrder(val as 'alpha' | 'points')}
                    sizeClass={sizeClass}
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        {!isLandscape && renderAppearanceSettings()}

        {!isLandscape && renderColorSettings(useCompactColorLayout)}
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    scrollContent: {
      padding: scaleBySizeClass(24, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
    },
    columnsContainer: {
      flexDirection: isLandscape ? 'row' : 'column',
      gap: scaleBySizeClass(24, sizeClass),
      alignItems: isLandscape ? 'flex-start' : 'stretch',
    },
    column: {
      flex: isLandscape ? 1 : 0,
      width: isLandscape ? undefined : '100%',
      gap: scaleBySizeClass(12, sizeClass),
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '700',
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginBottom: scaleBySizeClass(4, sizeClass),
    },
    divider: {
      height: 1,
      marginVertical: scaleBySizeClass(12, sizeClass),
    },
    inputsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: scaleBySizeClass(12, sizeClass),
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
      gap: scaleBySizeClass(8, sizeClass),
    },
    teamNameInputWrapper: {
      flex: 1,
    },
    teamNameInput: {
      flex: 1,
    },
    editRosterButton: {
      height: scaleBySizeClass(48, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
    },
    editRosterButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '600',
    },
    importTeamButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(10, sizeClass),
      height: scaleBySizeClass(44, sizeClass),
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      borderWidth: 1,
    },
    importTeamButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '600',
    },
    inputLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '700',
      letterSpacing: scaleBySizeClass(1, sizeClass, { rounding: 'none' }),
      marginBottom: scaleBySizeClass(6, sizeClass),
    },
    inputStacked: {
      height: scaleBySizeClass(48, sizeClass),
      borderWidth: 1,
      borderRadius: scaleBySizeClass(10, sizeClass),
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      fontSize: scaleBySizeClass(18, sizeClass),
      fontWeight: '600',
      textAlign: 'center',
    },
    helperText: {
      fontSize: scaleBySizeClass(11, sizeClass),
    },
    buttonPressed: {
      opacity: 0.8,
    },
    newGameButton: {
      paddingVertical: scaleBySizeClass(6, sizeClass),
      paddingHorizontal: scaleBySizeClass(10, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    newGameButtonText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontWeight: '700',
      letterSpacing: scaleBySizeClass(0.4, sizeClass, { rounding: 'none' }),
    },
    activeGameBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      paddingVertical: scaleBySizeClass(10, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      borderWidth: 1,
      marginBottom: scaleBySizeClass(16, sizeClass),
    },
    activeGameBannerText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '600',
      flex: 1,
    },
    compactColorGrid: {
      flexDirection: isLandscape ? 'row' : 'column',
      gap: scaleBySizeClass(12, sizeClass),
    },
    compactColorItem: {
      flex: isLandscape ? 1 : undefined,
    },
    colorPickerSpacer: {
      height: scaleBySizeClass(12, sizeClass),
    },
    resetColorsButton: {
      alignSelf: 'flex-start',
      paddingVertical: scaleBySizeClass(4, sizeClass),
    },
    resetColorsButtonText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '600',
    },
    appearanceSection: {
      marginTop: scaleBySizeClass(20, sizeClass),
      gap: scaleBySizeClass(12, sizeClass),
    },
    switchWithHelp: {
      gap: scaleBySizeClass(8, sizeClass),
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    actionIconSize: scaleBySizeClass(18, sizeClass),
    bannerIconSize: scaleBySizeClass(18, sizeClass),
  };
}
