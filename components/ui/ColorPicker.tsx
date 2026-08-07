import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ColorPicker, { HueSlider, Panel1, Preview } from 'reanimated-color-picker';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getContrastingTextColor, normalizeHexColor, TEAM_COLOR_PRESETS } from '@/lib/colorUtils';
import { Fonts } from '@/theme/theme';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export function TeamColorPicker({ label, value, onChange }: ColorPickerProps) {
  const { sizeClass } = useLayout();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tempColor, setTempColor] = useState(value);
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const metrics = createMetrics(sizeClass);

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
      <ThemedText style={[styles.label, { color: palette.textMuted }]}>{label}</ThemedText>

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
                size={metrics.presetCheckIconSize}
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
        <ThemedText style={[styles.customButtonText, { color: palette.textInverse }]}>
          Custom Color
        </ThemedText>
        <MaterialCommunityIcons
          name="chevron-right"
          size={metrics.customButtonChevronSize}
          color={palette.textMuted}
        />
      </Pressable>

      {/* Advanced Picker Modal */}
      <Modal
        visible={showAdvanced}
        transparent
        animationType="fade"
        supportedOrientations={['portrait', 'landscape']}>
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
                  <ThemedText style={[styles.cancelButtonText, { color: palette.textInverse }]}>
                    Cancel
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, { backgroundColor: palette.accent }]}
                  onPress={handleAdvancedConfirm}>
                  <ThemedText style={[styles.confirmButtonText, { color: palette.textOnAccent }]}>
                    Apply
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      gap: scaleBySizeClass(8, sizeClass),
    },
    label: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(1, sizeClass, { rounding: 'none' }),
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: scaleBySizeClass(8, sizeClass),
    },
    presetSwatch: {
      width: scaleBySizeClass(32, sizeClass),
      height: scaleBySizeClass(32, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
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
      gap: scaleBySizeClass(10, sizeClass),
      paddingVertical: scaleBySizeClass(10, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      borderWidth: 1,
    },
    buttonPressed: {
      opacity: 0.8,
    },
    currentColorPreview: {
      width: scaleBySizeClass(24, sizeClass),
      height: scaleBySizeClass(24, sizeClass),
      borderRadius: scaleBySizeClass(6, sizeClass),
      borderWidth: 1,
    },
    customButtonText: {
      flex: 1,
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: scaleBySizeClass(24, sizeClass),
    },
    modalContent: {
      borderRadius: scaleBySizeClass(20, sizeClass),
      width: '90%',
      maxWidth: scaleBySizeClass(360, sizeClass),
      maxHeight: '100%',
      borderWidth: 1,
      overflow: 'hidden',
    },
    modalScroll: {
      flexGrow: 0,
    },
    modalScrollContent: {
      padding: scaleBySizeClass(16, sizeClass),
    },
    picker: {
      gap: scaleBySizeClass(12, sizeClass),
    },
    preview: {
      height: scaleBySizeClass(35, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
    },
    panel: {
      height: scaleBySizeClass(150, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
    },
    hueSlider: {
      height: scaleBySizeClass(30, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
    },
    modalActions: {
      flexDirection: 'row',
      gap: scaleBySizeClass(12, sizeClass),
      padding: scaleBySizeClass(16, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
    },
    modalButton: {
      flex: 1,
      paddingVertical: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      alignItems: 'center',
    },
    cancelButton: {
      borderWidth: 1,
    },
    cancelButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    confirmButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    presetCheckIconSize: scaleBySizeClass(16, sizeClass),
    customButtonChevronSize: scaleBySizeClass(18, sizeClass),
  };
}
