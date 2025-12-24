import { palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';

interface InputNumberProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  editable?: boolean;
}

export function InputNumber({
  label,
  value,
  onChangeText,
  placeholder,
  containerStyle,
  inputStyle,
  labelStyle,
  editable = true,
}: InputNumberProps) {
  return (
    <View style={[styles.container, containerStyle, !editable && styles.disabledContainer]}>
      <View style={styles.labelContainer}>
        {!editable && (
          <MaterialCommunityIcons
            name="lock"
            size={14}
            color={palette.textMuted}
            style={{ marginRight: 4 }}
          />
        )}
        <Text style={[styles.label, labelStyle, !editable && styles.disabledLabel]}>{label}</Text>
      </View>
      <TextInput
        keyboardType="numeric"
        style={[styles.input, inputStyle, !editable && styles.disabledInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        editable={editable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 45,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: palette.inputBg,
  },
  label: {
    fontSize: 14,
    color: palette.textPrimary,
  },
  input: {
    width: 60,
    textAlign: 'right',
    color: palette.textPrimary,
    fontSize: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledContainer: {
    backgroundColor: palette.cardBgAlt,
    borderColor: palette.borderLight,
    opacity: 0.8,
  },
  disabledLabel: {
    color: palette.textMuted,
  },
  disabledInput: {
    color: palette.disabled,
  },
});
