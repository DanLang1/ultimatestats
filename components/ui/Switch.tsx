import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, SizeClass } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Platform, Switch as RNSwitch, StyleSheet, Text, View } from 'react-native';

interface SwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  locked?: boolean;
  sizeClass?: SizeClass;
}

export function Switch({
  label,
  value,
  onValueChange,
  disabled,
  locked,
  sizeClass = 'small',
}: SwitchProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const lockIconSize = getSizeClassValue({ small: 10, medium: 11, large: 12 }, sizeClass);
  const switchScale =
    Platform.OS === 'ios'
      ? getSizeClassValue({ small: 0.8, medium: 0.9, large: 1.0 }, sizeClass)
      : getSizeClassValue({ small: 1, medium: 1.12, large: 1.2 }, sizeClass);

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <Text style={[styles.label, { color: palette.textMuted }]}>
        {locked && (
          <MaterialCommunityIcons
            name="lock"
            size={lockIconSize}
            color={palette.textMuted}
            style={styles.lockIcon}
          />
        )}
        {locked ? ' ' : ''}
        {label}
      </Text>
      <View style={styles.switchWrapper}>
        <RNSwitch
          style={{ transform: [{ scale: switchScale }] }}
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

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: getSizeClassValue({ small: 12, medium: 14, large: 16 }, sizeClass),
      height: getSizeClassValue({ small: 48, medium: 54, large: 58 }, sizeClass),
      paddingHorizontal: getSizeClassValue({ small: 4, medium: 6, large: 8 }, sizeClass), // Align with input text visually
    },
    label: {
      fontSize: getSizeClassValue({ small: 10, medium: 11, large: 12 }, sizeClass),
      fontWeight: '700',
      letterSpacing: getSizeClassValue({ small: 1, medium: 1.05, large: 1.1 }, sizeClass),
      textTransform: 'uppercase',
    },
    lockIcon: {
      marginRight: getSizeClassValue({ small: 4, medium: 5, large: 6 }, sizeClass),
    },
    switchWrapper: {
      // No extra wrapper styling needed for horizontal layout
    },
    disabled: {
      opacity: 0.5,
    },
  });
}
