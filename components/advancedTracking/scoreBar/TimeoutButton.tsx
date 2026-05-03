import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { canCallTimeout, SideTimeoutState } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface TimeoutButtonProps {
  label: string;
  state: SideTimeoutState;
  color: string;
  onPress: () => void;
}

export function TimeoutButton({ label, state, color, onPress }: TimeoutButtonProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const canUse = canCallTimeout(state);
  const styles = createStyles(sizeClass);

  return (
    <Pressable
      onPress={onPress}
      disabled={!canUse}
      style={({ pressed }) => [styles.action, pressed && canUse && { opacity: 0.7 }]}>
      <View style={[styles.iconCircle, { borderColor: color }]}>
        <MaterialCommunityIcons name="pause" size={scaleBySizeClass(18, sizeClass)} color={color} />
      </View>
      <ThemedText
        style={[styles.actionLabel, { color: canUse ? palette.textInverse : palette.textMuted }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    action: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 14,
    },
    iconCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
    },
  });
}
