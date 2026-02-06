import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SavedGamesBulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
  isVisible: boolean;
}

export default function SavedGamesBulkActions({
  selectedCount,
  onDelete,
  onCancel,
  isVisible,
}: SavedGamesBulkActionsProps) {
  const { palette } = useTheme();

  if (!isVisible || selectedCount === 0) return null;

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
          <MaterialCommunityIcons name="close" size={20} color={palette.textOnAccent} />
        </Pressable>

        {/* Delete Button (Pill) */}
        <Pressable
          style={[
            styles.deleteButton,
            { backgroundColor: palette.danger, shadowColor: palette.shadow },
          ]}
          onPress={onDelete}>
          <MaterialCommunityIcons name="delete" size={20} color={palette.textOnAccent} />
          <Text style={[styles.deleteText, { color: palette.textOnAccent }]}>
            Delete ({selectedCount})
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  deleteButton: {
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
  deleteText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
