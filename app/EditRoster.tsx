import { AlertModal } from '@/components/ui/AlertModal';
import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import { hasPlayerWithName } from '@/lib/playerUtils';
import { SavedTeam } from '@/lib/storage';
import { MatchingType, Player } from '@/lib/storage/types';
import { generateId } from '@/lib/utils';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

export default function EditRosterScreen() {
  const { teamName } = useLocalSearchParams<{ teamName: string }>();

  const {
    currentTeam,
    setCurrentTeam,
    addPlayer,
    saveCurrentTeam,
    clearRoster,
    timerIsActive,
    team1Score,
    team2Score,
    events,
    savedGames,
    savedTeams,
    loadSavedTeams,
  } = useGameStore();
  const { showAlert } = useAlert();
  const { palette } = useTheme();

  // Derived values
  const roster = currentTeam?.roster ?? [];
  const gameActive = timerIsActive || team1Score > 0 || team2Score > 0 || events.length > 0;

  // Load saved teams on mount
  useEffect(() => {
    loadSavedTeams();
  }, [loadSavedTeams]);

  const [newPlayerName, setNewPlayerName] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerActive, setEditPlayerActive] = useState(true);
  const [editPlayerMatchingType, setEditPlayerMatchingType] = useState<MatchingType | null>(null);
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

  // Derived: check if edited player name already exists (excluding current player)
  const editPlayerNameExists =
    editPlayerName.trim() !== '' &&
    roster.some(
      (p) =>
        p.name.toLowerCase() === editPlayerName.trim().toLowerCase() && p.id !== editingPlayer?.id,
    );

  const handleRenameTeam = () => {
    const newName = editTeamName.trim();
    if (!newName || !currentTeam || teamNameExists) {
      if (!newName) setRenameModalVisible(false);
      return;
    }

    const updatedTeam: SavedTeam = { ...currentTeam, name: newName };
    setCurrentTeam(updatedTeam);
    saveCurrentTeam();
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

  const handleAddPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (trimmed && !hasPlayerWithName(roster, trimmed)) {
      addPlayer(trimmed);
      setNewPlayerName('');
      // Auto-save team
      saveCurrentTeam();
    }
  };

  const handleRemovePlayer = (playerId: string) => {
    if (!currentTeam) return;

    // Check if player has any stats in the current game
    const hasCurrentGameStats = events.some((e) => {
      if (e.type === 'goal') {
        return e.goalPlayerId === playerId || e.assistPlayerId === playerId;
      }
      if (e.type === 'turnover') {
        return e.playerId === playerId || e.player2Id === playerId;
      }
      return false;
    });

    if (hasCurrentGameStats) {
      showAlert({
        title: 'Cannot Delete Player',
        message: "Sorry, you can't delete players with stats in an active game",
      });
      return;
    }

    // Check if player has stats in any saved games
    const hasStatsInSavedGames = savedGames.some((game) =>
      game.events.some((e) => {
        if (e.type === 'goal') {
          return e.goalPlayerId === playerId || e.assistPlayerId === playerId;
        }
        if (e.type === 'turnover') {
          return e.playerId === playerId || e.player2Id === playerId;
        }
        return false;
      }),
    );

    const doDelete = () => {
      const newRoster = roster.filter((p) => p.id !== playerId);
      setCurrentTeam({ ...currentTeam, roster: newRoster });
      saveCurrentTeam();
    };

    if (hasStatsInSavedGames) {
      showAlert({
        title: 'Delete Player?',
        message:
          'This player has stats saved in previous games. Are you sure you want to delete them?',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Anyway',
            style: 'destructive',
            onPress: doDelete,
          },
        ],
      });
      return;
    }

    doDelete();
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setEditPlayerName(player.name);
    setEditPlayerActive(player.isActive);
    setEditPlayerMatchingType(player.matchingType ?? null);
    setEditModalVisible(true);
  };

  const handleConfirmEdit = () => {
    if (!editingPlayer || !currentTeam) {
      setEditModalVisible(false);
      return;
    }

    const newName = editPlayerName.trim();
    // Check if name is valid (not empty and not duplicate unless same player)
    const isDuplicate = roster.some(
      (p) => p.name.toLowerCase() === newName.toLowerCase() && p.id !== editingPlayer.id,
    );

    if (newName && !isDuplicate) {
      const updatedRoster = roster.map((p) =>
        p.id === editingPlayer.id
          ? {
              ...p,
              name: newName,
              isActive: editPlayerActive,
              matchingType: editPlayerMatchingType,
            }
          : p,
      );
      setCurrentTeam({ ...currentTeam, roster: updatedRoster });
      // Auto-save team
      saveCurrentTeam();
    }
    setEditModalVisible(false);
  };

  const handleBack = () => {
    router.back();
  };

  const handleClearAll = () => {
    const gameActive = timerIsActive || team1Score !== 0 || team2Score !== 0;
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

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
          hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>

        <Pressable
          style={styles.teamHeaderRow}
          onPress={() => {
            setEditTeamName(currentTeam?.name ?? '');
            setRenameModalVisible(true);
          }}>
          <Text style={[styles.headerTitle, { color: palette.textMuted }]}>
            {(currentTeam?.name ?? teamName ?? 'TEAM').toUpperCase()}
          </Text>
          <MaterialCommunityIcons name="pencil-outline" size={17} color={palette.textMuted} />
        </Pressable>

        <View style={styles.headerActions}>
          {!gameActive && hasOtherTeams && (
            <Pressable
              onPress={() => router.push('/TeamManagementModal')}
              style={[styles.headerActionButton, { backgroundColor: palette.overlay10 }]}
              hitSlop={8}>
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={20}
                color={palette.textInverse}
              />
            </Pressable>
          )}
          {!gameActive && (
            <Pressable
              onPress={handleNewTeam}
              style={[styles.headerActionButton, { backgroundColor: palette.overlay10 }]}
              hitSlop={8}>
              <MaterialCommunityIcons name="plus" size={20} color={palette.textInverse} />
            </Pressable>
          )}
          {roster.length > 0 && (
            <Pressable
              onPress={handleClearAll}
              style={[styles.clearButton, { backgroundColor: palette.dangerOverlay15 }]}
              hitSlop={8}>
              <MaterialCommunityIcons
                name="delete-sweep-outline"
                size={20}
                color={palette.danger}
              />
            </Pressable>
          )}
        </View>
      </View>

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

      <ScrollView style={styles.playerList} contentContainerStyle={styles.playerListContent}>
        {roster.length > 0 && (
          <View style={styles.listHeader}>
            <Text style={[styles.listHint, { color: palette.textMuted }]}>Tap player to edit</Text>
          </View>
        )}
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
          <View style={styles.playerGrid}>
            {sortedRoster.map((player) => (
              <View
                key={player.id}
                style={[
                  styles.chip,
                  { backgroundColor: palette.overlay12 },
                  !player.isActive && styles.chipInactive,
                ]}>
                <Pressable
                  onPress={() => handleEditPlayer(player)}
                  style={styles.chipTextPressable}>
                  <Text
                    style={[
                      styles.chipText,
                      { color: player.isActive ? palette.textInverse : palette.textMuted },
                    ]}
                    numberOfLines={1}>
                    {player.name}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.chipRemoveButton,
                    pressed && [{ backgroundColor: palette.overlay15 }],
                  ]}
                  onPress={() => handleRemovePlayer(player.id)}
                  hitSlop={4}>
                  <MaterialCommunityIcons
                    name="close"
                    size={14}
                    color={player.isActive ? palette.textMuted : palette.overlay20}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Player Modal */}
      <AlertModal
        visible={editModalVisible}
        title="Edit Player"
        onClose={() => setEditModalVisible(false)}>
        <TextInput
          style={[
            styles.alertInput,
            {
              borderColor: editPlayerNameExists ? palette.danger : palette.overlay20,
              color: palette.textInverse,
              backgroundColor: palette.overlay05,
            },
          ]}
          placeholder="Player name..."
          placeholderTextColor={palette.textMuted}
          value={editPlayerName}
          onChangeText={setEditPlayerName}
          autoFocus
          maxLength={20}
        />
        {editPlayerNameExists && (
          <Text style={[styles.errorText, { color: palette.danger }]}>
            A player with this name already exists
          </Text>
        )}

        {/* Active Toggle */}
        <View style={styles.activeToggleRow}>
          <Text style={[styles.activeToggleLabel, { color: palette.textInverse }]}>
            Active for games
          </Text>
          <Switch
            value={editPlayerActive}
            onValueChange={setEditPlayerActive}
            trackColor={{ false: palette.overlay20, true: palette.accent }}
            thumbColor={editPlayerActive ? palette.textOnAccent : palette.textMuted}
          />
        </View>
        <Text style={[styles.activeToggleHint, { color: palette.textMuted }]}>
          Inactive players won&apos;t appear during stat tracking
        </Text>

        {/* Matching Type Toggle */}
        <View style={[styles.activeToggleRow, { marginBottom: 24 }]}>
          <Text style={[styles.activeToggleLabel, { color: palette.textInverse }]}>
            Matching preference
          </Text>
          <View style={styles.matchingTypeRow}>
            <Pressable
              style={[
                styles.matchingTypePill,
                { borderColor: palette.overlay20 },
                editPlayerMatchingType === 'fmp' && {
                  backgroundColor: palette.accent,
                  borderColor: palette.accent,
                },
              ]}
              onPress={() => setEditPlayerMatchingType('fmp')}>
              <Text
                style={[
                  styles.matchingTypePillText,
                  {
                    color:
                      editPlayerMatchingType === 'fmp' ? palette.textOnAccent : palette.textMuted,
                  },
                ]}>
                FMP
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.matchingTypePill,
                { borderColor: palette.overlay20 },
                editPlayerMatchingType === 'mmp' && {
                  backgroundColor: palette.accent,
                  borderColor: palette.accent,
                },
              ]}
              onPress={() => setEditPlayerMatchingType('mmp')}>
              <Text
                style={[
                  styles.matchingTypePillText,
                  {
                    color:
                      editPlayerMatchingType === 'mmp' ? palette.textOnAccent : palette.textMuted,
                  },
                ]}>
                MMP
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.alertButtonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.alertButton,
              styles.alertCancelButton,
              { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => setEditModalVisible(false)}>
            <Text style={[styles.alertButtonText, { color: palette.textInverse }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.alertButton,
              { backgroundColor: editPlayerNameExists ? palette.overlay20 : palette.accent },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleConfirmEdit}
            disabled={editPlayerNameExists}>
            <Text
              style={[
                styles.alertButtonText,
                { color: editPlayerNameExists ? palette.textMuted : palette.textOnAccent },
              ]}>
              Save
            </Text>
          </Pressable>
        </View>
      </AlertModal>

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
          maxLength={20}
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
          maxLength={20}
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
    </View>
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
  },
  headerSpacer: {
    width: 40,
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
    marginTop: -8,
    marginBottom: 4,
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
    padding: 20,
  },

  listHeader: {
    marginBottom: 8,
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
    paddingTop: 60,
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 20,
    gap: 6,
  },
  chipInactive: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  chipTextPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipRemoveButton: {
    padding: 4,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 4,
  },
  activeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activeToggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  activeToggleHint: {
    fontSize: 12,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveButton: {},
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
  },
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 20,
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
  matchingTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  matchingTypePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
  },
  matchingTypePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
