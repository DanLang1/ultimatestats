import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

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
  sizeClass?: SizeClass;
}

interface ToolbarButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'danger';
  sizeClass?: SizeClass;
}

function ToolbarButton({
  icon,
  label,
  onPress,
  variant = 'default',
  sizeClass = 'small',
}: ToolbarButtonProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const iconSize = scaleBySizeClass(20, sizeClass);

  const color = variant === 'danger' ? palette.danger : palette.textInverse;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.toolbarButton, pressed && styles.buttonPressed]}>
      <MaterialCommunityIcons name={icon} size={iconSize} color={color} />
      <ThemedText style={[styles.toolbarButtonText, { color }]} numberOfLines={1}>
        {label}
      </ThemedText>
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
  sizeClass = 'small',
}: EditRosterToolbarProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);

  return (
    <View style={[styles.toolbar, { borderBottomColor: palette.overlay10 }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolbarContent}>
        <ToolbarButton
          icon="pencil-outline"
          label="Rename"
          onPress={onRenameTeam}
          sizeClass={sizeClass}
        />
        {showNewTeam && (
          <ToolbarButton icon="plus" label="New Team" onPress={onNewTeam} sizeClass={sizeClass} />
        )}
        {showSwitchTeam && (
          <ToolbarButton
            icon="swap-horizontal"
            label="Switch"
            onPress={onSwitchTeam}
            sizeClass={sizeClass}
          />
        )}
        {showEditPresets && (
          <ToolbarButton
            icon="playlist-edit"
            label="Lines"
            onPress={onEditPresets}
            sizeClass={sizeClass}
          />
        )}
        {showShareTeam && (
          <ToolbarButton
            icon="share-variant"
            label="Share"
            onPress={onShareTeam}
            sizeClass={sizeClass}
          />
        )}
        {showClearRoster && (
          <ToolbarButton
            icon="delete-sweep-outline"
            label="Clear"
            onPress={onClearRoster}
            variant="danger"
            sizeClass={sizeClass}
          />
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    toolbar: {
      borderBottomWidth: 1,
    },
    toolbarContent: {
      flexDirection: 'row',
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      paddingVertical: scaleBySizeClass(8, sizeClass),
      gap: scaleBySizeClass(4, sizeClass),
    },
    toolbarButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: scaleBySizeClass(6, sizeClass),
      paddingHorizontal: scaleBySizeClass(10, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
      minWidth: scaleBySizeClass(56, sizeClass),
    },
    toolbarButtonText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      marginTop: scaleBySizeClass(2, sizeClass),
    },
    buttonPressed: {
      opacity: 0.7,
    },
  });
}
