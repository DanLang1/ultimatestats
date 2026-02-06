import { PresetEditView } from '@/components/lines/PresetEditView';
import { PresetListView } from '@/components/lines/PresetListView';
import { useAlert } from '@/components/ui/AlertProvider';
import { useIsGameActive } from '@/hooks/useIsGameActive';
import { MAX_LINE_SIZE } from '@/lib/lineUtils';
import { LinePreset } from '@/lib/storage/types';
import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

export default function LinePresetEditor() {
  const { presetId } = useLocalSearchParams<{ presetId?: string }>();
  const { showAlert } = useAlert();

  const { currentTeam, pointLines } = useGameStore();
  const { numPlayers } = useSettingsStore();
  const gameActive = useIsGameActive();
  const { presets, addPreset, updatePreset, deletePreset, reorderPresets } = useLinePresetsStore();

  const teamId = currentTeam?.id ?? '';
  const teamPresets = presets.filter((p) => p.teamId === teamId);
  const roster = currentTeam?.roster ?? [];
  const activePlayers = roster.filter((p) => p.isActive !== false);

  // If presetId is passed, initialize directly in edit mode
  const initialPreset = presetId ? (presets.find((p) => p.id === presetId) ?? null) : null;

  const [mode, setMode] = useState<'list' | 'edit'>(initialPreset ? 'edit' : 'list');
  const [editingPreset, setEditingPreset] = useState<LinePreset | null>(initialPreset);
  const [presetName, setPresetName] = useState(initialPreset?.name ?? '');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialPreset?.playerIds ?? []);

  const handleClose = () => {
    router.back();
  };

  const handleCreateNew = () => {
    setEditingPreset(null);
    setPresetName('Line');
    setSelectedIds([]);
    setMode('edit');
  };

  const handleEditPreset = (preset: LinePreset) => {
    setEditingPreset(preset);
    setPresetName(preset.name);
    setSelectedIds(preset.playerIds);
    setMode('edit');
  };

  const handleTogglePlayer = (playerId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length >= MAX_LINE_SIZE) {
        return prev;
      }
      return [...prev, playerId];
    });
  };

  const handleSave = () => {
    const trimmedName = presetName.trim();
    if (!trimmedName || selectedIds.length === 0) return;

    // Check for duplicate name (case-insensitive, excluding current preset if editing)
    const isDuplicate = teamPresets.some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase() && p.id !== editingPreset?.id,
    );

    if (isDuplicate) {
      showAlert({
        title: 'Name Already Exists',
        message: `A preset named "${trimmedName}" already exists. Choose a different name.`,
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    if (editingPreset) {
      updatePreset(editingPreset.id, { name: trimmedName, playerIds: selectedIds });
    } else {
      addPreset(trimmedName, selectedIds, teamId);
    }
    setMode('list');
  };

  const handleReorderPresets = (fromIndex: number, toIndex: number) => {
    reorderPresets(teamId, fromIndex, toIndex);
  };

  const handleDeletePreset = (preset: LinePreset) => {
    showAlert({
      title: 'Delete Preset',
      message: `Delete "${preset.name}"? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePreset(preset.id);
          },
        },
      ],
    });
  };

  const handleBack = () => {
    // Check for unsaved changes
    const hasNameChange = editingPreset
      ? presetName.trim() !== editingPreset.name
      : presetName.trim() !== 'Line' && presetName.trim() !== '';

    const originalIds = editingPreset?.playerIds ?? [];
    const hasPlayerChange =
      selectedIds.length !== originalIds.length ||
      selectedIds.some((id) => !originalIds.includes(id));

    if (hasNameChange || hasPlayerChange) {
      showAlert({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Do you want to discard them?',
        buttons: [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => setMode('list'),
          },
        ],
      });
      return;
    }

    setMode('list');
  };

  if (mode === 'list') {
    return (
      <PresetListView
        presets={teamPresets}
        onClose={handleClose}
        onCreateNew={handleCreateNew}
        onEditPreset={handleEditPreset}
        onDeletePreset={handleDeletePreset}
        onReorderPresets={handleReorderPresets}
      />
    );
  }

  return (
    <PresetEditView
      roster={activePlayers}
      pointLines={pointLines}
      editingPreset={editingPreset}
      presetName={presetName}
      selectedIds={selectedIds}
      gameActive={gameActive}
      numPlayers={numPlayers}
      onPresetNameChange={setPresetName}
      onTogglePlayer={handleTogglePlayer}
      onSave={handleSave}
      onBack={handleBack}
    />
  );
}
