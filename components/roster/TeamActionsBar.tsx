import { StyleSheet, View } from 'react-native';

import { TeamActionsBarButton } from '@/components/roster/TeamActionsBarButton';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';

interface TeamActionsBarProps {
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

export function TeamActionsBar({
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
}: TeamActionsBarProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);

  return (
    <View style={[styles.bar, { borderBottomColor: palette.overlay10 }]}>
      <TeamActionsBarButton
        icon={viewMode === 'chips' ? 'view-list' : 'view-module'}
        label={viewMode === 'chips' ? 'Cards' : 'Chips'}
        onPress={onToggleViewMode}
      />
      <TeamActionsBarButton icon="pencil-outline" label="Rename" onPress={onRenameTeam} />
      {showNewTeam && <TeamActionsBarButton icon="plus" label="New Team" onPress={onNewTeam} />}
      {showSwitchTeam && (
        <TeamActionsBarButton icon="swap-horizontal" label="Switch" onPress={onSwitchTeam} />
      )}
      {showImportTeam && (
        <TeamActionsBarButton icon="file-import-outline" label="Import" onPress={onImportTeam} />
      )}
      {showEditPresets && (
        <TeamActionsBarButton icon="playlist-edit" label="Edit Lines" onPress={onEditPresets} />
      )}
      {showShareTeam && (
        <TeamActionsBarButton icon="share-variant" label="Share" onPress={onShareTeam} />
      )}
      {showClearRoster && (
        <TeamActionsBarButton
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
  });
}
