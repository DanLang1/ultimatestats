import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MODAL_MAX_WIDTH_PICKER } from '@/lib/constants';
import { useNumberPickerStore } from '@/store/numberPickerStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function NumberPickerModal() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { isActive, value, min, max, label, helperText, suffix, quickOptions, save, close } =
    useNumberPickerStore();

  const [inputString, setInputString] = useState(value > 0 ? value.toString() : '');

  if (!isActive) {
    return null;
  }

  const currentValue = inputString === '' ? 0 : parseInt(inputString, 10);
  const hasInvalidValue = Number.isNaN(currentValue) || currentValue < min || currentValue > max;
  const validationText = hasInvalidValue
    ? (helperText ?? `Enter a value from ${min} to ${max}.`)
    : null;

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
    if (hasInvalidValue) {
      return;
    }

    save(currentValue);
    router.back();
  };

  const keypadRows = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ] as const;

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
            <View style={styles.headerTopRow}>
              <Text style={[styles.title, { color: palette.modalText }]}>{label}</Text>
              <Text style={[styles.rangeText, { color: palette.modalTextMuted }]}>
                {min} - {max}
              </Text>
            </View>
            {validationText && (
              <Text style={[styles.helperText, { color: palette.danger }]}>{validationText}</Text>
            )}
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Value Display */}
            <View style={[styles.valueDisplayContainer, { borderBottomColor: palette.overlay15 }]}>
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

            {/* Numpad */}
            {isLandscape ? (
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
                      size={scaleBySizeClass(24, sizeClass)}
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
            ) : (
              <View style={styles.numpadContainerPortrait}>
                {keypadRows.map((row) => (
                  <View key={row.join('-')} style={styles.numpadRow}>
                    {row.map((digit) => (
                      <Pressable
                        key={digit}
                        onPress={() => handleDigitPress(digit)}
                        style={({ pressed }) => [
                          styles.numpadButtonPortrait,
                          { backgroundColor: palette.overlay15 },
                          pressed && { opacity: 0.6 },
                        ]}>
                        <Text style={[styles.numpadText, { color: palette.modalText }]}>
                          {digit}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ))}

                <View style={styles.numpadRow}>
                  <Pressable
                    onPress={handleClear}
                    style={({ pressed }) => [
                      styles.numpadButtonPortrait,
                      { backgroundColor: palette.overlay20 },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <Text style={[styles.numpadText, { color: palette.modalText, opacity: 0.6 }]}>
                      C
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleDigitPress(0)}
                    style={({ pressed }) => [
                      styles.numpadButtonPortrait,
                      { backgroundColor: palette.overlay15 },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <Text style={[styles.numpadText, { color: palette.modalText }]}>0</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleBackspace}
                    style={({ pressed }) => [
                      styles.numpadButtonPortrait,
                      { backgroundColor: palette.overlay20 },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <MaterialCommunityIcons
                      name="backspace-outline"
                      size={scaleBySizeClass(24, sizeClass)}
                      color={palette.modalText}
                    />
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Quick Options - Below main content */}
          {quickOptions && quickOptions.length > 0 && (
            <View style={[styles.quickOptionsContainer]}>
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
              disabled={hasInvalidValue}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.actionButton,
                styles.saveButton,
                { backgroundColor: hasInvalidValue ? palette.overlay15 : palette.accent },
                pressed && !hasInvalidValue && { opacity: 0.8 },
              ]}>
              <Text
                style={[
                  styles.actionButtonText,
                  { color: hasInvalidValue ? palette.modalTextMuted : palette.textOnAccent },
                ]}>
                Save
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      borderRadius: 16,
      borderWidth: 1,
      width: isLandscape ? undefined : '92%',
      maxWidth: isLandscape ? undefined : getSizeClassValue(MODAL_MAX_WIDTH_PICKER, sizeClass),
      paddingHorizontal: isLandscape ? 20 : 14,
      paddingVertical: 16,
      gap: 12,
    },
    header: {
      gap: 6,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontWeight: '700',
    },
    rangeText: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
    helperText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      lineHeight: scaleBySizeClass(16, sizeClass),
    },
    content: {
      flexDirection: isLandscape ? 'row' : 'column',
      alignItems: isLandscape ? 'center' : 'stretch',
      gap: isLandscape ? 24 : 14,
    },
    valueDisplayContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      minWidth: isLandscape ? 120 : 0,
      paddingVertical: isLandscape ? 0 : 8,
      borderBottomWidth: isLandscape ? 0 : 1,
      gap: 6,
    },
    largeValue: {
      fontSize: scaleBySizeClass(isLandscape ? 44 : 38, sizeClass),
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    largeSuffix: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontWeight: '500',
    },
    numpadContainer: {
      gap: 6,
    },
    numpadContainerPortrait: {
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
    numpadButtonPortrait: {
      flex: 1,
      height: 48,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    numpadText: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontWeight: '600',
    },
    quickOptionsContainer: {
      flexDirection: 'row',
      justifyContent: isLandscape ? 'flex-end' : 'flex-start',
      flexWrap: isLandscape ? 'nowrap' : 'wrap',
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
      fontSize: scaleBySizeClass(14, sizeClass),
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
      fontSize: scaleBySizeClass(15, sizeClass),
      fontWeight: '600',
    },
  });
}
