import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SegmentOption {
  value: string;
  label: string;
  activeColor?: string;
  activeTextColor?: string;
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
      <View
        style={[
          styles.container,
          { borderColor: palette.overlay20, backgroundColor: palette.overlay08 },
        ]}>
        {options.map((option, index) => {
          const isFirst = index === 0;
          const isActive = value === option.value;

          return (
            <React.Fragment key={option.value}>
              {!isFirst && (
                <View style={[styles.separator, { backgroundColor: palette.overlay20 }]} />
              )}
              <Pressable
                style={[
                  styles.button,
                  isActive && { backgroundColor: option.activeColor ?? palette.accent },
                  disabled && styles.buttonDisabled,
                ]}
                onPress={() => onChange(option.value)}
                disabled={disabled}>
                <Text
                  style={[
                    styles.buttonText,
                    { color: palette.textMuted },
                    isActive && { color: option.activeTextColor ?? palette.textOnAccent },
                  ]}
                  numberOfLines={1}>
                  {option.label}
                </Text>
              </Pressable>
            </React.Fragment>
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
    marginBottom: 6,
  },
  container: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  separator: {
    width: 1,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
