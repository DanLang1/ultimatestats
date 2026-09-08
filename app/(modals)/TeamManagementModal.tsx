import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { BottomSheetActionRow } from '@/components/ui/BottomSheetActionRow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { SavedTeam } from '@/lib/storage';
import { useGameStore } from '@/store/basic/gameStore';
import { Fonts } from '@/theme/theme';

export default function TeamManagementModal() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const [teamToDelete, setTeamToDelete] = useState<SavedTeam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { currentTeam, savedTeams, loadTeam, deleteTeam, saveCurrentTeam } = useGameStore();

  const hasRoster = currentTeam.roster.length > 0;
  const otherTeams = savedTeams.filter((t) => t.id !== currentTeam.id);

  const handleDismiss = () => {
    router.dismissTo('/EditRoster');
  };

  const handleLoadTeam = async (teamId: string) => {
    if (hasRoster) {
      await saveCurrentTeam();
    }
    loadTeam(teamId);
    handleDismiss();
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setTeamToDelete(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!teamToDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteTeam(teamToDelete.id);
      setTeamToDelete(null);
    } catch {
      setDeleteError('Could not delete the team. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (teamToDelete) {
    return (
      <BottomSheet
        onDismiss={handleCancelDelete}
        sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}
        minBottomPadding={20}>
        <ScrollView>
          <ThemedText style={[styles.title, { color: palette.modalText }]}>Delete Team</ThemedText>
          <ThemedText style={[styles.emptyText, { color: palette.modalText }]}>
            Are you sure you want to delete "{teamToDelete.name}"? This cannot be undone.
          </ThemedText>
          {deleteError && (
            <ThemedText accessibilityRole="alert" style={{ color: palette.danger }}>
              {deleteError}
            </ThemedText>
          )}
          <BottomSheetActionRow
            testID="team-delete-cancel"
            icon="close"
            label="Cancel"
            disabled={isDeleting}
            onPress={handleCancelDelete}
          />
          <BottomSheetActionRow
            testID="team-delete-confirm"
            icon="trash-can-outline"
            label={isDeleting ? 'Deleting…' : 'Delete'}
            tone="danger"
            disabled={isDeleting}
            onPress={handleConfirmDelete}
          />
        </ScrollView>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      onDismiss={handleDismiss}
      sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}
      minBottomPadding={20}>
      <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />
      <View style={styles.headerRow}>
        <View style={styles.headerSpacer} />
        <ThemedText style={[styles.title, { color: palette.modalText }]}>Switch Team</ThemedText>
        <Pressable onPress={handleDismiss} hitSlop={12} style={styles.closeButton}>
          <MaterialCommunityIcons
            name="close"
            size={scaleBySizeClass(24, sizeClass)}
            color={palette.textMuted}
          />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.options}>
          {otherTeams.map((team) => (
            <View key={team.id} style={[styles.option, { backgroundColor: palette.overlay05 }]}>
              <Pressable
                style={({ pressed }) => [styles.optionMain, pressed && styles.optionPressed]}
                onPress={() => handleLoadTeam(team.id)}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={scaleBySizeClass(22, sizeClass)}
                  color={palette.textMuted}
                />
                <ThemedText style={[styles.optionText, { color: palette.modalText }]}>
                  {team.name}
                </ThemedText>
              </Pressable>
              <Pressable
                testID={`team-delete-${team.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${team.name}`}
                style={styles.deleteButton}
                onPress={() => setTeamToDelete(team)}
                hitSlop={8}>
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={scaleBySizeClass(18, sizeClass)}
                  color={palette.danger}
                />
              </Pressable>
            </View>
          ))}

          {otherTeams.length === 0 && (
            <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
              No other teams saved yet
            </ThemedText>
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      padding: 20,
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
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
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
      padding: 16,
      borderRadius: 12,
    },
    optionMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    optionPressed: {
      opacity: 0.7,
    },
    optionText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
      flex: 1,
    },
    deleteButton: {
      padding: 4,
    },
    emptyText: {
      textAlign: 'center',
      fontSize: scaleBySizeClass(14, sizeClass),
      paddingVertical: 20,
    },
  });
}
