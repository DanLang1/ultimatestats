import { useTheme } from '@/context/ThemeContext';
import { getContrastingTextColor, normalizeHexColor, TEAM_COLOR_PRESETS } from '@/lib/colorUtils';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ColorPicker, { HueSlider, Panel1, Preview } from 'reanimated-color-picker';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export function TeamColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tempColor, setTempColor] = useState(value);
  const { palette } = useTheme();

  const handlePresetSelect = (hex: string) => {
    onChange(hex);
  };

  const handleAdvancedOpen = () => {
    setTempColor(value);
    setShowAdvanced(true);
  };

  const handleAdvancedConfirm = () => {
    onChange(normalizeHexColor(tempColor));
    setShowAdvanced(false);
  };

  const handleAdvancedCancel = () => {
    setShowAdvanced(false);
  };

  const onColorSelect = (hex: string) => {
    setTempColor(hex);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: palette.textMuted }]}>{label}</Text>

      {/* Preset Grid */}
      <View style={styles.presetGrid}>
        {TEAM_COLOR_PRESETS.map((preset) => (
          <Pressable
            key={preset.hex}
            style={[
              styles.presetSwatch,
              { backgroundColor: preset.hex, borderColor: palette.overlay20 },
              value === preset.hex && [
                styles.presetSwatchSelected,
                { borderColor: palette.accent },
              ],
            ]}
            onPress={() => handlePresetSelect(preset.hex)}>
            {value === preset.hex && (
              <MaterialCommunityIcons
                name="check"
                size={16}
                color={getContrastingTextColor(preset.hex)}
              />
            )}
          </Pressable>
        ))}
      </View>

      {/* Custom Color Button */}
      <Pressable
        style={({ pressed }) => [
          styles.customButton,
          { backgroundColor: palette.overlay08, borderColor: palette.overlay20 },
          pressed && styles.buttonPressed,
        ]}
        onPress={handleAdvancedOpen}>
        <View
          style={[
            styles.currentColorPreview,
            { backgroundColor: value, borderColor: palette.overlay20 },
          ]}
        />
        <Text style={[styles.customButtonText, { color: palette.textInverse }]}>Custom Color</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={palette.textMuted} />
      </Pressable>

      {/* Advanced Picker Modal */}
      <Modal visible={showAdvanced} transparent animationType="fade">
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={[styles.modalBackdrop, { backgroundColor: palette.overlayDark60 }]}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: palette.primary, borderColor: palette.overlay15 },
              ]}>
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}>
                <ColorPicker
                  value={tempColor}
                  onCompleteJS={({ hex }) => onColorSelect(hex)}
                  style={styles.picker}>
                  <Preview style={styles.preview} />
                  <Panel1 style={styles.panel} />
                  <HueSlider style={styles.hueSlider} />
                </ColorPicker>
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                    { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
                  ]}
                  onPress={handleAdvancedCancel}>
                  <Text style={[styles.cancelButtonText, { color: palette.textInverse }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, { backgroundColor: palette.accent }]}
                  onPress={handleAdvancedConfirm}>
                  <Text style={[styles.confirmButtonText, { color: palette.textOnAccent }]}>
                    Apply
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetSwatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetSwatchSelected: {
    borderWidth: 2,
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  currentColorPreview: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
  },
  customButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    width: '90%',
    maxWidth: 360,
    maxHeight: '100%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    padding: 16,
  },
  picker: {
    gap: 12,
  },
  preview: {
    height: 35,
    borderRadius: 8,
  },
  panel: {
    height: 150,
    borderRadius: 8,
  },
  hueSlider: {
    height: 30,
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
