import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts, Palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export type BottomSheetActionRowTone = 'accent' | 'danger' | 'success' | 'warning';

interface BottomSheetActionRowProps {
  testID: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description?: string;
  trailingIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: BottomSheetActionRowTone;
  disabled?: boolean;
  onPress: () => void;
}

export function BottomSheetActionRow({
  testID,
  icon,
  label,
  description,
  trailingIcon,
  tone = 'accent',
  disabled = false,
  onPress,
}: BottomSheetActionRowProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const colors = getToneColors(tone, palette);

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        pressed && !disabled && { backgroundColor: palette.overlay08 },
        disabled && styles.disabled,
      ]}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name={icon}
          size={scaleBySizeClass(22, sizeClass)}
          color={colors.icon}
        />
      </View>
      <View style={styles.textBlock}>
        <ThemedText style={[styles.label, { color: palette.textInverse }]}>{label}</ThemedText>
        {description && (
          <ThemedText style={[styles.description, { color: palette.textMuted }]}>
            {description}
          </ThemedText>
        )}
      </View>
      {trailingIcon && (
        <MaterialCommunityIcons
          name={trailingIcon}
          size={scaleBySizeClass(22, sizeClass)}
          color={palette.textMuted}
        />
      )}
    </Pressable>
  );
}

function getToneColors(tone: BottomSheetActionRowTone, palette: Palette) {
  if (tone === 'danger') {
    return { icon: palette.danger };
  }

  if (tone === 'success') {
    return { icon: palette.success };
  }

  if (tone === 'warning') {
    return { icon: palette.warning };
  }

  return { icon: palette.accent };
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 11,
      minHeight: scaleBySizeClass(50, sizeClass),
    },
    disabled: {
      opacity: 0.45,
    },
    iconWrap: {
      width: scaleBySizeClass(30, sizeClass),
      height: scaleBySizeClass(30, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    textBlock: {
      flex: 1,
      gap: 3,
    },
    label: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    description: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.regular,
      lineHeight: scaleBySizeClass(16, sizeClass),
    },
  });
}
