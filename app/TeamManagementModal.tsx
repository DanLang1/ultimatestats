import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function TeamManagementModal() {
  const { palette } = useTheme();
  const { showAlert } = useAlert();
  const { currentTeam, savedTeams, loadTeam, deleteTeam, saveCurrentTeam } = useGameStore();

  const hasRoster = (currentTeam?.roster?.length ?? 0) > 0;
  const otherTeams = savedTeams.filter((t) => t.id !== currentTeam?.id);

  const handleDismiss = () => {
    router.dismissTo('/EditRoster');
  };

  const handleLoadTeam = async (teamId: string) => {
    if (hasRoster && currentTeam) {
      await saveCurrentTeam();
    }
    loadTeam(teamId);
    handleDismiss();
  };

  const handleDeleteTeam = (teamId: string, teamName: string) => {
    showAlert({
      title: 'Delete Team',
      message: `Are you sure you want to delete "${teamName}"? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTeam(teamId),
        },
      ],
    });
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <View
          style={[styles.sheet, { backgroundColor: palette.surface }]}
          onStartShouldSetResponder={() => true}>
          <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />
          <View style={styles.headerRow}>
            <View style={styles.headerSpacer} />
            <Text style={[styles.title, { color: palette.textPrimary }]}>Switch Team</Text>
            <Pressable onPress={handleDismiss} hitSlop={12} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={palette.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.options}>
              {otherTeams.map((team) => (
                <Pressable
                  key={team.id}
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: palette.overlay05 },
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => handleLoadTeam(team.id)}>
                  <MaterialCommunityIcons
                    name="account-group-outline"
                    size={22}
                    color={palette.textMuted}
                  />
                  <Text style={[styles.optionText, { color: palette.textPrimary }]}>
                    {team.name}
                  </Text>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTeam(team.id, team.name)}
                    hitSlop={8}>
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={18}
                      color={palette.danger}
                    />
                  </Pressable>
                </Pressable>
              ))}

              {otherTeams.length === 0 && (
                <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                  No other teams saved yet
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerSpacer: {
    width: 24,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flexGrow: 0,
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 12,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 20,
  },
});
