import { EditRosterSidebar } from '@/components/EditRosterSidebar';
import { EditRosterToolbar } from '@/components/EditRosterToolbar';
import { QuickEditPlayerList } from '@/components/roster/QuickEditPlayerList';
import RosterBulkActions from '@/components/roster/RosterBulkActions';
import { RosterControlsHeader } from '@/components/roster/RosterControlsHeader';
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
import { MatchingType, Player, PlayerRole } from '@/lib/storage/types';
import { generateId } from '@/lib/utils';
import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

const EMPTY_ROSTER: Player[] = [];
type RoleFilter = PlayerRole | 'unset' | null;

export default function EditRosterScreen() {
  const { isLandscape } = useLayout();
  const styles = createStyles(isLandscape);

  const { teamName } = useLocalSearchParams<{ teamName: string }>();

  const {
    currentTeam,
    setCurrentTeam,
    addPlayer,
    updateRosterPlayer,
    saveCurrentTeam,
    clearRoster,
    savedTeams,
    loadSavedTeams,
  } = useGameStore();
  const { showAlert } = useAlert();
  const { palette } = useTheme();
  const { sidebarCollapsed, setSidebarCollapsed, rosterViewMode, setRosterViewMode } =
    useSettingsStore();

  // Derived values
  const roster = currentTeam?.roster ?? EMPTY_ROSTER;
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
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(null);
  const [bulkVisiblePlayerIds, setBulkVisiblePlayerIds] = useState<Set<string> | null>(null);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

  const resetSelectionState = () => {
    setSelectionMode(false);
    setSelectedPlayerIds(new Set());
    setBulkVisiblePlayerIds(null);
  };

  const isDuplicateName =
    newPlayerName.trim() !== '' && hasPlayerWithName(roster, newPlayerName.trim());

  const hasOtherTeams = savedTeams.filter((t) => t.id !== currentTeam?.id).length > 0;
  const hasRoster = roster.length > 0;

  // Sorted roster: active first
  const displayRoster = [...roster].sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  const filteredRoster =
    roleFilter === null
      ? displayRoster
      : roleFilter === 'unset'
        ? displayRoster.filter((player) => player.role === null)
        : displayRoster.filter((player) => player.role === roleFilter);
  const visibleRoster =
    selectionMode && bulkVisiblePlayerIds
      ? displayRoster.filter((player) => bulkVisiblePlayerIds.has(player.id))
      : filteredRoster;

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

  // Selection mode handlers
  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedPlayerIds(new Set());
        setBulkVisiblePlayerIds(null);
      } else {
        setBulkVisiblePlayerIds(new Set(filteredRoster.map((player) => player.id)));
      }
      return !prev;
    });
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPlayerIds(new Set(visibleRoster.filter((p) => p.isActive).map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedPlayerIds(new Set());
  };

  const handleBulkSetMatching = async (type: MatchingType) => {
    for (const playerId of selectedPlayerIds) {
      updateRosterPlayer(playerId, { matchingType: type });
    }
    await saveCurrentTeam();
  };

  const handleBulkSetRole = async (role: PlayerRole) => {
    for (const playerId of selectedPlayerIds) {
      updateRosterPlayer(playerId, { role });
    }
    await saveCurrentTeam();
  };

  const handleRenameTeam = async () => {
    const newName = editTeamName.trim();
    if (!newName || !currentTeam || teamNameExists) {
      if (!newName) setRenameModalVisible(false);
      return;
    }

    const updatedTeam: SavedTeam = { ...currentTeam, name: newName };
    setCurrentTeam(updatedTeam);
    await saveCurrentTeam(updatedTeam);
    setRenameModalVisible(false);
  };

  const handleNewTeam = () => {
    resetSelectionState();
    setNewTeamName('');
    setNewTeamModalVisible(true);
  };

  const handleConfirmNewTeam = async () => {
    const trimmedName = newTeamName.trim();
    if (!trimmedName || newTeamNameExists) return;
    resetSelectionState();

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
    await saveCurrentTeam(newTeam);
  };

  const handleShareTeam = () => {
    if (!currentTeam) return;
    if (selectionMode) return;
    setShowShareConfirm(true);
  };

  const handleAddPlayer = async () => {
    const trimmed = newPlayerName.trim();
    if (trimmed && !hasPlayerWithName(roster, trimmed)) {
      addPlayer(trimmed);
      setNewPlayerName('');
      await saveCurrentTeam();
    }
  };

  const handleEditPlayer = (player: Player) => {
    router.push({ pathname: '/EditPlayerModal', params: { playerId: player.id } });
  };

  const handleSetPlayerActive = async (playerId: string, isActive: boolean) => {
    const didUpdate = updateRosterPlayer(playerId, { isActive });
    if (!didUpdate) return;
    await saveCurrentTeam();
  };

  const handleSetPlayerMatching = async (playerId: string, matchingType: MatchingType | null) => {
    const didUpdate = updateRosterPlayer(playerId, { matchingType });
    if (!didUpdate) return;
    await saveCurrentTeam();
  };

  const handleSetPlayerRole = async (playerId: string, role: Player['role']) => {
    const didUpdate = updateRosterPlayer(playerId, { role });
    if (!didUpdate) return;
    await saveCurrentTeam();
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
            resetSelectionState();
            clearRoster();
            if (currentTeam) {
              setCurrentTeam({ ...currentTeam, roster: [] });
            }
          },
        },
      ],
    });
  };

  const toggleViewMode = () => {
    setRosterViewMode(rosterViewMode === 'chips' ? 'cards' : 'chips');
  };

  const toggleRoleFilter = (role: Exclude<RoleFilter, null>) => {
    setRoleFilter((prev) => (prev === role ? null : role));
    setSelectedPlayerIds(new Set());
  };

  const useChipView = selectionMode || rosterViewMode === 'chips';

  // Group players by matching type for chip grid
  const groupedPlayers = useChipView
    ? (() => {
        const groups: { label: string; players: Player[] }[] = [];
        const fmp = visibleRoster.filter((p) => p.isActive && p.matchingType === 'fmp');
        const mmp = visibleRoster.filter((p) => p.isActive && p.matchingType === 'mmp');
        const unset = visibleRoster.filter((p) => p.isActive && p.matchingType === null);
        const inactive = visibleRoster.filter((p) => !p.isActive);
        if (fmp.length > 0) groups.push({ label: 'FMP', players: fmp });
        if (mmp.length > 0) groups.push({ label: 'MMP', players: mmp });
        if (unset.length > 0) groups.push({ label: 'Unset', players: unset });
        if (inactive.length > 0) groups.push({ label: 'Inactive', players: inactive });
        return groups;
      })()
    : [];

  const allActiveSelected =
    visibleRoster.filter((p) => p.isActive).length > 0 &&
    visibleRoster.filter((p) => p.isActive).every((p) => selectedPlayerIds.has(p.id));
  const hasActivePlayers = visibleRoster.some((player) => player.isActive);

  return (
    <View style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.mainLayout}>
        {/* Sidebar - landscape only, hidden during selection */}
        {isLandscape && !selectionMode && (
          <EditRosterSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            onRenameTeam={() => {
              if (selectionMode) return;
              setEditTeamName(currentTeam?.name ?? '');
              setRenameModalVisible(true);
            }}
            onNewTeam={handleNewTeam}
            onSwitchTeam={() => {
              if (selectionMode) return;
              resetSelectionState();
              router.push('/TeamManagementModal');
            }}
            onEditPresets={() => {
              if (selectionMode) return;
              resetSelectionState();
              router.push('/LinePresetEditor');
            }}
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

          {/* Toolbar - portrait only, hidden during selection */}
          {!isLandscape && !selectionMode && (
            <EditRosterToolbar
              onRenameTeam={() => {
                if (selectionMode) return;
                setEditTeamName(currentTeam?.name ?? '');
                setRenameModalVisible(true);
              }}
              onNewTeam={handleNewTeam}
              onSwitchTeam={() => {
                if (selectionMode) return;
                resetSelectionState();
                router.push('/TeamManagementModal');
              }}
              onEditPresets={() => {
                if (selectionMode) return;
                resetSelectionState();
                router.push('/LinePresetEditor');
              }}
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
          {!selectionMode && (
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
          )}

          {roster.length > 0 && (
            <RosterControlsHeader
              isSelecting={selectionMode}
              viewMode={rosterViewMode}
              activeRoleFilter={roleFilter}
              selectedCount={selectedPlayerIds.size}
              allActiveSelected={allActiveSelected}
              hasActivePlayers={hasActivePlayers}
              onToggleViewMode={toggleViewMode}
              onToggleSelectMode={toggleSelectionMode}
              onToggleSelectAll={allActiveSelected ? deselectAll : selectAll}
              onToggleRoleFilter={toggleRoleFilter}
            />
          )}

          {/* Player List */}
          <ScrollView
            style={styles.playerList}
            contentContainerStyle={[
              styles.playerListContent,
              selectionMode && styles.playerListContentSelection,
            ]}>
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
            ) : visibleRoster.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="filter-outline" size={42} color={palette.textMuted} />
                <Text style={[styles.emptyStateText, { color: palette.textMuted }]}>
                  No players match this filter
                </Text>
                <Text style={[styles.emptyStateHint, { color: palette.textMuted }]}>
                  Tap the active position filter to show all players
                </Text>
              </View>
            ) : useChipView ? (
              <>
                {/* Grouped chip grid */}
                {groupedPlayers.map((group) => (
                  <View key={group.label} style={styles.chipGroup}>
                    <View style={styles.chipGroupHeader}>
                      <Text style={[styles.chipGroupLabel, { color: palette.textMuted }]}>
                        {group.label}
                      </Text>
                      <Text style={[styles.chipGroupCount, { color: palette.textMuted }]}>
                        {group.players.length}
                      </Text>
                    </View>
                    <View style={styles.chipGrid}>
                      {group.players.map((player) => (
                        <PlayerChip
                          key={player.id}
                          name={player.name}
                          selected={selectionMode && selectedPlayerIds.has(player.id)}
                          isActive={player.isActive}
                          matchingType={player.matchingType}
                          role={player.role}
                          onPress={
                            selectionMode
                              ? () => togglePlayerSelection(player.id)
                              : () => handleEditPlayer(player)
                          }
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <QuickEditPlayerList
                roster={visibleRoster}
                onEditPlayer={handleEditPlayer}
                onSetPlayerActive={handleSetPlayerActive}
                onSetPlayerMatching={handleSetPlayerMatching}
                onSetPlayerRole={handleSetPlayerRole}
              />
            )}
          </ScrollView>

          {/* Bulk Actions Bar */}
          <RosterBulkActions
            selectedCount={selectedPlayerIds.size}
            onSetMatching={handleBulkSetMatching}
            onSetRole={handleBulkSetRole}
            isVisible={selectionMode}
          />
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
    playerListContentSelection: {
      paddingBottom: 100,
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
    chipGroup: {
      marginBottom: 16,
    },
    chipGroupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
      marginBottom: 8,
    },
    chipGroupLabel: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    chipGroupCount: {
      fontSize: 11,
      fontWeight: '600',
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
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
  });
}
