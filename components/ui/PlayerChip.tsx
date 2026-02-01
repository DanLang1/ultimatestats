import { useTheme } from '@/context/ThemeContext';
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
  showCheckIcon?: boolean;
  compact?: boolean;
  /** Use modal-appropriate colors (modalText, modalTextMuted) */
  useModalColors?: boolean;
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
  showCheckIcon = false,
  compact = false,
  useModalColors = false,
  onPress,
}: PlayerChipProps) {
  const { palette } = useTheme();
  const { mmpColor, fmpColor } = useSettingsStore();

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
      {showCheckIcon && selected && (
        <MaterialCommunityIcons
          name="check"
          size={compact ? 12 : 14}
          color={selectedTextColor}
          style={styles.checkIcon}
        />
      )}
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
      {role && !selected && (
        <MaterialCommunityIcons
          name={ROLE_ICONS[role]}
          size={compact ? 10 : 12}
          color={roleColor}
          style={styles.roleIcon}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
    gap: 4,
  },
  chipCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 3,
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
    fontSize: 15,
    fontWeight: '500',
  },
  chipTextCompact: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  chipSubtitleCompact: {
    fontSize: 10,
    fontWeight: '600',
  },
  checkIcon: {
    marginRight: 2,
  },
  roleIcon: {
    marginTop: 2,
  },
});
