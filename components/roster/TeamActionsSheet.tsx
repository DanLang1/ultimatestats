import { BottomSheet } from '@/components/ui/BottomSheet';
import { BottomSheetActionRow } from '@/components/ui/BottomSheetActionRow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface TeamActionsSheetProps {
  onDismiss: () => void;
  onRenameTeam: () => void;
  onNewTeam: () => void;
  onSwitchTeam: () => void;
  onEditPresets: () => void;
  onShareTeam: () => void;
  onClearRoster: () => void;
  onToggleViewMode: () => void;
  onImportTeam: () => void;
  viewMode: 'chips' | 'cards';
  showNewTeam: boolean;
  showSwitchTeam: boolean;
  showEditPresets: boolean;
  showShareTeam: boolean;
  showClearRoster: boolean;
  showImportTeam: boolean;
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
  onImportTeam,
  viewMode,
  showNewTeam,
  showSwitchTeam,
  showEditPresets,
  showShareTeam,
  showClearRoster,
  showImportTeam,
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
        <BottomSheetActionRow
          testID="team-actions-toggle-view"
          icon={viewMode === 'chips' ? 'view-list' : 'view-module'}
          label={viewMode === 'chips' ? 'Switch to Cards' : 'Switch to Chips'}
          onPress={wrap(onToggleViewMode)}
        />
        <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />
        {showImportTeam && (
          <BottomSheetActionRow
            testID="team-actions-import"
            icon="file-import-outline"
            label="Import from USAU"
            onPress={wrap(onImportTeam)}
          />
        )}
        <BottomSheetActionRow
          testID="team-actions-rename"
          icon="pencil-outline"
          label="Rename Team"
          onPress={wrap(onRenameTeam)}
        />
        {showNewTeam && (
          <BottomSheetActionRow
            testID="team-actions-new"
            icon="plus"
            label="New Team"
            onPress={wrap(onNewTeam)}
          />
        )}
        {showSwitchTeam && (
          <BottomSheetActionRow
            testID="team-actions-switch"
            icon="swap-horizontal"
            label="Switch Team"
            onPress={wrap(onSwitchTeam)}
          />
        )}
        {showEditPresets && (
          <BottomSheetActionRow
            testID="team-actions-edit-lines"
            icon="playlist-edit"
            label="Edit Lines"
            onPress={wrap(onEditPresets)}
          />
        )}
        {showShareTeam && (
          <BottomSheetActionRow
            testID="team-actions-share"
            icon="share-variant"
            label="Share Team"
            onPress={wrap(onShareTeam)}
          />
        )}
        {showClearRoster && (
          <>
            <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />
            <BottomSheetActionRow
              testID="team-actions-clear-roster"
              icon="delete-sweep-outline"
              label="Clear Roster"
              onPress={wrap(onClearRoster)}
              tone="danger"
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
    divider: {
      height: 1,
      marginVertical: scaleBySizeClass(4, sizeClass),
      marginHorizontal: scaleBySizeClass(12, sizeClass),
    },
  });
}
