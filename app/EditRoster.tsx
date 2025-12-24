import { useAlert } from '@/components/ui/AlertProvider';
import { useGameStore } from '@/store/gameStore';
import { palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function EditRosterScreen() {
  const { teamName } = useLocalSearchParams<{ teamName: string }>();
  const { team1Roster, team1Name, setRoster, addPlayer, saveTeam, clearRoster } = useGameStore();
  const { showAlert } = useAlert();

  const [newPlayerName, setNewPlayerName] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState('');
  const [editPlayerName, setEditPlayerName] = useState('');

  const isDuplicateName = newPlayerName.trim() !== '' && team1Roster.includes(newPlayerName.trim());

  const handleAddPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (trimmed && !team1Roster.includes(trimmed)) {
      addPlayer('team1', trimmed);
      setNewPlayerName('');
      // Auto-save team with current name
      if (team1Name) {
        const newRoster = [...team1Roster, trimmed];
        saveTeam(team1Name, newRoster);
      }
    }
  };

  const handleRemovePlayer = (playerName: string) => {
    setRoster(
      'team1',
      team1Roster.filter((p) => p !== playerName),
    );
  };

  const handleEditPlayer = (playerName: string) => {
    setEditingPlayer(playerName);
    setEditPlayerName(playerName);
    setEditModalVisible(true);
  };

  const handleConfirmEdit = () => {
    const newName = editPlayerName.trim();
    if (newName && newName !== editingPlayer && !team1Roster.includes(newName)) {
      const updatedRoster = team1Roster.map((p) => (p === editingPlayer ? newName : p));
      setRoster('team1', updatedRoster);
      // Auto-save team
      if (team1Name) {
        saveTeam(team1Name, updatedRoster);
      }
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
          onPress: () => clearRoster(),
        },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={styles.headerTitle}>{(teamName || 'TEAM').toUpperCase()} ROSTER</Text>
        {team1Roster.length > 0 ? (
          <Pressable onPress={handleClearAll} style={styles.clearButton} hitSlop={12}>
            <MaterialCommunityIcons name="delete-sweep-outline" size={22} color={palette.danger} />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Add Player Input */}
      <View style={styles.addPlayerSection}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.addPlayerInput, isDuplicateName && styles.inputError]}
            placeholder="Add player..."
            placeholderTextColor={palette.textMuted}
            value={newPlayerName}
            onChangeText={setNewPlayerName}
            onSubmitEditing={handleAddPlayer}
            returnKeyType="done"
            autoCapitalize="words"
          />
          {isDuplicateName && (
            <Text style={styles.errorText}>{`${newPlayerName} is already on your team`}</Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.buttonPressed]}
          onPress={handleAddPlayer}>
          <MaterialCommunityIcons name="plus" size={24} color={palette.textInverse} />
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
            <Text style={styles.emptyStateText}>No players yet</Text>
            <Text style={styles.emptyStateHint}>Add players using the input above</Text>
          </View>
        ) : (
          <View style={styles.playerGrid}>
            {team1Roster.map((player) => (
              <View key={player} style={styles.chip}>
                <Pressable
                  onPress={() => handleEditPlayer(player)}
                  style={styles.chipTextPressable}>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {player}
                  </Text>
                  <MaterialCommunityIcons name="pencil" size={12} color={palette.textMuted} />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.chipRemoveButton,
                    pressed && styles.chipRemoveButtonPressed,
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
        <Pressable style={styles.modalOverlay} onPress={() => setEditModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>EDIT PLAYER</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Player name..."
              placeholderTextColor={palette.textMuted}
              value={editPlayerName}
              onChangeText={setEditPlayerName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalCancelButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalSaveButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleConfirmEdit}>
                <Text style={styles.modalSaveText}>Save</Text>
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
    backgroundColor: palette.primary,
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
    backgroundColor: palette.overlay10,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    color: palette.textMuted,
  },
  headerSpacer: {
    width: 40,
  },
  clearButton: {
    padding: 8,
    backgroundColor: palette.dangerOverlay15,
    borderRadius: 20,
  },
  saveTeamButton: {
    padding: 8,
    backgroundColor: palette.accentOverlay15,
    borderRadius: 20,
  },
  addPlayerSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.overlay10,
  },
  inputWrapper: {
    flex: 1,
  },
  addPlayerInput: {
    height: 48,
    borderWidth: 1,
    borderColor: palette.overlay20,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: palette.textInverse,
    backgroundColor: palette.overlay08,
  },
  inputError: {
    borderColor: palette.danger,
  },
  errorText: {
    fontSize: 12,
    color: palette.danger,
    marginTop: 4,
    marginLeft: 4,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: palette.accent,
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
    color: palette.textMuted,
    marginTop: 16,
  },
  emptyStateHint: {
    fontSize: 14,
    color: palette.textMuted,
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
    backgroundColor: palette.overlay12,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '500',
    color: palette.textInverse,
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
  chipRemoveButtonPressed: {
    backgroundColor: palette.overlay15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: palette.overlayDark60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: palette.primary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.overlay15,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textMuted,
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: palette.overlay20,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: palette.textInverse,
    backgroundColor: palette.overlay08,
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
    backgroundColor: palette.overlay10,
    borderWidth: 1,
    borderColor: palette.overlay20,
  },
  modalCancelText: {
    color: palette.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: palette.accent,
  },
  modalSaveText: {
    color: palette.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
});
