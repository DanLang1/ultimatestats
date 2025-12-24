import { palette } from '@/constants/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export interface DropdownOption {
  id: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  placeholder?: string;
  onSelect: (option: DropdownOption) => void;
  onDelete?: (option: DropdownOption) => void;
  buttonStyle?: object;
}

export function Dropdown({
  options,
  placeholder = 'Select...',
  onSelect,
  onDelete,
  buttonStyle,
}: DropdownProps) {
  const [visible, setVisible] = useState(false);

  const handleSelect = (option: DropdownOption) => {
    onSelect(option);
    setVisible(false);
  };

  const handleDelete = (option: DropdownOption) => {
    Alert.alert('Delete Team', `Are you sure you want to delete "${option.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDelete?.(option);
        },
      },
    ]);
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.button, buttonStyle, pressed && styles.buttonPressed]}
        onPress={() => setVisible(true)}>
        <MaterialCommunityIcons name="folder-account-outline" size={18} color={palette.accent} />
        <Text style={styles.buttonText}>{placeholder}</Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={palette.textMuted} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.dropdown}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>SAVED TEAMS</Text>
              <Pressable onPress={() => setVisible(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={20} color={palette.textMuted} />
              </Pressable>
            </View>

            {options.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No saved teams yet</Text>
                <Text style={styles.emptyHint}>Save a team from the roster editor</Text>
              </View>
            ) : (
              <ScrollView style={styles.optionsList}>
                {options.map((option) => (
                  <View key={option.id} style={styles.optionRow}>
                    <Pressable
                      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                      onPress={() => handleSelect(option)}>
                      <MaterialCommunityIcons
                        name="account-group"
                        size={20}
                        color={palette.textMuted}
                      />
                      <Text style={styles.optionText}>{option.label}</Text>
                    </Pressable>
                    {onDelete && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.deleteButton,
                          pressed && styles.deleteButtonPressed,
                        ]}
                        onPress={() => handleDelete(option)}
                        hitSlop={8}>
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={18}
                          color={palette.danger}
                        />
                      </Pressable>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    flex: 1,
    color: palette.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  dropdown: {
    width: '100%',
    maxWidth: 320,
    maxHeight: 400,
    backgroundColor: palette.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textMuted,
    letterSpacing: 1,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.textMuted,
  },
  emptyHint: {
    fontSize: 13,
    color: palette.textMuted,
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: palette.textInverse,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  deleteButton: {
    padding: 14,
  },
  deleteButtonPressed: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
});
