import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Participant } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

interface TrackerPlayerChipProps {
  p: Participant;
  discHolderId: string | null;
  oppHasDisc: boolean;
  onTap: (id: string) => void;
}

export const TrackerPlayerChip = ({
  p,
  discHolderId,
  oppHasDisc,
  onTap,
}: TrackerPlayerChipProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const isHolder = discHolderId === p.id;
  const isTargetable = !oppHasDisc && discHolderId !== null && !isHolder;
  const bg = oppHasDisc ? palette.overlay05 : isHolder ? palette.accent + '25' : palette.glassBg;
  const border = oppHasDisc ? palette.overlay15 : isHolder ? palette.accent : palette.overlay20;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        {
          width: scaleBySizeClass(92, sizeClass),
          height: scaleBySizeClass(92, sizeClass),
          backgroundColor: bg,
          borderColor: border,
          borderWidth: isHolder ? 2 : 1,
        },
        isHolder && { boxShadow: `0 0 20px ${palette.accent}50` },
        !oppHasDisc && isTargetable && { opacity: 1, backgroundColor: palette.overlay08 },
        !oppHasDisc && !isTargetable && !isHolder && { opacity: 0.5 },
        pressed && !oppHasDisc && { opacity: 0.8, transform: [{ scale: 0.96 }] },
      ]}
      onPress={() => onTap(p.id)}>
      <ThemedText
        style={[
          styles.chipText,
          {
            fontSize: scaleBySizeClass(14, sizeClass),
            color: oppHasDisc ? palette.textMuted : isHolder ? palette.accent : palette.textInverse,
          },
        ]}
        numberOfLines={2}>
        {p.name}
      </ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: 24,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  chipText: {
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
  },
});
