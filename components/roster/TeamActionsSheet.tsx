import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

interface TeamActionsSheetProps {
  onDismiss: () => void;
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

interface ActionRowProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'danger';
}

function ActionRow({ icon, label, onPress, variant = 'default' }: ActionRowProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const color = variant === 'danger' ? palette.danger : palette.textInverse;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={scaleBySizeClass(22, sizeClass)} color={color} />
      <ThemedText style={[styles.rowLabel, { color }]}>{label}</ThemedText>
    </Pressable>
  );
}

export function TeamActionsSheet({
  onDismiss,
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
}: TeamActionsSheetProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);

  const wrap = (fn: () => void) => () => {
    onDismiss();
    fn();
  };

  return (
    <BottomSheet onDismiss={onDismiss} sheetStyle={{ backgroundColor: palette.secondary }}>
      <View style={styles.sheet}>
        <ActionRow
          icon={viewMode === 'chips' ? 'view-list' : 'view-module'}
          label={viewMode === 'chips' ? 'Switch to Cards' : 'Switch to Chips'}
          onPress={wrap(onToggleViewMode)}
        />
        <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />
        <ActionRow icon="pencil-outline" label="Rename Team" onPress={wrap(onRenameTeam)} />
        {showNewTeam && <ActionRow icon="plus" label="New Team" onPress={wrap(onNewTeam)} />}
        {showSwitchTeam && (
          <ActionRow icon="swap-horizontal" label="Switch Team" onPress={wrap(onSwitchTeam)} />
        )}
        {showEditPresets && (
          <ActionRow icon="playlist-edit" label="Edit Lines" onPress={wrap(onEditPresets)} />
        )}
        {showShareTeam && (
          <ActionRow icon="share-variant" label="Share Team" onPress={wrap(onShareTeam)} />
        )}
        {showClearRoster && (
          <>
            <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />
            <ActionRow
              icon="delete-sweep-outline"
              label="Clear Roster"
              onPress={wrap(onClearRoster)}
              variant="danger"
            />
          </>
        )}
      </View>
    </BottomSheet>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      paddingTop: scaleBySizeClass(12, sizeClass),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(16, sizeClass),
      paddingVertical: scaleBySizeClass(14, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
    },
    rowPressed: {
      opacity: 0.7,
    },
    rowLabel: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    divider: {
      height: 1,
      marginVertical: scaleBySizeClass(4, sizeClass),
      marginHorizontal: scaleBySizeClass(12, sizeClass),
    },
  });
}
