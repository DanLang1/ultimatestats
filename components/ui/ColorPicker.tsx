import { normalizeHexColor, TEAM_COLOR_PRESETS } from '@/lib/colorUtils';
import { palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
      <Text style={styles.label}>{label}</Text>

      {/* Preset Grid */}
      <View style={styles.presetGrid}>
        {TEAM_COLOR_PRESETS.map((preset) => (
          <Pressable
            key={preset.hex}
            style={[
              styles.presetSwatch,
              { backgroundColor: preset.hex },
              value === preset.hex && styles.presetSwatchSelected,
            ]}
            onPress={() => handlePresetSelect(preset.hex)}>
            {value === preset.hex && (
              <MaterialCommunityIcons
                name="check"
                size={16}
                color={preset.hex === '#FFFFFF' || preset.hex === '#FFD700' ? '#000' : '#FFF'}
              />
            )}
          </Pressable>
        ))}
      </View>

      {/* Custom Color Button */}
      <Pressable
        style={({ pressed }) => [styles.customButton, pressed && styles.buttonPressed]}
        onPress={handleAdvancedOpen}>
        <View style={[styles.currentColorPreview, { backgroundColor: value }]} />
        <Text style={styles.customButtonText}>Custom Color</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={palette.textMuted} />
      </Pressable>

      {/* Advanced Picker Modal */}
      <Modal visible={showAdvanced} transparent animationType="fade">
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choose Custom Color</Text>

              <ColorPicker
                value={tempColor}
                onCompleteJS={({ hex }) => onColorSelect(hex)}
                style={styles.picker}>
                <Preview style={styles.preview} />
                <Panel1 style={styles.panel} />
                <HueSlider style={styles.hueSlider} />
              </ColorPicker>

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleAdvancedCancel}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleAdvancedConfirm}>
                  <Text style={styles.confirmButtonText}>Apply</Text>
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
    color: palette.textMuted,
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
    borderColor: palette.overlay20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetSwatchSelected: {
    borderWidth: 2,
    borderColor: palette.accent,
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: palette.overlay08,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.overlay20,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  currentColorPreview: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.overlay20,
  },
  customButtonText: {
    flex: 1,
    color: palette.textInverse,
    fontSize: 14,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: palette.overlayDark60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: palette.primary,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: palette.overlay15,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.textInverse,
    textAlign: 'center',
    marginBottom: 16,
  },
  picker: {
    gap: 16,
  },
  preview: {
    height: 50,
    borderRadius: 10,
  },
  panel: {
    height: 180,
    borderRadius: 10,
  },
  hueSlider: {
    height: 30,
    borderRadius: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: palette.overlay10,
    borderWidth: 1,
    borderColor: palette.overlay20,
  },
  cancelButtonText: {
    color: palette.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: palette.accent,
  },
  confirmButtonText: {
    color: palette.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
});
