import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MAX_TEAM_NAME_LENGTH } from '@/lib/constants';
import { Fonts } from '@/theme/theme';

interface TeamSettingsSectionProps {
  team1NameDraft: string;
  team1RosterCount: number;
  team2Name: string;
  onTeam1NameChange: (name: string) => void;
  onTeam1NameBlur: () => void;
  onTeam2NameChange: (name: string) => void;
  onImportTeam: () => void;
  onEditRoster: () => void;
}

export function TeamSettingsSection({
  team1NameDraft,
  team1RosterCount,
  team2Name,
  onTeam1NameChange,
  onTeam1NameBlur,
  onTeam2NameChange,
  onImportTeam,
  onEditRoster,
}: TeamSettingsSectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const actionIconSize = scaleBySizeClass(18, sizeClass);

  return (
    <>
      <ThemedText style={[styles.sectionTitle, { color: palette.textInverse }]}>TEAMS</ThemedText>
      <Pressable
        style={({ pressed }) => [
          styles.importTeamButton,
          { backgroundColor: palette.accentOverlay10, borderColor: palette.accentOverlay30 },
          pressed && styles.buttonPressed,
        ]}
        onPress={onImportTeam}>
        <MaterialCommunityIcons
          name="cloud-download-outline"
          size={actionIconSize}
          color={palette.accent}
        />
        <ThemedText style={[styles.importTeamButtonText, { color: palette.accent }]}>
          Import from USA Ultimate
        </ThemedText>
      </Pressable>
      <View style={styles.inputGroupFullWidth}>
        <ThemedText style={[styles.inputLabel, { color: palette.textMuted }]}>My Team</ThemedText>
        <View style={styles.teamInputRow}>
          <View style={styles.teamNameInputWrapper}>
            <TextInput
              style={[
                styles.inputStacked,
                styles.teamNameInput,
                { textAlign: 'left' },
                { borderColor: palette.overlay20 },
                { color: palette.textInverse },
                { backgroundColor: palette.overlay08 },
              ]}
              value={team1NameDraft}
              onChangeText={onTeam1NameChange}
              onBlur={onTeam1NameBlur}
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
            onPress={onEditRoster}>
            <MaterialCommunityIcons
              name="account-group"
              size={actionIconSize}
              color={palette.accent}
            />
            <ThemedText style={[styles.editRosterButtonText, { color: palette.accent }]}>
              {team1RosterCount > 0 ? team1RosterCount : 'Roster'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
      <View style={styles.inputGroupFullWidth}>
        <ThemedText style={[styles.inputLabel, { color: palette.textMuted }]}>
          Opposing Team
        </ThemedText>
        <TextInput
          style={[
            styles.inputStacked,
            { textAlign: 'left' },
            { borderColor: palette.overlay20 },
            { color: palette.textInverse },
            { backgroundColor: palette.overlay08 },
          ]}
          value={team2Name}
          onChangeText={onTeam2NameChange}
          placeholder="Team 2 Name"
          placeholderTextColor={palette.textMuted}
          maxLength={MAX_TEAM_NAME_LENGTH}
        />
      </View>
    </>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginBottom: scaleBySizeClass(4, sizeClass),
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
    buttonPressed: {
      opacity: 0.8,
    },
  });
}
