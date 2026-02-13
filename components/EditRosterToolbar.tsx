import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export interface EditRosterToolbarProps {
  onRenameTeam: () => void;
  onNewTeam: () => void;
  onSwitchTeam: () => void;
  onEditPresets: () => void;
  onShareTeam: () => void;
  onClearRoster: () => void;
  showSwitchTeam: boolean;
  showEditPresets: boolean;
  showShareTeam: boolean;
  showClearRoster: boolean;
  showNewTeam: boolean;
}

interface ToolbarButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'danger';
}

function ToolbarButton({ icon, label, onPress, variant = 'default' }: ToolbarButtonProps) {
  const { palette } = useTheme();

  const color = variant === 'danger' ? palette.danger : palette.textInverse;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.toolbarButton, pressed && styles.buttonPressed]}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={[styles.toolbarButtonText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function EditRosterToolbar({
  onRenameTeam,
  onNewTeam,
  onSwitchTeam,
  onEditPresets,
  onShareTeam,
  onClearRoster,
  showSwitchTeam,
  showEditPresets,
  showShareTeam,
  showClearRoster,
  showNewTeam,
}: EditRosterToolbarProps) {
  const { palette } = useTheme();

  return (
    <View style={[styles.toolbar, { borderBottomColor: palette.overlay10 }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolbarContent}>
        <ToolbarButton icon="pencil-outline" label="Rename" onPress={onRenameTeam} />
        {showNewTeam && <ToolbarButton icon="plus" label="New Team" onPress={onNewTeam} />}
        {showSwitchTeam && (
          <ToolbarButton icon="swap-horizontal" label="Switch" onPress={onSwitchTeam} />
        )}
        {showEditPresets && (
          <ToolbarButton icon="playlist-edit" label="Lines" onPress={onEditPresets} />
        )}
        {showShareTeam && (
          <ToolbarButton icon="share-variant" label="Share" onPress={onShareTeam} />
        )}
        {showClearRoster && (
          <ToolbarButton
            icon="delete-sweep-outline"
            label="Clear"
            onPress={onClearRoster}
            variant="danger"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    borderBottomWidth: 1,
  },
  toolbarContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  toolbarButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    minWidth: 56,
  },
  toolbarButtonText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
