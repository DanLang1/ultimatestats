import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SegmentOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  disabled,
}: SegmentedControlProps) {
  const { palette } = useTheme();

  return (
    <View>
      {label && (
        <Text style={[styles.label, { color: palette.textMuted }]}>
          {disabled && <MaterialCommunityIcons name="lock" size={10} color={palette.textMuted} />}{' '}
          {label}
        </Text>
      )}
      <View style={styles.container}>
        {options.map((option, index) => {
          const isFirst = index === 0;
          const isLast = index === options.length - 1;
          const isActive = value === option.value;

          return (
            <Pressable
              key={option.value}
              style={[
                styles.button,
                { backgroundColor: palette.overlay08, borderColor: palette.overlay20 },
                isFirst && styles.buttonFirst,
                isLast && styles.buttonLast,
                !isFirst && !isLast && styles.buttonMiddle,
                isActive && [
                  styles.buttonActive,
                  { backgroundColor: palette.accent, borderColor: palette.accent },
                ],
                disabled && styles.buttonDisabled,
              ]}
              onPress={() => onChange(option.value)}
              disabled={disabled}>
              <Text
                style={[
                  styles.buttonText,
                  { color: palette.textMuted },
                  isActive && [styles.buttonTextActive, { color: palette.textInverse }],
                ]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    // color: palette.textMuted, // Dynamic
    marginBottom: 6,
  },
  container: {
    flexDirection: 'row',
    height: 48,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor: palette.overlay08, // Dynamic
    borderWidth: 1,
    // borderColor: palette.overlay20, // Dynamic
  },
  buttonFirst: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderRightWidth: 0,
  },
  buttonMiddle: {
    borderRightWidth: 0,
  },
  buttonLast: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  buttonActive: {
    // backgroundColor: palette.accent, // Dynamic
    // borderColor: palette.accent, // Dynamic
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    // color: palette.textMuted, // Dynamic
  },
  buttonTextActive: {
    // color: palette.textInverse, // Dynamic
  },
});
