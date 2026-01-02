import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function EditRosterScreen() {
  const { teamName } = useLocalSearchParams<{ teamName: string }>();
  const { currentTeam, setCurrentTeam, addPlayer, saveCurrentTeam, clearRoster } = useGameStore();
  const { showAlert } = useAlert();
  const { palette } = useTheme();

  // Derived values
  const team1Roster = currentTeam?.roster ?? [];

  const [newPlayerName, setNewPlayerName] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState('');
  const [editPlayerName, setEditPlayerName] = useState('');

  const isDuplicateName = newPlayerName.trim() !== '' && team1Roster.includes(newPlayerName.trim());

  const handleAddPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (trimmed && !team1Roster.includes(trimmed)) {
      addPlayer(trimmed);
      setNewPlayerName('');
      // Auto-save team
      saveCurrentTeam();
    }
  };

  const handleRemovePlayer = (playerName: string) => {
    if (!currentTeam) return;
    const newRoster = team1Roster.filter((p: string) => p !== playerName);
    setCurrentTeam({ ...currentTeam, roster: newRoster });
  };

  const handleEditPlayer = (playerName: string) => {
    setEditingPlayer(playerName);
    setEditPlayerName(playerName);
    setEditModalVisible(true);
  };

  const handleConfirmEdit = () => {
    const newName = editPlayerName.trim();
    if (newName && newName !== editingPlayer && !team1Roster.includes(newName) && currentTeam) {
      const updatedRoster = team1Roster.map((p: string) => (p === editingPlayer ? newName : p));
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
    showAlert({
      title: 'Clear Roster',
      message: 'Remove all players from the roster?',
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
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>
          {(teamName || 'TEAM').toUpperCase()} ROSTER
        </Text>
        {team1Roster.length > 0 ? (
          <Pressable
            onPress={handleClearAll}
            style={[styles.clearButton, { backgroundColor: palette.dangerOverlay15 }]}
            hitSlop={12}>
            <MaterialCommunityIcons name="delete-sweep-outline" size={22} color={palette.danger} />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
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
        {team1Roster.length === 0 ? (
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
            {team1Roster.map((player: string) => (
              <View key={player} style={[styles.chip, { backgroundColor: palette.overlay12 }]}>
                <Pressable
                  onPress={() => handleEditPlayer(player)}
                  style={styles.chipTextPressable}>
                  <Text style={[styles.chipText, { color: palette.textInverse }]} numberOfLines={1}>
                    {player}
                  </Text>
                  <MaterialCommunityIcons name="pencil" size={12} color={palette.textMuted} />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.chipRemoveButton,
                    pressed && [
                      styles.chipRemoveButtonPressed,
                      { backgroundColor: palette.overlay15 },
                    ],
                  ]}
                  onPress={() => handleRemovePlayer(player)}
                  hitSlop={4}>
                  <MaterialCommunityIcons name="close" size={14} color={palette.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Player Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: palette.overlayDark60 }]}
          onPress={() => setEditModalVisible(false)}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: palette.primary, borderColor: palette.overlay15 },
            ]}
            onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: palette.textMuted }]}>EDIT PLAYER</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  borderColor: palette.overlay20,
                  color: palette.textInverse,
                  backgroundColor: palette.overlay08,
                },
              ]}
              placeholder="Player name..."
              placeholderTextColor={palette.textMuted}
              value={editPlayerName}
              onChangeText={setEditPlayerName}
              autoFocus
              maxLength={20}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalCancelButton,
                  { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setEditModalVisible(false)}>
                <Text style={[styles.modalCancelText, { color: palette.textInverse }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalSaveButton,
                  { backgroundColor: palette.accent },
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleConfirmEdit}>
                <Text style={[styles.modalSaveText, { color: palette.textOnAccent }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  saveTeamButton: {
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
    marginTop: 4,
    marginLeft: 4,
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
  chipRemoveButtonPressed: {},
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
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
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
});
