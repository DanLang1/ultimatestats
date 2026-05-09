import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

interface TeamActionsBarProps {
  onRenameTeam: () => void;
  onNewTeam: () => void;
  onSwitchTeam: () => void;
  onEditPresets: () => void;
  onShareTeam: () => void;
  onClearRoster: () => void;
  onToggleViewMode: () => void;
  viewMode: 'chips' | 'cards';
  showNewTeam: boolean;
  showSwitchTeam: boolean;
  showEditPresets: boolean;
  showShareTeam: boolean;
  showClearRoster: boolean;
}

interface BarButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'danger';
}

function BarButton({ icon, label, onPress, variant = 'default' }: BarButtonProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const color = variant === 'danger' ? palette.danger : palette.textInverse;

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={scaleBySizeClass(20, sizeClass)} color={color} />
      <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
    </Pressable>
  );
}

export function TeamActionsBar({
  onRenameTeam,
  onNewTeam,
  onSwitchTeam,
  onEditPresets,
  onShareTeam,
  onClearRoster,
  onToggleViewMode,
  viewMode,
  showNewTeam,
  showSwitchTeam,
  showEditPresets,
  showShareTeam,
  showClearRoster,
}: TeamActionsBarProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);

  return (
    <View style={[styles.bar, { borderBottomColor: palette.overlay10 }]}>
      <BarButton
        icon={viewMode === 'chips' ? 'view-list' : 'view-module'}
        label={viewMode === 'chips' ? 'Cards' : 'Chips'}
        onPress={onToggleViewMode}
      />
      <BarButton icon="pencil-outline" label="Rename" onPress={onRenameTeam} />
      {showNewTeam && <BarButton icon="plus" label="New Team" onPress={onNewTeam} />}
      {showSwitchTeam && <BarButton icon="swap-horizontal" label="Switch" onPress={onSwitchTeam} />}
      {showEditPresets && (
        <BarButton icon="playlist-edit" label="Edit Lines" onPress={onEditPresets} />
      )}
      {showShareTeam && <BarButton icon="share-variant" label="Share" onPress={onShareTeam} />}
      {showClearRoster && (
        <BarButton
          icon="delete-sweep-outline"
          label="Clear"
          onPress={onClearRoster}
          variant="danger"
        />
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      borderBottomWidth: 1,
      paddingVertical: scaleBySizeClass(10, sizeClass),
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
    },
    button: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(5, sizeClass),
      paddingVertical: scaleBySizeClass(8, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
    },
    label: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    buttonPressed: {
      opacity: 0.7,
    },
  });
}
