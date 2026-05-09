import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { MatchingType, PlayerRole } from '@/lib/storage/types';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

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
  onPress,
}: PlayerChipProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const { mmpColor, fmpColor } = useSettingsStore();
  const styles = createStyles(sizeClass);

  let activeColor: string;
  if (matchingType === 'fmp') {
    activeColor = fmpColor;
  } else if (matchingType === 'mmp') {
    activeColor = mmpColor;
  } else {
    activeColor = palette.accent;
  }

  let roleColor: string;
  if (matchingType === 'fmp') {
    roleColor = fmpColor;
  } else if (matchingType === 'mmp') {
    roleColor = mmpColor;
  } else {
    roleColor = palette.textMuted;
  }

  // Text colors - use luminance-based contrast when selected, modal variants when useModalColors is true
  const selectedTextColor = getContrastingTextColor(activeColor);

  let borderColor: string;
  if (selected) {
    borderColor = activeColor;
  } else if (matchingType === 'mmp') {
    borderColor = mmpColor;
  } else if (matchingType === 'fmp') {
    borderColor = fmpColor;
  } else if (useModalColors) {
    borderColor = palette.overlay15;
  } else {
    borderColor = palette.border;
  }

  let textColor: string;
  if (selected) {
    textColor = selectedTextColor;
  } else if (isActive) {
    textColor = useModalColors ? palette.modalText : palette.textInverse;
  } else {
    textColor = useModalColors ? palette.modalTextMuted : palette.textMuted;
  }

  let subtitleColor: string;
  if (selected) {
    subtitleColor = selectedTextColor;
  } else {
    subtitleColor = useModalColors ? palette.modalTextMuted : palette.textMuted;
  }

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
      testID={`player-chip-${name}`}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}>
      <ThemedText
        style={[compact ? styles.chipTextCompact : styles.chipText, { color: textColor }]}
        numberOfLines={1}>
        {name}
      </ThemedText>
      {subtitle && (
        <ThemedText
          style={[
            compact ? styles.chipSubtitleCompact : styles.chipSubtitle,
            { color: subtitleColor },
          ]}>
          {subtitle}
        </ThemedText>
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
      fontFamily: Fonts.semiBold,
    },
    chipTextCompact: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    chipSubtitle: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    chipSubtitleCompact: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    roleIcon: {
      marginTop: scaleBySizeClass(2, sizeClass),
    },
  });
}
