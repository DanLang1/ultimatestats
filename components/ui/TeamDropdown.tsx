import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export interface TeamDropdownOption {
  id: string;
  label: string;
}

interface TeamDropdownProps {
  options: TeamDropdownOption[];
  placeholder?: string;
  onSelect: (option: TeamDropdownOption) => void;
  onDelete?: (option: TeamDropdownOption) => void;
  buttonStyle?: object;
  disabled?: boolean;
}

export function TeamDropdown({
  options,
  placeholder = 'Select...',
  onSelect,
  onDelete,
  buttonStyle,
  disabled = false,
}: TeamDropdownProps) {
  const [visible, setVisible] = useState(false);
  const { showAlert } = useAlert();
  const { palette } = useTheme();

  const handleSelect = (option: TeamDropdownOption) => {
    onSelect(option);
    setVisible(false);
  };

  const handleDelete = (option: TeamDropdownOption) => {
    showAlert({
      title: 'Delete Team',
      message: `Are you sure you want to delete "${option.label}"?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.(option);
          },
        },
      ],
    });
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: palette.accentOverlay10, borderColor: palette.accentOverlay30 },
          buttonStyle,
          pressed && !disabled && styles.buttonPressed,
          disabled && styles.buttonDisabled,
        ]}
        onPress={() => !disabled && setVisible(true)}>
        <MaterialCommunityIcons name="folder-account-outline" size={18} color={palette.accent} />
        <Text style={[styles.buttonText, { color: palette.accent }]}>{placeholder}</Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={palette.textMuted} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <Pressable
          style={[styles.overlay, { backgroundColor: palette.overlayDark60 }]}
          onPress={() => setVisible(false)}>
          <View
            style={[
              styles.dropdown,
              { backgroundColor: palette.primary, borderColor: palette.overlay15 },
            ]}>
            <View style={[styles.dropdownHeader, { borderBottomColor: palette.overlay10 }]}>
              <Text style={[styles.dropdownTitle, { color: palette.textMuted }]}>SAVED TEAMS</Text>
              <Pressable onPress={() => setVisible(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={20} color={palette.textMuted} />
              </Pressable>
            </View>

            {options.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                  No saved teams yet
                </Text>
                <Text style={[styles.emptyHint, { color: palette.textMuted }]}>
                  Save a team from the roster editor
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.optionsList}>
                {options.map((option) => {
                  const isNewTeam = option.id === 'new-team';
                  return (
                    <View
                      key={option.id}
                      style={[styles.optionRow, { borderBottomColor: palette.overlay05 }]}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.option,
                          pressed && { backgroundColor: palette.overlay08 },
                        ]}
                        onPress={() => handleSelect(option)}>
                        <MaterialCommunityIcons
                          name={isNewTeam ? 'plus-circle-outline' : 'account-group'}
                          size={20}
                          color={isNewTeam ? palette.success : palette.textMuted}
                        />
                        <Text
                          style={[
                            styles.optionText,
                            { color: palette.textInverse },
                            isNewTeam && [styles.newTeamText, { color: palette.success }],
                          ]}>
                          {isNewTeam ? 'New Team' : option.label}
                        </Text>
                      </Pressable>
                      {onDelete && !isNewTeam && (
                        <Pressable
                          style={({ pressed }) => [
                            styles.deleteButton,
                            pressed && { backgroundColor: palette.dangerOverlay15 },
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
                  );
                })}
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
    borderWidth: 1,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  dropdown: {
    width: '100%',
    maxWidth: 320,
    maxHeight: 400,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: '700',
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
  },
  emptyHint: {
    fontSize: 13,
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
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  newTeamText: {
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  deleteButton: {
    padding: 14,
  },
});
