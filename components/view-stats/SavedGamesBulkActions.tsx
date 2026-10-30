import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface SavedGamesBulkActionsProps {
  selectedCount: number;
  maxShareCount: number;
  onDelete: () => void;
  onShare: () => void;
  onCancel: () => void;
  isVisible: boolean;
}

export default function SavedGamesBulkActions({
  selectedCount,
  maxShareCount,
  onDelete,
  onShare,
  onCancel,
  isVisible,
}: SavedGamesBulkActionsProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const actionIconSize = scaleBySizeClass(20, sizeClass);

  if (!isVisible || selectedCount === 0) return null;

  const shareDisabled = selectedCount > maxShareCount;

  return (
    <View style={styles.bottomBar}>
      <View style={styles.actionsContainer}>
        <Pressable
          style={[
            styles.cancelButton,
            {
              backgroundColor: palette.accent,
              shadowColor: palette.shadow,
            },
          ]}
          onPress={onCancel}>
          <MaterialCommunityIcons name="close" size={actionIconSize} color={palette.textOnAccent} />
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            { backgroundColor: palette.accent, shadowColor: palette.shadow },
            shareDisabled && { opacity: 0.5 },
          ]}
          onPress={onShare}
          disabled={shareDisabled}>
          <MaterialCommunityIcons
            name="share-variant"
            size={actionIconSize}
            color={palette.textOnAccent}
          />
          <ThemedText style={[styles.actionText, { color: palette.textOnAccent }]}>
            Share ({selectedCount})
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            { backgroundColor: palette.danger, shadowColor: palette.shadow },
          ]}
          onPress={onDelete}>
          <MaterialCommunityIcons
            name="delete"
            size={actionIconSize}
            color={palette.textOnAccent}
          />
          <ThemedText style={[styles.actionText, { color: palette.textOnAccent }]}>
            Delete ({selectedCount})
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    bottomBar: {
      position: 'absolute',
      bottom: 32,
      right: 24,
      alignItems: 'flex-end',
      pointerEvents: 'box-none',
    },
    actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cancelButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 25,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 8,
    },
    actionText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.3,
    },
  });
}
