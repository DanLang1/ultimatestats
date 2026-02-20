import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { MatchingType, PlayerRole } from '@/lib/storage/types';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface PlayerChipProps {
  name: string;
  selected?: boolean;
  disabled?: boolean;
  isActive?: boolean;
  matchingType?: MatchingType | null;
  role?: PlayerRole | null;
  subtitle?: string;
  compact?: boolean;
  /** Use modal-appropriate colors (modalText, modalTextMuted) */
  useModalColors?: boolean;
  sizeClass?: SizeClass;
  onPress: () => void;
}

// Use a specific type for icon names to avoid 'any' casts
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ROLE_ICONS: Record<PlayerRole, IconName> = {
  handler: 'bullseye-arrow',
  cutter: 'shoe-print',
  hybrid: 'star-three-points',
};

export function PlayerChip({
  name,
  selected = false,
  disabled = false,
  isActive = true,
  matchingType,
  role,
  subtitle,
  compact = false,
  useModalColors = false,
  sizeClass = 'small',
  onPress,
}: PlayerChipProps) {
  const { palette } = useTheme();
  const { mmpColor, fmpColor } = useSettingsStore();
  const styles = createStyles(sizeClass);

  const activeColor =
    matchingType === 'fmp' ? fmpColor : matchingType === 'mmp' ? mmpColor : palette.accent;

  const roleColor =
    matchingType === 'fmp' ? fmpColor : matchingType === 'mmp' ? mmpColor : palette.textMuted;

  const borderColor = selected
    ? activeColor
    : matchingType === 'mmp'
      ? mmpColor
      : matchingType === 'fmp'
        ? fmpColor
        : useModalColors
          ? palette.overlay15
          : palette.border;

  // Text colors - use luminance-based contrast when selected, modal variants when useModalColors is true
  const selectedTextColor = getContrastingTextColor(activeColor);

  const textColor = selected
    ? selectedTextColor
    : isActive
      ? useModalColors
        ? palette.modalText
        : palette.textInverse
      : useModalColors
        ? palette.modalTextMuted
        : palette.textMuted;

  const subtitleColor = selected
    ? selectedTextColor
    : useModalColors
      ? palette.modalTextMuted
      : palette.textMuted;

  return (
    <Pressable
      style={({ pressed }) => [
        compact ? styles.chipCompact : styles.chip,
        {
          backgroundColor: selected ? activeColor : palette.overlay12,
          borderColor,
        },
        !isActive && styles.chipInactive,
        disabled && styles.chipDisabled,
        pressed && styles.chipPressed,
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}>
      <Text
        style={[compact ? styles.chipTextCompact : styles.chipText, { color: textColor }]}
        numberOfLines={1}>
        {name}
      </Text>
      {subtitle && (
        <Text
          style={[
            compact ? styles.chipSubtitleCompact : styles.chipSubtitle,
            { color: subtitleColor },
          ]}>
          {subtitle}
        </Text>
      )}
      {role && (
        <MaterialCommunityIcons
          name={ROLE_ICONS[role]}
          size={compact ? scaleBySizeClass(10, sizeClass) : scaleBySizeClass(12, sizeClass)}
          color={selected ? selectedTextColor : roleColor}
          style={styles.roleIcon}
        />
      )}
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: scaleBySizeClass(8, sizeClass),
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      borderRadius: scaleBySizeClass(20, sizeClass),
      borderWidth: 2,
      gap: scaleBySizeClass(4, sizeClass),
    },
    chipCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: scaleBySizeClass(6, sizeClass),
      paddingHorizontal: scaleBySizeClass(10, sizeClass),
      borderRadius: scaleBySizeClass(16, sizeClass),
      borderWidth: 1.5,
      gap: scaleBySizeClass(3, sizeClass),
    },
    chipInactive: {
      opacity: 0.5,
    },
    chipDisabled: {
      opacity: 0.4,
    },
    chipPressed: {
      opacity: 0.8,
    },
    chipText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontWeight: '500',
    },
    chipTextCompact: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontWeight: '500',
    },
    chipSubtitle: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
    },
    chipSubtitleCompact: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '600',
    },
    roleIcon: {
      marginTop: scaleBySizeClass(2, sizeClass),
    },
  });
}
