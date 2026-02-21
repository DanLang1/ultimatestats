import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SavedGamesBulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  onShare: () => void;
  onCancel: () => void;
  isVisible: boolean;
}

const MAX_BULK_SHARE = 10;

export default function SavedGamesBulkActions({
  selectedCount,
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

  const shareDisabled = selectedCount > MAX_BULK_SHARE;

  return (
    <View style={styles.bottomBar}>
      <View style={styles.actionsContainer}>
        {/* Cancel Button (X) */}
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

        {/* Share Button (Pill) */}
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
          <Text style={[styles.actionText, { color: palette.textOnAccent }]}>
            Share ({selectedCount})
          </Text>
        </Pressable>

        {/* Delete Button (Pill) */}
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
          <Text style={[styles.actionText, { color: palette.textOnAccent }]}>
            Delete ({selectedCount})
          </Text>
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
      // Shadow
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
      // Shadow
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 8,
    },
    actionText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  });
}
