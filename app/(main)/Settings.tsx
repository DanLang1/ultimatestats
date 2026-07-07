import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import { TeamColorPicker } from '@/components/ui/ColorPicker';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/context/ThemeContext';
import { useKeyboardDidHide } from '@/hooks/useKeyboardDidHide';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MAX_TEAM_NAME_LENGTH } from '@/lib/constants';
import { SavedTeam } from '@/lib/storage';
import { useGameStore } from '@/store/basic/gameStore';
import { OrientationMode, useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

export default function SettingsScreen() {
  const { currentTeam } = useGameStore();
  const settingsKey = `${currentTeam.id}:${currentTeam.name}`;
  return <SettingsContent key={settingsKey} />;
}

function SettingsContent() {
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const metrics = createMetrics(sizeClass);
  const useCompactColorLayout = sizeClass !== 'small';
  const { palette, themeMode, setThemeMode } = useTheme();
  const { showAlert } = useAlert();
  const {
    mmpColor,
    fmpColor,
    setMmpColor,
    setFmpColor,
    resetMatchingTypeColors,
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
    setTeamBgColor,
    savedTeams,
    saveCurrentTeam,
  } = useGameStore();

  const team1Name = currentTeam.name;
  const team1Roster = currentTeam.roster;

  const [team1NameDraft, setTeam1NameDraft] = useState(team1Name);

  const isAndroidLargeScreen = Platform.OS === 'android' && sizeClass !== 'small';

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

  useKeyboardDidHide(saveAllDrafts);

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
      (t) => t.name.toLowerCase() === newName.toLowerCase() && t.id !== currentTeam.id,
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

      <ThemedText style={[styles.sectionTitle, textInverseStyle]}>TEAM COLORS</ThemedText>
      {compact ? (
        <View style={styles.compactColorGrid}>
          <View style={styles.compactColorItem}>
            <TeamColorPicker
              label="MY TEAM COLOR"
              value={team1BgColor}
              onChange={(color) => setTeamBgColor('team1', color)}
            />
          </View>
          <View style={styles.compactColorItem}>
            <TeamColorPicker
              label="OPPOSING TEAM COLOR"
              value={team2BgColor}
              onChange={(color) => setTeamBgColor('team2', color)}
            />
          </View>
        </View>
      ) : (
        <>
          <TeamColorPicker
            label="MY TEAM COLOR"
            value={team1BgColor}
            onChange={(color) => setTeamBgColor('team1', color)}
          />
          <View style={styles.colorPickerSpacer} />
          <TeamColorPicker
            label="OPPOSING TEAM COLOR"
            value={team2BgColor}
            onChange={(color) => setTeamBgColor('team2', color)}
          />
        </>
      )}
      <Pressable
        style={({ pressed }) => [styles.resetColorsButton, pressed && { opacity: 0.7 }]}
        onPress={() => {
          setTeamBgColor('team1', palette.surface);
          setTeamBgColor('team2', palette.primary);
        }}>
        <ThemedText style={[styles.resetColorsButtonText, textMutedStyle]}>
          Reset to Default
        </ThemedText>
      </Pressable>

      <View style={[styles.divider, dividerStyle]} />

      <ThemedText style={[styles.sectionTitle, textInverseStyle]}>PLAYER NAME COLORS</ThemedText>
      {compact ? (
        <View style={styles.compactColorGrid}>
          <View style={styles.compactColorItem}>
            <TeamColorPicker label="MMP (MALE MATCHING)" value={mmpColor} onChange={setMmpColor} />
          </View>
          <View style={styles.compactColorItem}>
            <TeamColorPicker
              label="FMP (FEMALE MATCHING)"
              value={fmpColor}
              onChange={setFmpColor}
            />
          </View>
        </View>
      ) : (
        <>
          <TeamColorPicker label="MMP (MALE MATCHING)" value={mmpColor} onChange={setMmpColor} />
          <View style={styles.colorPickerSpacer} />
          <TeamColorPicker label="FMP (FEMALE MATCHING)" value={fmpColor} onChange={setFmpColor} />
        </>
      )}
      <Pressable
        style={({ pressed }) => [styles.resetColorsButton, pressed && { opacity: 0.7 }]}
        onPress={resetMatchingTypeColors}>
        <ThemedText style={[styles.resetColorsButtonText, textMutedStyle]}>
          Reset to Default
        </ThemedText>
      </Pressable>
    </>
  );

  const renderAppearanceSettings = () => (
    <View style={styles.appearanceSection}>
      <ThemedText style={[styles.sectionTitle, textInverseStyle]}>APP</ThemedText>
      <SegmentedControl
        label="THEME"
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={themeMode}
        onChange={setThemeMode}
      />
      <SegmentedControl
        label="ORIENTATION"
        options={[
          { value: 'system', label: 'System' },
          { value: 'portrait', label: 'Portrait' },
          { value: 'landscape', label: 'Landscape' },
        ]}
        value={orientationMode}
        onChange={handleOrientationModeChange}
      />
      {isAndroidLargeScreen && (
        <ThemedText style={[styles.helperText, textMutedStyle]}>
          On large Android devices, orientation locks may be ignored (blame Android not me please).
        </ThemedText>
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
      />

      <ScrollView contentContainerStyle={[styles.scrollContent]}>
        <View key={isLandscape ? 'landscape' : 'portrait'} style={styles.columnsContainer}>
          <View style={styles.column}>
            <ThemedText style={[styles.sectionTitle, textInverseStyle]}>TEAMS</ThemedText>
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
              <ThemedText style={[styles.importTeamButtonText, { color: palette.accent }]}>
                Import from USA Ultimate
              </ThemedText>
            </Pressable>
            <View style={styles.inputGroupFullWidth}>
              <ThemedText style={[styles.inputLabel, textMutedStyle]}>My Team</ThemedText>
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
                  <ThemedText style={[styles.editRosterButtonText, { color: palette.accent }]}>
                    {team1Roster.length > 0 ? team1Roster.length : 'Roster'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
            <View style={styles.inputGroupFullWidth}>
              <ThemedText style={[styles.inputLabel, textMutedStyle]}>Opposing Team</ThemedText>
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
            <ThemedText style={[styles.sectionTitle, textInverseStyle]}>
              STAT PREFERENCES
            </ThemedText>

            <View style={styles.preferencesStack}>
              <SegmentedControl
                label="STAT ENTRY (BASIC)"
                options={[
                  { value: 'goal_first', label: 'Goal First' },
                  { value: 'assist_first', label: 'Assist First' },
                ]}
                value={statEntryOrder}
                onChange={setStatEntryOrder}
              />
              <SegmentedControl
                label="SORT PLAYERS"
                options={[
                  { value: 'alpha', label: 'A-Z' },
                  { value: 'number', label: '#s' },
                  { value: 'points', label: 'Points Played' },
                ]}
                value={linePlayerSortOrder}
                onChange={setLinePlayerSortOrder}
              />
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
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginBottom: scaleBySizeClass(4, sizeClass),
    },
    divider: {
      height: 1,
      marginVertical: scaleBySizeClass(12, sizeClass),
    },
    preferencesStack: {
      gap: scaleBySizeClass(12, sizeClass),
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
      fontFamily: Fonts.semiBold,
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
      fontFamily: Fonts.semiBold,
    },
    inputLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(1, sizeClass, { rounding: 'none' }),
      marginBottom: scaleBySizeClass(6, sizeClass),
    },
    inputStacked: {
      height: scaleBySizeClass(48, sizeClass),
      borderWidth: 1,
      borderRadius: scaleBySizeClass(10, sizeClass),
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.semiBold,
      textAlign: 'center',
    },
    helperText: {
      fontSize: scaleBySizeClass(11, sizeClass),
    },
    buttonPressed: {
      opacity: 0.8,
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
      fontFamily: Fonts.semiBold,
    },
    appearanceSection: {
      marginTop: scaleBySizeClass(20, sizeClass),
      gap: scaleBySizeClass(12, sizeClass),
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    actionIconSize: scaleBySizeClass(18, sizeClass),
  };
}
