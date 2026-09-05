import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { MatchingType, PlayerRole } from '@/lib/storage/types';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

export interface PlayerChipRestriction {
  accessibilityHint: string;
  onPress: () => void;
}

interface PlayerChipProps {
  name: string;
  number?: string;
  selected?: boolean;
  disabled?: boolean;
  isActive?: boolean;
  matchingType?: MatchingType | null;
  role?: PlayerRole | null;
  subtitle?: string;
  size?: 'default' | 'large';
  compact?: boolean;
  selectionCard?: boolean;
  restriction?: PlayerChipRestriction;
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
  number,
  selected = false,
  disabled = false,
  isActive = true,
  matchingType,
  role,
  subtitle,
  size = 'default',
  compact = false,
  selectionCard = false,
  restriction,
  useModalColors = false,
  onPress,
}: PlayerChipProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const { mmpColor, fmpColor } = useSettingsStore();
  const styles = createStyles(sizeClass);

  const activeColor = getMatchingColor(matchingType, fmpColor, mmpColor, palette.accent);
  const roleColor = getMatchingColor(matchingType, fmpColor, mmpColor, palette.textMuted);

  // Text colors - use luminance-based contrast when selected, modal variants when useModalColors is true
  const selectedTextColor = getContrastingTextColor(activeColor);

  const borderColor = getBorderColor({
    selected,
    matchingType,
    useModalColors,
    activeColor,
    fmpColor,
    mmpColor,
    modalBorderColor: palette.overlay15,
    borderColor: palette.border,
  });
  const textColor = getTextColor({
    selected,
    isActive,
    useModalColors,
    selectedTextColor,
    activeTextColor: palette.textInverse,
    inactiveTextColor: palette.textMuted,
    modalTextColor: palette.modalText,
    modalMutedTextColor: palette.modalTextMuted,
  });
  const subtitleColor = getSubtitleColor(
    selected,
    useModalColors,
    selectedTextColor,
    palette.modalTextMuted,
    palette.textMuted,
  );

  const handlePress = disabled ? undefined : (restriction?.onPress ?? onPress);

  const unselectedBackground = selectionCard ? 'transparent' : palette.overlay12;
  const chipContent = (
    <>
      {number && (
        <ThemedText
          style={[
            getNumberTextStyle({ compact, size, styles }),
            { color: selected ? selectedTextColor : subtitleColor },
          ]}
          numberOfLines={1}>
          #{number}
        </ThemedText>
      )}
      <ThemedText
        style={[
          getChipTextStyle({ compact, size, styles }),
          selectionCard && styles.selectionName,
          { color: textColor },
        ]}
        numberOfLines={selectionCard ? 2 : 1}>
        {name}
      </ThemedText>
      {subtitle && (
        <ThemedText
          style={[
            getSubtitleTextStyle({ compact, size, styles }),
            selectionCard && styles.selectionSubtitle,
            { color: subtitleColor },
          ]}>
          {subtitle}
        </ThemedText>
      )}
    </>
  );

  return (
    <Pressable
      style={({ pressed }) => [
        getChipStyle({ compact, size, styles }),
        selectionCard && styles.selectionCard,
        {
          backgroundColor: selected ? activeColor : unselectedBackground,
          borderColor,
        },
        !isActive && styles.chipInactive,
        disabled && styles.chipDisabled,
        pressed && styles.chipPressed,
      ]}
      testID={`player-chip-${name}`}
      accessibilityRole="button"
      accessibilityLabel={[number ? `#${number}` : undefined, name, subtitle]
        .filter(Boolean)
        .join(', ')}
      accessibilityState={{ disabled, selected }}
      accessibilityHint={restriction?.accessibilityHint}
      onPress={handlePress}
      disabled={disabled}>
      {selectionCard && (
        <MaterialCommunityIcons
          name={selected ? 'check-circle' : 'circle-outline'}
          size={scaleBySizeClass(18, sizeClass)}
          color={textColor}
        />
      )}
      {selectionCard ? <View style={styles.selectionContent}>{chipContent}</View> : chipContent}
      {role && (
        <MaterialCommunityIcons
          name={ROLE_ICONS[role]}
          size={getRoleIconSize({ compact, size, sizeClass })}
          color={selected ? selectedTextColor : roleColor}
          style={styles.roleIcon}
        />
      )}
      {restriction && (
        <MaterialCommunityIcons
          testID={`player-chip-lock-${name}`}
          name="lock"
          size={getRoleIconSize({ compact, size, sizeClass })}
          color={selected ? selectedTextColor : roleColor}
          style={styles.roleIcon}
        />
      )}
    </Pressable>
  );
}

