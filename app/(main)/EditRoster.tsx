import { EditRosterSidebar } from '@/components/EditRosterSidebar';
import { EditRosterToolbar } from '@/components/EditRosterToolbar';
import { AlertModal } from '@/components/ui/AlertModal';
import { useAlert } from '@/components/ui/AlertProvider';
import { PlayerChip } from '@/components/ui/PlayerChip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ShareConfirmModal } from '@/components/ui/ShareConfirmModal';
import { useTheme } from '@/context/ThemeContext';
import { useIsGameActive } from '@/hooks/useIsGameActive';
import { useLayout } from '@/hooks/useLayout';
import { MAX_TEAM_NAME_LENGTH } from '@/lib/constants';
import { hasPlayerWithName } from '@/lib/playerUtils';
import { serializeTeam, uploadPayload } from '@/lib/sharing';
import { SavedTeam } from '@/lib/storage';
import { Player } from '@/lib/storage/types';
import { generateId } from '@/lib/utils';
import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

export default function EditRosterScreen() {
  const { isLandscape } = useLayout();
  const styles = createStyles(isLandscape);

  const { teamName } = useLocalSearchParams<{ teamName: string }>();

  const {
    currentTeam,
    setCurrentTeam,
    addPlayer,
    saveCurrentTeam,
    clearRoster,
    savedTeams,
    loadSavedTeams,
  } = useGameStore();
  const { showAlert } = useAlert();
  const { palette } = useTheme();
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore();

  // Derived values
  const roster = currentTeam?.roster ?? [];
  const gameActive = useIsGameActive();

  // Load saved teams on mount
  useEffect(() => {
    loadSavedTeams();
  }, [loadSavedTeams]);

  const [showShareConfirm, setShowShareConfirm] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [newTeamModalVisible, setNewTeamModalVisible] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  const isDuplicateName =
    newPlayerName.trim() !== '' && hasPlayerWithName(roster, newPlayerName.trim());

  const hasOtherTeams = savedTeams.filter((t) => t.id !== currentTeam?.id).length > 0;
  const hasRoster = roster.length > 0;

  // Derived: check if edited team name already exists
  const teamNameExists =
    editTeamName.trim() !== '' &&
    savedTeams.some(
      (t: SavedTeam) =>
        t.name.toLowerCase() === editTeamName.trim().toLowerCase() && t.id !== currentTeam?.id,
    );

  // Derived: check if new team name already exists
  const newTeamNameExists =
    newTeamName.trim() !== '' &&
    savedTeams.some((t: SavedTeam) => t.name.toLowerCase() === newTeamName.trim().toLowerCase());

  const handleRenameTeam = async () => {
    const newName = editTeamName.trim();
    if (!newName || !currentTeam || teamNameExists) {
      if (!newName) setRenameModalVisible(false);
      return;
    }

    const updatedTeam: SavedTeam = { ...currentTeam, name: newName };
    setCurrentTeam(updatedTeam);
    await saveCurrentTeam();
    setRenameModalVisible(false);
  };

  const handleNewTeam = () => {
    setNewTeamName('');
    setNewTeamModalVisible(true);
  };

  const handleConfirmNewTeam = async () => {
    const trimmedName = newTeamName.trim();
    if (!trimmedName || newTeamNameExists) return;

    // Save current team first if it has a roster
    if (hasRoster && currentTeam) {
      await saveCurrentTeam();
    }

    const newTeam: SavedTeam = {
      id: generateId(),
      name: trimmedName,
      roster: [],
    };
    setCurrentTeam(newTeam);
    setNewTeamModalVisible(false);
    await saveCurrentTeam();
  };

  const handleShareTeam = () => {
    if (!currentTeam) return;
    setShowShareConfirm(true);
  };

  const handleAddPlayer = async () => {
    const trimmed = newPlayerName.trim();
    if (trimmed && !hasPlayerWithName(roster, trimmed)) {
      addPlayer(trimmed);
      setNewPlayerName('');
      // Auto-save team
      await saveCurrentTeam();
    }
  };

  const handleEditPlayer = (player: Player) => {
    router.push({ pathname: '/EditPlayerModal', params: { playerId: player.id } });
  };

  const handleBack = () => {
    router.back();
  };

  const handleClearAll = () => {
    showAlert({
      title: 'Clear Roster',
      message: gameActive
        ? 'There is a game in progress. Clearing the roster will affect stat tracking and may cause issues with the current game. Are you sure?'
        : 'Remove all players from the roster?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearRoster();
            // Clear the saved version too
            if (currentTeam) {
              setCurrentTeam({ ...currentTeam, roster: [] });
            }
          },
        },
      ],
    });
  };

  // Sort roster: active players first, then inactive, alphabetically within each group
  const sortedRoster = [...roster].sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <View style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.mainLayout}>
        {/* Sidebar - landscape only */}
        {isLandscape && (
          <EditRosterSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            onRenameTeam={() => {
              setEditTeamName(currentTeam?.name ?? '');
              setRenameModalVisible(true);
            }}
            onNewTeam={handleNewTeam}
            onSwitchTeam={() => router.push('/TeamManagementModal')}
            onEditPresets={() => router.push('/LinePresetEditor')}
            onShareTeam={handleShareTeam}
            onClearRoster={handleClearAll}
            showNewTeam={!gameActive}
            showSwitchTeam={!gameActive && hasOtherTeams}
            showEditPresets={roster.length > 0}
            showShareTeam={roster.length > 0}
            showClearRoster={roster.length > 0}
          />
        )}

        {/* Main Content */}
        <View style={styles.mainContent}>
          <ScreenHeader
            title={(currentTeam?.name ?? teamName ?? 'TEAM').toUpperCase()}
            onBack={handleBack}
            titleColor={palette.textMuted}
            backButtonBackgroundColor={palette.overlay10}
          />

          {/* Toolbar - portrait only */}
          {!isLandscape && (
            <EditRosterToolbar
              onRenameTeam={() => {
                setEditTeamName(currentTeam?.name ?? '');
                setRenameModalVisible(true);
              }}
              onNewTeam={handleNewTeam}
              onSwitchTeam={() => router.push('/TeamManagementModal')}
              onEditPresets={() => router.push('/LinePresetEditor')}
              onShareTeam={handleShareTeam}
              onClearRoster={handleClearAll}
              showNewTeam={!gameActive}
              showSwitchTeam={!gameActive && hasOtherTeams}
              showEditPresets={roster.length > 0}
              showShareTeam={roster.length > 0}
              showClearRoster={roster.length > 0}
            />
          )}

          {/* Add Player Input */}
          <View style={[styles.addPlayerSection, { borderBottomColor: palette.overlay10 }]}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.addPlayerInput,
                  {
                    borderColor: palette.overlay20,
                    color: palette.textInverse,
                    backgroundColor: palette.overlay08,
                  },
                  isDuplicateName && { borderColor: palette.danger },
                ]}
                placeholder="Add player..."
                placeholderTextColor={palette.textMuted}
                value={newPlayerName}
                onChangeText={setNewPlayerName}
                onSubmitEditing={handleAddPlayer}
                returnKeyType="done"
                autoCapitalize="words"
                maxLength={20}
              />
              {isDuplicateName && (
                <Text
                  style={[
                    styles.errorText,
                    { color: palette.danger },
                  ]}>{`${newPlayerName} is already on your team`}</Text>
              )}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: palette.accent },
                pressed && styles.buttonPressed,
              ]}
              onPress={handleAddPlayer}>
              <MaterialCommunityIcons name="plus" size={24} color={palette.textOnAccent} />
            </Pressable>
          </View>

          {/* Player List - 2 Column Grid */}
          <ScrollView style={styles.playerList} contentContainerStyle={[styles.playerListContent]}>
            {roster.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={48}
                  color={palette.textMuted}
                />
                <Text style={[styles.emptyStateText, { color: palette.textMuted }]}>
                  No players yet
                </Text>
                <Text style={[styles.emptyStateHint, { color: palette.textMuted }]}>
                  Add players using the input above
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.listHeader}>
                  <Text style={[styles.listHint, { color: palette.textMuted }]}>Tap to edit</Text>
                </View>
                <View style={styles.playerGrid}>
                  {sortedRoster.map((player) => (
                    <PlayerChip
                      key={player.id}
                      name={player.name}
                      isActive={player.isActive}
                      matchingType={player.matchingType}
                      role={player.role}
                      onPress={() => handleEditPlayer(player)}
                    />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Rename Team Modal */}
      <AlertModal
        visible={renameModalVisible}
        title="Rename Team"
        onClose={() => setRenameModalVisible(false)}>
        <TextInput
          style={[
            styles.alertInput,
            {
              borderColor: teamNameExists ? palette.danger : palette.overlay20,
              color: palette.textInverse,
              backgroundColor: palette.overlay05,
            },
          ]}
          value={editTeamName}
          onChangeText={setEditTeamName}
          placeholder="Team name"
          placeholderTextColor={palette.textMuted}
          autoFocus
          maxLength={MAX_TEAM_NAME_LENGTH}
        />
        {teamNameExists && (
          <Text style={[styles.errorText, { color: palette.danger }]}>
            A team with this name already exists
          </Text>
        )}
        <View style={styles.alertButtonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.alertButton,
              styles.alertCancelButton,
              { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => setRenameModalVisible(false)}>
            <Text style={[styles.alertButtonText, { color: palette.textInverse }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.alertButton,
              { backgroundColor: teamNameExists ? palette.overlay20 : palette.accent },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleRenameTeam}
            disabled={teamNameExists}>
            <Text
              style={[
                styles.alertButtonText,
                { color: teamNameExists ? palette.textMuted : palette.textOnAccent },
              ]}>
              Save
            </Text>
          </Pressable>
        </View>
      </AlertModal>

      {/* New Team Modal */}
      <AlertModal
        visible={newTeamModalVisible}
        title="New Team"
        onClose={() => setNewTeamModalVisible(false)}>
        <TextInput
          style={[
            styles.alertInput,
            {
              borderColor: newTeamNameExists ? palette.danger : palette.overlay20,
              color: palette.textInverse,
              backgroundColor: palette.overlay05,
            },
          ]}
          value={newTeamName}
          onChangeText={setNewTeamName}
          placeholder="Team name"
          placeholderTextColor={palette.textMuted}
          autoFocus
          maxLength={MAX_TEAM_NAME_LENGTH}
        />
        {newTeamNameExists && (
          <Text style={[styles.errorText, { color: palette.danger }]}>
            A team with this name already exists
          </Text>
        )}
        <View style={styles.alertButtonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.alertButton,
              styles.alertCancelButton,
              { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => setNewTeamModalVisible(false)}>
            <Text style={[styles.alertButtonText, { color: palette.textInverse }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.alertButton,
              {
                backgroundColor:
                  newTeamNameExists || !newTeamName.trim() ? palette.overlay20 : palette.accent,
              },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleConfirmNewTeam}
            disabled={newTeamNameExists || !newTeamName.trim()}>
            <Text
              style={[
                styles.alertButtonText,
                {
                  color:
                    newTeamNameExists || !newTeamName.trim()
                      ? palette.textMuted
                      : palette.textOnAccent,
                },
              ]}>
              Create
            </Text>
          </Pressable>
        </View>
      </AlertModal>

      <ShareConfirmModal
        visible={showShareConfirm}
        onConfirm={async () => {
          try {
            const payload = serializeTeam(currentTeam!, useLinePresetsStore.getState().presets);
            const { url } = await uploadPayload(payload);
            setShowShareConfirm(false);
            await Share.share({ message: url });
          } catch {
            showAlert({
              title: 'Share failed',
              message: 'Could not upload team for sharing. Please try again.',
            });
            throw new Error('share failed');
          }
        }}
        onCancel={() => setShowShareConfirm(false)}
      />
    </View>
  );
}

function createStyles(isLandscape: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    mainLayout: {
      flex: 1,
      flexDirection: isLandscape ? 'row' : 'column',
    },
    mainContent: {
      flex: 1,
    },
    clearButton: {
      padding: 8,
      borderRadius: 20,
    },
    addPlayerSection: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 12,
      borderBottomWidth: 1,
    },
    inputWrapper: {
      flex: 1,
    },
    addPlayerInput: {
      height: 48,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
    },
    errorText: {
      fontSize: 12,
      marginLeft: 4,
      marginTop: 4,
    },
    addButton: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    playerList: {
      flex: 1,
    },
    playerListContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 8,
    },

    listHeader: {
      marginBottom: 4,
      alignItems: 'flex-end',
    },
    listHint: {
      fontSize: 11,
      fontStyle: 'italic',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 30,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 16,
    },
    emptyStateHint: {
      fontSize: 14,
      marginTop: 4,
    },
    playerGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    // Alert modal content styles
    alertInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      marginBottom: 8,
    },
    alertButtonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    alertButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertCancelButton: {
      borderWidth: 1,
    },
    alertButtonText: {
      fontSize: 15,
      fontWeight: '600',
    },
    // Line Presets Section
    presetsSection: {
      marginTop: 24,
      gap: 16,
    },
    sectionDivider: {
      height: 1,
    },
    presetsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    presetsButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    presetsButtonText: {
      gap: 2,
    },
    presetsButtonTitle: {
      fontSize: 15,
      fontWeight: '600',
    },
    presetsButtonSubtitle: {
      fontSize: 12,
    },
  });
}
