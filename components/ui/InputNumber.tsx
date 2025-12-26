import { useTheme } from '@/context/ThemeContext';
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
  const { palette } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: palette.overlay15,
          backgroundColor: palette.overlay08,
        },
        containerStyle,
        !editable && {
          backgroundColor: palette.overlay02,
          borderColor: palette.overlay05,
          opacity: 0.8,
        },
      ]}>
      <View style={styles.labelContainer}>
        {!editable && (
          <MaterialCommunityIcons
            name="lock"
            size={14}
            color={palette.textMuted}
            style={{ marginRight: 4 }}
          />
        )}
        <Text
          style={[
            styles.label,
            { color: palette.textPrimary },
            labelStyle,
            !editable && { color: palette.textMuted },
          ]}>
          {label}
        </Text>
      </View>
      <TextInput
        keyboardType="numeric"
        style={[
          styles.input,
          { color: palette.textPrimary },
          inputStyle,
          !editable && { color: palette.textMuted },
        ]}
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
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 14,
  },
  input: {
    width: 60,
    textAlign: 'right',
    fontSize: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledContainer: {
    opacity: 0.8,
  },
  disabledLabel: {},
  disabledInput: {},
});
