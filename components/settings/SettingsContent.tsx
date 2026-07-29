import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useKeyboardDidHide } from '@/hooks/useKeyboardDidHide';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { SavedTeam } from '@/lib/storage';
import { useGameStore } from '@/store/basic/gameStore';

import { AppearanceSettingsSection } from './AppearanceSettingsSection';
import { ColorSettingsSection } from './ColorSettingsSection';
import { StatPreferencesSection } from './StatPreferencesSection';
import { TeamSettingsSection } from './TeamSettingsSection';

export function SettingsContent() {
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { palette } = useTheme();
  const { showAlert } = useAlert();
  const { currentTeam, setCurrentTeam, team2Name, setTeam2Name, savedTeams, saveCurrentTeam } =
    useGameStore();
  const team1Name = currentTeam.name;
  const [team1NameDraft, setTeam1NameDraft] = useState(team1Name);

  const persistTeamNameDraft = async () => {
    const newTeam1Name = team1NameDraft.trim();
    if (newTeam1Name && currentTeam) {
      const existingTeam = savedTeams.find(
        (team) =>
          team.name.toLowerCase() === newTeam1Name.toLowerCase() && team.id !== currentTeam.id,
      );
      if (!existingTeam && newTeam1Name !== team1Name) {
        const updatedTeam: SavedTeam = { ...currentTeam, name: newTeam1Name };
        setCurrentTeam(updatedTeam);
        await saveCurrentTeam(updatedTeam);
      }
    }
  };

  useKeyboardDidHide(() => {
    void persistTeamNameDraft();
  });

  const handleTeam1NameBlur = async () => {
    const newName = team1NameDraft.trim();
    if (!newName) {
      setTeam1NameDraft(team1Name);
      return;
    }

    const existingTeam = savedTeams.find(
      (team) => team.name.toLowerCase() === newName.toLowerCase() && team.id !== currentTeam.id,
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

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="SETTINGS"
        onBack={() => router.back()}
        backHitSlop={24}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        titleOverlayPaddingPortrait={96}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View key={isLandscape ? 'landscape' : 'portrait'} style={styles.columnsContainer}>
          <View style={styles.column}>
            <TeamSettingsSection
              team1NameDraft={team1NameDraft}
              team1RosterCount={currentTeam.roster.length}
              team2Name={team2Name}
              onTeam1NameChange={setTeam1NameDraft}
              onTeam1NameBlur={() => void handleTeam1NameBlur()}
              onTeam2NameChange={setTeam2Name}
              onImportTeam={() => router.push('/ImportTeam')}
              onEditRoster={() =>
                router.push({ pathname: '/EditRoster', params: { teamName: team1Name } })
              }
            />
            {isLandscape && <AppearanceSettingsSection />}
            {isLandscape && <ColorSettingsSection />}
          </View>
          <View style={styles.column}>
            <StatPreferencesSection />
          </View>
        </View>
        {!isLandscape && <AppearanceSettingsSection />}
        {!isLandscape && <ColorSettingsSection />}
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
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
  });
}
