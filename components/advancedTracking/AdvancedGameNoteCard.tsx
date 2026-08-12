import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface AdvancedGameNoteCardProps {
  note?: string;
  onPress: () => void;
}

export function AdvancedGameNoteCard({ note, onPress }: AdvancedGameNoteCardProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const hasNote = Boolean(note?.trim());

  return (
    <Pressable
      testID="advanced-game-note-card"
      accessibilityRole="button"
      accessibilityLabel={hasNote ? 'Edit game note' : 'Add game note'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
        pressed && styles.pressed,
      ]}>
      <View style={styles.headingRow}>
        <ThemedText style={[styles.label, { color: palette.textMuted }]}>GAME NOTES</ThemedText>
        <MaterialCommunityIcons
          name={hasNote ? 'pencil-outline' : 'plus'}
          size={scaleBySizeClass(20, sizeClass)}
          color={palette.accent}
        />
      </View>
      <ThemedText
        numberOfLines={hasNote ? 6 : undefined}
        ellipsizeMode="tail"
        style={[styles.note, { color: hasNote ? palette.textInverse : palette.textMuted }]}>
        {hasNote ? note : 'Add a private note about this game.'}
      </ThemedText>
      {hasNote ? (
        <View style={styles.viewAction}>
          <ThemedText style={[styles.viewActionText, { color: palette.accent }]}>
            View & edit
          </ThemedText>
          <MaterialCommunityIcons
            name="arrow-expand"
            size={scaleBySizeClass(13, sizeClass)}
            color={palette.accent}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 9,
    },
    pressed: {
      opacity: 0.8,
    },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    label: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
    note: {
      fontSize: scaleBySizeClass(15, sizeClass),
      lineHeight: scaleBySizeClass(21, sizeClass),
      fontFamily: Fonts.regular,
    },
    viewAction: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      gap: 5,
    },
    viewActionText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
