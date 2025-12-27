import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Switch as RNSwitch, StyleSheet, Text, View } from 'react-native';

interface SwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  locked?: boolean;
}

export function Switch({ label, value, onValueChange, disabled, locked }: SwitchProps) {
  const { palette } = useTheme();

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <Text style={[styles.label, { color: palette.textMuted }]}>
        {locked && (
          <MaterialCommunityIcons
            name="lock"
            size={10}
            color={palette.textMuted}
            style={styles.lockIcon}
          />
        )}
        {locked ? ' ' : ''}
        {label}
      </Text>
      <View style={styles.switchWrapper}>
        <RNSwitch
          trackColor={{
            false: palette.overlay20,
            true: disabled ? palette.textMuted : palette.accent,
          }}
          thumbColor={
            value ? (disabled ? palette.textMuted : palette.textOnAccent) : palette.textMuted
          }
          onValueChange={onValueChange}
          value={value}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    height: 48,
    paddingHorizontal: 4, // Align with input text visually
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  lockIcon: {
    marginRight: 4,
  },
  switchWrapper: {
    // No extra wrapper styling needed for horizontal layout
  },
  disabled: {
    opacity: 0.5,
  },
});
