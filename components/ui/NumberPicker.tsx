import { useTheme } from '@/context/ThemeContext';
import { useNumberPickerStore } from '@/store/numberPickerStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface NumberPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  disabled?: boolean;
  suffix?: string;
  quickOptions?: number[];
  placeholder?: string;
}

export function NumberPicker({
  value,
  onChange,
  min = 0,
  max = 999,
  label,
  disabled = false,
  suffix,
  quickOptions,
  placeholder = '0',
}: NumberPickerProps) {
  const { palette } = useTheme();
  const openPicker = useNumberPickerStore((s) => s.open);

  const handleOpen = () => {
    if (disabled) return;

    openPicker({
      value,
      min,
      max,
      label: label || 'Select Value',
      suffix,
      quickOptions,
      onChange,
    });
    router.push('/NumberPickerModal');
  };

  const displayValue = value ? value.toString() : '';

  return (
    <View>
      {label && (
        <Text style={[styles.label, { color: palette.textMuted }]}>
          {disabled && <MaterialCommunityIcons name="lock" size={10} color={palette.textMuted} />}{' '}
          {label}
        </Text>
      )}

      <Pressable
        onPress={handleOpen}
        style={[
          styles.trigger,
          {
            backgroundColor: palette.overlay08,
            borderColor: palette.overlay20,
          },
          disabled && styles.disabled,
        ]}>
        <Text
          style={[
            styles.triggerText,
            { color: displayValue ? palette.textInverse : palette.textMuted },
          ]}>
          {displayValue || placeholder}
        </Text>
        {suffix && (
          <View style={[styles.suffixContainer, { borderColor: palette.overlay20 }]}>
            <Text style={[styles.suffixText, { color: palette.textMuted }]}>{suffix}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  trigger: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.5,
  },
  triggerText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  suffixContainer: {
    height: '100%',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderLeftWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  suffixText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
