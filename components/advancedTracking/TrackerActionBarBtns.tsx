import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

interface BtnProps {
  onPress: () => void;
  isLandscape?: boolean;
}

export const TrackerUndoBtn = ({ onPress, isLandscape = false }: BtnProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass, isLandscape);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionBtn,
        { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}>
      <ThemedText style={[styles.actionBtnText, { color: palette.textInverse }]}>UNDO</ThemedText>
    </Pressable>
  );
};

export const TrackerMoreBtn = ({ onPress, isLandscape = false }: BtnProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass, isLandscape);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.moreBtn,
        { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}>
      <ThemedText style={[styles.actionBtnText, { color: palette.textMuted }]}>•••</ThemedText>
    </Pressable>
  );
};

function createStyles(sizeClass: SizeClass, isLandscape: boolean) {
  return StyleSheet.create({
    actionBtn: {
      flex: 1,
      paddingVertical: isLandscape ? 6 : 18,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderRadius: 20,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreBtn: {
      paddingVertical: isLandscape ? 6 : 18,
      paddingHorizontal: isLandscape ? 10 : 14,
      borderWidth: 1,
      borderRadius: 20,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnText: {
      fontFamily: Fonts.black,
      letterSpacing: 1,
      fontSize: scaleBySizeClass(13, sizeClass),
      textAlign: 'center',
    },
  });
}
