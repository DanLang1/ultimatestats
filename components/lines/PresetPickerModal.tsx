import { useTheme } from '@/context/ThemeContext';
import { LinePreset } from '@/lib/storage/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface PresetPickerModalProps {
  visible: boolean;
  onClose: () => void;
  presets: LinePreset[];
  selectedPresetId: string | null;
  onSelectPreset: (preset: LinePreset) => void;
  onEditPresets: () => void;
}

export function PresetPickerModal({
  visible,
  onClose,
  presets,
  selectedPresetId,
  onSelectPreset,
  onEditPresets,
}: PresetPickerModalProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafeArea} edges={['top', 'left', 'right']}>
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: palette.overlayDark40 }]}
          onPress={onClose}>
          <Pressable
            style={[
              styles.bottomSheet,
              {
                backgroundColor: palette.modalBg,
                paddingBottom: insets.bottom + 16,
              },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle}>
              <View style={[styles.handleBar, { backgroundColor: palette.overlay15 }]} />
            </View>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: palette.modalText }]}>Select Preset</Text>
              <Pressable
                onPress={onEditPresets}
                style={({ pressed }) => [styles.editPresetsHeaderBtn, pressed && { opacity: 0.7 }]}>
                <MaterialCommunityIcons name="pencil" size={14} color={palette.modalTextMuted} />
                <Text style={[styles.editPresetsHeaderText, { color: palette.modalTextMuted }]}>
                  Edit
                </Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.presetList}
              contentContainerStyle={styles.presetListContent}
              showsVerticalScrollIndicator={false}>
              {presets.map((preset) => (
                <Pressable
                  key={preset.id}
                  onPress={() => onSelectPreset(preset)}
                  style={({ pressed }) => [
                    styles.presetListItem,
                    {
                      backgroundColor:
                        selectedPresetId === preset.id ? palette.accent + '20' : 'transparent',
                      borderColor: palette.overlay15,
                    },
                    pressed && { opacity: 0.8 },
                  ]}>
                  <Text
                    style={[
                      styles.presetListItemText,
                      {
                        color: selectedPresetId === preset.id ? palette.accent : palette.modalText,
                      },
                    ]}
                    numberOfLines={1}>
                    {preset.name}
                  </Text>
                  {selectedPresetId === preset.id && (
                    <MaterialCommunityIcons name="check" size={16} color={palette.accent} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalSafeArea: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    maxHeight: '75%',
    width: '75%',
    alignSelf: 'center',
  },
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  editPresetsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  editPresetsHeaderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  presetList: {
    flexGrow: 0,
  },
  presetListContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  presetListItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetListItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