function getMatchingColor(
  matchingType: MatchingType | null | undefined,
  fmpColor: string,
  mmpColor: string,
  fallbackColor: string,
): string {
  if (matchingType === 'fmp') return fmpColor;
  if (matchingType === 'mmp') return mmpColor;
  return fallbackColor;
}

function getBorderColor({
  selected,
  matchingType,
  useModalColors,
  activeColor,
  fmpColor,
  mmpColor,
  modalBorderColor,
  borderColor,
}: {
  selected: boolean;
  matchingType: MatchingType | null | undefined;
  useModalColors: boolean;
  activeColor: string;
  fmpColor: string;
  mmpColor: string;
  modalBorderColor: string;
  borderColor: string;
}): string {
  if (selected) return activeColor;
  if (matchingType === 'mmp') return mmpColor;
  if (matchingType === 'fmp') return fmpColor;
  if (useModalColors) return modalBorderColor;
  return borderColor;
}

function getTextColor({
  selected,
  isActive,
  useModalColors,
  selectedTextColor,
  activeTextColor,
  inactiveTextColor,
  modalTextColor,
  modalMutedTextColor,
}: {
  selected: boolean;
  isActive: boolean;
  useModalColors: boolean;
  selectedTextColor: string;
  activeTextColor: string;
  inactiveTextColor: string;
  modalTextColor: string;
  modalMutedTextColor: string;
}): string {
  if (selected) return selectedTextColor;
  if (isActive) return useModalColors ? modalTextColor : activeTextColor;
  return useModalColors ? modalMutedTextColor : inactiveTextColor;
}

function getSubtitleColor(
  selected: boolean,
  useModalColors: boolean,
  selectedTextColor: string,
  modalMutedTextColor: string,
  textMutedColor: string,
): string {
  if (selected) return selectedTextColor;
  return useModalColors ? modalMutedTextColor : textMutedColor;
}

interface PlayerChipStyleOptions {
  compact: boolean;
  size: 'default' | 'large';
  styles: ReturnType<typeof createStyles>;
}

function getChipStyle({ compact, size, styles }: PlayerChipStyleOptions) {
  if (compact) {
    return styles.chipCompact;
  }
  if (size === 'large') {
    return styles.chipLarge;
  }
  return styles.chip;
}

function getChipTextStyle({ compact, size, styles }: PlayerChipStyleOptions) {
  if (compact) {
    return styles.chipTextCompact;
  }
  if (size === 'large') {
    return styles.chipTextLarge;
  }
  return styles.chipText;
}

function getNumberTextStyle({ compact, size, styles }: PlayerChipStyleOptions) {
  if (compact) {
    return styles.numberTextCompact;
  }
  if (size === 'large') {
    return styles.numberTextLarge;
  }
  return styles.numberText;
}

function getSubtitleTextStyle({ compact, size, styles }: PlayerChipStyleOptions) {
  if (compact) {
    return styles.chipSubtitleCompact;
  }
  if (size === 'large') {
    return styles.chipSubtitleLarge;
  }
  return styles.chipSubtitle;
}

function getRoleIconSize({
  compact,
  size,
  sizeClass,
}: {
  compact: boolean;
  size: 'default' | 'large';
  sizeClass: SizeClass;
}) {
  if (compact) {
    return scaleBySizeClass(10, sizeClass);
  }
  if (size === 'large') {
    return scaleBySizeClass(15, sizeClass);
  }
  return scaleBySizeClass(12, sizeClass);
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    selectionName: { fontSize: scaleBySizeClass(15, sizeClass) },
    selectionSubtitle: { fontSize: scaleBySizeClass(12, sizeClass), marginTop: 3 },
    selectionCard: {
      minHeight: 60,
      borderRadius: 12,
      justifyContent: 'flex-start',
      gap: 8,
      padding: 10,
    },
    selectionContent: { flex: 1, minWidth: 0 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: scaleBySizeClass(8, sizeClass),
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      borderRadius: scaleBySizeClass(20, sizeClass),
      borderWidth: 2,
      gap: scaleBySizeClass(4, sizeClass),
    },
    chipLarge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
      borderRadius: scaleBySizeClass(24, sizeClass),
      borderWidth: 2,
      gap: scaleBySizeClass(6, sizeClass),
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
    numberText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
    },
    chipTextLarge: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    numberTextLarge: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
    chipTextCompact: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    numberTextCompact: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
    },
    chipSubtitle: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    chipSubtitleLarge: {
      fontSize: scaleBySizeClass(13, sizeClass),
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
