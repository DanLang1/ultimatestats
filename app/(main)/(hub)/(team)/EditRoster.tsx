import { QuickEditPlayerList } from '@/components/roster/QuickEditPlayerList';
import RosterBulkActions from '@/components/roster/RosterBulkActions';
import { RosterControlsHeader } from '@/components/roster/RosterControlsHeader';
import { TeamActionsBar } from '@/components/roster/TeamActionsBar';
import { TeamActionsSheet } from '@/components/roster/TeamActionsSheet';
import { ThemedText } from '@/components/ThemedText';
import { AlertModal } from '@/components/ui/AlertModal';
import { useAlert } from '@/components/ui/AlertProvider';
import { PlayerChip } from '@/components/ui/PlayerChip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ShareConfirmModal } from '@/components/ui/ShareConfirmModal';
import { useTheme } from '@/context/ThemeContext';
import { useActiveGameSession } from '@/hooks/useActiveGameSession';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getPlayerNumberIdentity,
  normalizePlayerNumber,
} from '@/lib/advancedTracking/voiceNumberUtils';
import { MAX_TEAM_NAME_LENGTH } from '@/lib/constants';
import { hasPlayerWithName } from '@/lib/playerUtils';
import { serializeTeam, uploadPayload } from '@/lib/sharing';
import { SHARE_TEAM_UPLOAD_ERROR_MESSAGE } from '@/lib/sharing/shareActionUtils';
import { SavedTeam } from '@/lib/storage';
import { MatchingType, Player, PlayerRole } from '@/lib/storage/types';
import { sortByPlayerNumber } from '@/lib/lineUtils';
import { generateId } from '@/lib/utils';
import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

type RoleFilter = PlayerRole | 'unset' | null;

