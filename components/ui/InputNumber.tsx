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
          <MaterialCommunityIcons name="lock" size={14} color="#999" style={{ marginRight: 4 }} />
        )}
        <Text style={[styles.label, labelStyle, !editable && styles.disabledLabel]}>{label}</Text>
      </View>
      <TextInput
        keyboardType="numeric"
        style={[styles.input, inputStyle, !editable && styles.disabledInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
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
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
  },
  label: {
    fontSize: 14,
    color: '#333',
  },
  input: {
    width: 60,
    textAlign: 'right',
    color: 'black',
    fontSize: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledContainer: {
    backgroundColor: '#f2f2f2',
    borderColor: '#eee',
    opacity: 0.8,
  },
  disabledLabel: {
    color: '#999',
  },
  disabledInput: {
    color: '#aaa',
  },
});
