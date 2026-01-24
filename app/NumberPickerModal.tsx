import { useTheme } from '@/context/ThemeContext';
import { useNumberPickerStore } from '@/store/numberPickerStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function NumberPickerModal() {
  const { palette } = useTheme();
  const { isActive, value, min, max, label, suffix, quickOptions, save, close } =
    useNumberPickerStore();

  const [inputString, setInputString] = useState('');

  // Initialize input string when modal opens
  useEffect(() => {
    if (isActive) {
      setInputString(value > 0 ? value.toString() : '');
    }
  }, [isActive, value]);

  if (!isActive) {
    return null;
  }

  const currentValue = inputString === '' ? 0 : parseInt(inputString, 10);

  const handleDigitPress = (digit: number) => {
    const newString = inputString + digit.toString();
    const newValue = parseInt(newString, 10);
    if (newValue <= max) {
      setInputString(newString);
    }
  };

  const handleBackspace = () => {
    setInputString((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setInputString('');
  };

  const handleQuickOption = (opt: number) => {
    setInputString(opt.toString());
  };

  const handleDismiss = () => {
    close();
    router.back();
  };

  const handleSave = () => {
    const finalValue = Math.max(min, Math.min(max, currentValue));
    save(finalValue);
    router.back();
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayModal }]}
        onPress={handleDismiss}>
        <Pressable
          style={[
            styles.container,
            { backgroundColor: palette.modalBg, borderColor: palette.overlay15 },
          ]}
          onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: palette.modalText }]}>{label}</Text>
            <Text style={[styles.rangeText, { color: palette.modalText, opacity: 0.6 }]}>
              {min} - {max}
            </Text>
          </View>

          {/* Main Content - Horizontal Layout */}
          <View style={styles.content}>
            {/* Left - Value Display */}
            <View style={styles.valueDisplayContainer}>
              <Text
                style={[
                  styles.largeValue,
                  { color: palette.modalText, opacity: inputString ? 1 : 0.4 },
                ]}>
                {inputString || '0'}
              </Text>
              {suffix && (
                <Text style={[styles.largeSuffix, { color: palette.modalText, opacity: 0.6 }]}>
                  {suffix}
                </Text>
              )}
            </View>

            {/* Right - Numpad */}
            <View style={styles.numpadContainer}>
              <View style={styles.numpadRow}>
                {[1, 2, 3, 4, 5].map((digit) => (
                  <Pressable
                    key={digit}
                    onPress={() => handleDigitPress(digit)}
                    style={({ pressed }) => [
                      styles.numpadButton,
                      { backgroundColor: palette.overlay15 },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <Text style={[styles.numpadText, { color: palette.modalText }]}>{digit}</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={handleBackspace}
                  style={({ pressed }) => [
                    styles.numpadButton,
                    { backgroundColor: palette.overlay20 },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <MaterialCommunityIcons
                    name="backspace-outline"
                    size={24}
                    color={palette.modalText}
                  />
                </Pressable>
              </View>

              <View style={styles.numpadRow}>
                {[6, 7, 8, 9, 0].map((digit) => (
                  <Pressable
                    key={digit}
                    onPress={() => handleDigitPress(digit)}
                    style={({ pressed }) => [
                      styles.numpadButton,
                      { backgroundColor: palette.overlay15 },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <Text style={[styles.numpadText, { color: palette.modalText }]}>{digit}</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={handleClear}
                  style={({ pressed }) => [
                    styles.numpadButton,
                    { backgroundColor: palette.overlay20 },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <Text style={[styles.numpadText, { color: palette.modalText, opacity: 0.6 }]}>
                    C
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Quick Options - Below main content */}
          {quickOptions && quickOptions.length > 0 && (
            <View style={styles.quickOptionsContainer}>
              {Array.from(new Set(quickOptions)).map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => handleQuickOption(opt)}
                  style={({ pressed }) => [
                    styles.quickOptionChip,
                    {
                      backgroundColor: currentValue === opt ? palette.accent : palette.overlay15,
                    },
                    pressed && { opacity: 0.8 },
                  ]}>
                  <Text
                    style={[
                      styles.quickOptionText,
                      {
                        color: currentValue === opt ? palette.textOnAccent : palette.modalText,
                      },
                    ]}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.actionButton,
                styles.cancelButton,
                { borderColor: palette.overlay15 },
                pressed && { opacity: 0.7 },
              ]}>
              <Text style={[styles.actionButtonText, { color: palette.accent }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.actionButton,
                styles.saveButton,
                { backgroundColor: palette.accent },
                pressed && { opacity: 0.8 },
              ]}>
              <Text style={[styles.actionButtonText, { color: palette.textOnAccent }]}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  rangeText: {
    fontSize: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  valueDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minWidth: 120,
    gap: 6,
  },
  largeValue: {
    fontSize: 44,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  largeSuffix: {
    fontSize: 18,
    fontWeight: '500',
  },
  numpadContainer: {
    gap: 6,
  },
  numpadRow: {
    flexDirection: 'row',
    gap: 6,
  },
  numpadButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numpadText: {
    fontSize: 20,
    fontWeight: '600',
  },
  quickOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  quickOptionChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 44,
    alignItems: 'center',
  },
  quickOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  saveButton: {},
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