export default function EditRosterScreen() {
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const metrics = createMetrics(sizeClass);

  const {
    currentTeam,
    setCurrentTeam,
    addPlayer,
    updateRosterPlayer,
    saveCurrentTeam,
    clearRoster,
    savedTeams,
  } = useGameStore();
  const { showAlert } = useAlert();
  const { palette } = useTheme();
  const { rosterViewMode, setRosterViewMode, linePlayerSortOrder } = useSettingsStore();

  // Derived values
  const roster = currentTeam.roster;
  const { kind: activeGameKind } = useActiveGameSession();
  const gameActive = activeGameKind !== 'none';

  const [showShareConfirm, setShowShareConfirm] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
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

  const hasOtherTeams = savedTeams.filter((t) => t.id !== currentTeam.id).length > 0;
  const hasRoster = roster.length > 0;

  // Sorted roster: active first
  const sortedRoster = linePlayerSortOrder === 'number' ? sortByPlayerNumber(roster) : [...roster];
  const displayRoster = sortedRoster.sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    if (linePlayerSortOrder === 'number') {
      return 0;
    }
    return a.name.localeCompare(b.name);
  });
  let filteredRoster: Player[];
  if (roleFilter === null) {
    filteredRoster = displayRoster;
  } else if (roleFilter === 'unset') {
    filteredRoster = displayRoster.filter((player) => player.role === null);
  } else {
    filteredRoster = displayRoster.filter((player) => player.role === roleFilter);
  }
  const visibleRoster =
    selectionMode && bulkVisiblePlayerIds
      ? displayRoster.filter((player) => bulkVisiblePlayerIds.has(player.id))
      : filteredRoster;

  // Derived: check if edited team name already exists
  const teamNameExists =
    editTeamName.trim() !== '' &&
    savedTeams.some(
      (t: SavedTeam) =>
        t.name.toLowerCase() === editTeamName.trim().toLowerCase() && t.id !== currentTeam.id,
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
    if (!newName || teamNameExists) {
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
    if (hasRoster) {
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
    if (selectionMode) return;
    setShowShareConfirm(true);
  };

  const handleImportTeam = () => {
    resetSelectionState();
    router.push('/ImportTeam');
  };

  const handleConfirmShare = async () => {
    const payload = serializeTeam(currentTeam, useLinePresetsStore.getState().presets);
    const { url } = await uploadPayload(payload);
    return url;
  };

  const handleCancelShare = () => {
    setShowShareConfirm(false);
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
    const updateResult = updateRosterPlayer(playerId, { isActive });
    if (updateResult === 'blocked-current-game-participation') {
      showAlert({
        title: 'Player Already Participated',
        message:
          'Players who already appeared in the current game cannot be set inactive until the game is over.',
      });
      return;
    }
    if (updateResult !== 'updated') return;
    await saveCurrentTeam();
  };

  const handleSetPlayerMatching = async (playerId: string, matchingType: MatchingType | null) => {
    const updateResult = updateRosterPlayer(playerId, { matchingType });
    if (updateResult !== 'updated') return;
    await saveCurrentTeam();
  };

  const handleSetPlayerNumber = async (playerId: string, number: string) => {
    const normalizedNumber = normalizePlayerNumber(number);
    const numberIdentity = getPlayerNumberIdentity(normalizedNumber);
    if (
      numberIdentity !== null &&
      roster.some(
        (player) =>
          player.id !== playerId && getPlayerNumberIdentity(player.number) === numberIdentity,
      )
    ) {
      showAlert({
        title: 'Duplicate Number',
        message: `Another player already has #${normalizedNumber}.`,
      });
      return false;
    }

    const updateResult = updateRosterPlayer(playerId, { number: normalizedNumber });
    if (updateResult !== 'updated') return false;
    await saveCurrentTeam();
    return true;
  };

  const handleSetPlayerRole = async (playerId: string, role: Player['role']) => {
    const updateResult = updateRosterPlayer(playerId, { role });
    if (updateResult !== 'updated') return;
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

  let playerListContent: React.ReactNode;
  if (roster.length === 0) {
    playerListContent = (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="account-group-outline"
          size={metrics.emptyStateIconLarge}
          color={palette.textMuted}
        />
        <ThemedText style={[styles.emptyStateText, { color: palette.textMuted }]}>
          No players yet
        </ThemedText>
        <ThemedText style={[styles.emptyStateHint, { color: palette.textMuted }]}>
          Add players using the input above
        </ThemedText>
      </View>
    );
  } else if (visibleRoster.length === 0) {
    playerListContent = (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="filter-outline"
          size={metrics.emptyStateIconMedium}
          color={palette.textMuted}
        />
        <ThemedText style={[styles.emptyStateText, { color: palette.textMuted }]}>
          No players match this filter
        </ThemedText>
        <ThemedText style={[styles.emptyStateHint, { color: palette.textMuted }]}>
          Tap the active position filter to show all players
        </ThemedText>
      </View>
    );
  } else if (useChipView) {
    playerListContent = (
      <>
        {groupedPlayers.map((group) => (
          <View key={group.label} style={styles.chipGroup}>
            <View style={styles.chipGroupHeader}>
              <ThemedText style={[styles.chipGroupLabel, { color: palette.textMuted }]}>
                {group.label}
              </ThemedText>
              <ThemedText style={[styles.chipGroupCount, { color: palette.textMuted }]}>
                {group.players.length}
              </ThemedText>
            </View>
            <View style={styles.chipGrid}>
              {group.players.map((player) => (
                <PlayerChip
                  key={player.id}
                  name={player.name}
                  subtitle={player.number ? `#${player.number}` : undefined}
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
    );
  } else {
    playerListContent = (
      <QuickEditPlayerList
        roster={visibleRoster}
        onEditPlayer={handleEditPlayer}
        onSetPlayerActive={handleSetPlayerActive}
        onSetPlayerMatching={handleSetPlayerMatching}
        onSetPlayerNumber={handleSetPlayerNumber}
        onSetPlayerRole={handleSetPlayerRole}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.mainLayout}>
        {/* Main Content */}
        <View style={styles.mainContent}>
          <ScreenHeader
            title={currentTeam.name.toUpperCase()}
            onBack={handleBack}
            titleColor={palette.textMuted}
            backButtonBackgroundColor={palette.overlay10}
            rightSlot={
              !selectionMode && sizeClass === 'small' ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.moreButton,
                    { backgroundColor: palette.overlay10 },
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => setShowActionsSheet(true)}>
                  <MaterialCommunityIcons
                    name="dots-horizontal"
                    size={scaleBySizeClass(22, sizeClass)}
                    color={palette.textInverse}
                  />
                </Pressable>
              ) : undefined
            }
          />

          {/* Actions bar - medium and large screens */}
          {sizeClass !== 'small' && !selectionMode && (
            <TeamActionsBar
              viewMode={rosterViewMode}
              onToggleViewMode={toggleViewMode}
              onRenameTeam={() => {
                setEditTeamName(currentTeam.name);
                setRenameModalVisible(true);
              }}
              onNewTeam={handleNewTeam}
              onSwitchTeam={() => {
                resetSelectionState();
                router.push('/TeamManagementModal');
              }}
              onEditPresets={() => {
                resetSelectionState();
                router.push('/LinePresetEditor');
              }}
              onImportTeam={handleImportTeam}
              onShareTeam={handleShareTeam}
              onClearRoster={handleClearAll}
              showNewTeam={!gameActive}
              showSwitchTeam={!gameActive && hasOtherTeams}
              showEditPresets={roster.length > 0}
              showShareTeam={roster.length > 0}
              showImportTeam={!gameActive}
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
                  <ThemedText
                    style={[
                      styles.errorText,
                      { color: palette.danger },
                    ]}>{`${newPlayerName} is already on your team`}</ThemedText>
                )}
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.addButton,
                  { backgroundColor: palette.accent },
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleAddPlayer}>
                <MaterialCommunityIcons
                  name="plus"
                  size={metrics.addIconSize}
                  color={palette.textOnAccent}
                />
              </Pressable>
            </View>
          )}

          {roster.length > 0 && (
            <RosterControlsHeader
              isSelecting={selectionMode}
              activeRoleFilter={roleFilter}
              selectedCount={selectedPlayerIds.size}
              allActiveSelected={allActiveSelected}
              hasActivePlayers={hasActivePlayers}
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
            {playerListContent}
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
          <ThemedText style={[styles.errorText, { color: palette.danger }]}>
            A team with this name already exists
          </ThemedText>
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
            <ThemedText style={[styles.alertButtonText, { color: palette.textInverse }]}>
              Cancel
            </ThemedText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.alertButton,
              { backgroundColor: teamNameExists ? palette.overlay20 : palette.accent },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleRenameTeam}
            disabled={teamNameExists}>
            <ThemedText
              style={[
                styles.alertButtonText,
                { color: teamNameExists ? palette.textMuted : palette.textOnAccent },
              ]}>
              Save
            </ThemedText>
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
          <ThemedText style={[styles.errorText, { color: palette.danger }]}>
            A team with this name already exists
          </ThemedText>
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
            <ThemedText style={[styles.alertButtonText, { color: palette.textInverse }]}>
              Cancel
            </ThemedText>
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
            <ThemedText
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
            </ThemedText>
          </Pressable>
        </View>
      </AlertModal>

      <ShareConfirmModal
        visible={showShareConfirm}
        onConfirm={handleConfirmShare}
        errorMessage={SHARE_TEAM_UPLOAD_ERROR_MESSAGE}
        onCancel={handleCancelShare}
        onCloseReady={handleCancelShare}
      />

      <Modal
        visible={showActionsSheet}
        transparent
        animationType="fade"
        supportedOrientations={['portrait', 'landscape']}>
        <TeamActionsSheet
          onDismiss={() => setShowActionsSheet(false)}
          onRenameTeam={() => {
            setEditTeamName(currentTeam.name);
            setRenameModalVisible(true);
          }}
          onNewTeam={handleNewTeam}
          onSwitchTeam={() => {
            resetSelectionState();
            router.push('/TeamManagementModal');
          }}
          onEditPresets={() => {
            resetSelectionState();
            router.push('/LinePresetEditor');
          }}
          onImportTeam={handleImportTeam}
          onShareTeam={handleShareTeam}
          onClearRoster={handleClearAll}
          viewMode={rosterViewMode}
          onToggleViewMode={toggleViewMode}
          showNewTeam={!gameActive}
          showSwitchTeam={!gameActive && hasOtherTeams}
          showEditPresets={roster.length > 0}
          showShareTeam={roster.length > 0}
          showImportTeam={!gameActive}
          showClearRoster={roster.length > 0}
        />
      </Modal>
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    mainLayout: {
      flex: 1,
    },
    mainContent: {
      flex: 1,
    },
    addPlayerSection: {
      flexDirection: 'row',
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
      paddingVertical: scaleBySizeClass(16, sizeClass),
      gap: scaleBySizeClass(12, sizeClass),
      borderBottomWidth: 1,
    },
    inputWrapper: {
      flex: 1,
    },
    addPlayerInput: {
      height: scaleBySizeClass(48, sizeClass),
      borderWidth: 1,
      borderRadius: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: scaleBySizeClass(16, sizeClass),
      fontSize: scaleBySizeClass(16, sizeClass),
    },
    errorText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      marginLeft: scaleBySizeClass(4, sizeClass),
      marginTop: scaleBySizeClass(4, sizeClass),
    },
    addButton: {
      width: scaleBySizeClass(48, sizeClass),
      height: scaleBySizeClass(48, sizeClass),
      borderRadius: scaleBySizeClass(12, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreButton: {
      padding: scaleBySizeClass(8, sizeClass),
      borderRadius: scaleBySizeClass(20, sizeClass),
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    playerList: {
      flex: 1,
    },
    playerListContent: {
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
      paddingBottom: scaleBySizeClass(20, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
    },
    playerListContentSelection: {
      paddingBottom: scaleBySizeClass(100, sizeClass),
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: scaleBySizeClass(30, sizeClass),
    },
    emptyStateText: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.semiBold,
      marginTop: scaleBySizeClass(16, sizeClass),
    },
    emptyStateHint: {
      fontSize: scaleBySizeClass(14, sizeClass),
      marginTop: scaleBySizeClass(4, sizeClass),
    },
    chipGroup: {
      marginBottom: scaleBySizeClass(16, sizeClass),
    },
    chipGroupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: scaleBySizeClass(2, sizeClass),
      marginBottom: scaleBySizeClass(8, sizeClass),
    },
    chipGroupLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: scaleBySizeClass(0.5, sizeClass, { rounding: 'none' }),
    },
    chipGroupCount: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: scaleBySizeClass(8, sizeClass),
    },
    // Alert modal content styles
    alertInput: {
      borderWidth: 1,
      borderRadius: scaleBySizeClass(10, sizeClass),
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      paddingVertical: scaleBySizeClass(12, sizeClass),
      fontSize: scaleBySizeClass(16, sizeClass),
      marginBottom: scaleBySizeClass(8, sizeClass),
    },
    alertButtonContainer: {
      flexDirection: 'row',
      gap: scaleBySizeClass(12, sizeClass),
    },
    alertButton: {
      flex: 1,
      paddingVertical: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertCancelButton: {
      borderWidth: 1,
    },
    alertButtonText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    addIconSize: scaleBySizeClass(24, sizeClass),
    emptyStateIconLarge: scaleBySizeClass(48, sizeClass),
    emptyStateIconMedium: scaleBySizeClass(42, sizeClass),
  };
}
