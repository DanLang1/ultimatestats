import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { FlipChoice, FlipResult } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';

interface FlipSelectionProps {
  result: FlipResult | null;
  choice: FlipChoice | null;
  onResultChange: (result: FlipResult | null) => void;
  onChoiceChange: (choice: FlipChoice | null) => void;
}

const RESULT_OPTIONS: { value: FlipResult; label: string }[] = [
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const CHOICE_OPTIONS: { value: FlipChoice; label: string }[] = [
  { value: 'offense', label: 'Offense' },
  { value: 'defense', label: 'Defense' },
  { value: 'side', label: 'Side' },
];

export function FlipSelection({
  result,
  choice,
  onResultChange,
  onChoiceChange,
}: FlipSelectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const handleResultPress = (nextResult: FlipResult) => {
    if (result === nextResult) {
      onResultChange(null);
      onChoiceChange(null);
      return;
    }

    onResultChange(nextResult);
    if (nextResult === 'lost') {
      onChoiceChange(null);
    }
  };

  const handleChoicePress = (nextChoice: FlipChoice) => {
    onChoiceChange(choice === nextChoice ? null : nextChoice);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons
            name="trophy-outline"
            size={scaleBySizeClass(14, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText style={[styles.label, { color: palette.textMuted }]}>FLIP RESULT</ThemedText>
        </View>
        <ThemedText style={[styles.optionalText, { color: palette.textMuted }]}>
          OPTIONAL
        </ThemedText>
      </View>

      <View style={styles.selectionRow}>
        {RESULT_OPTIONS.map((option) => {
          const isSelected = result === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => handleResultPress(option.value)}
              style={({ pressed }) => [
                styles.resultChip,
                {
                  backgroundColor: isSelected ? palette.accent : palette.overlay05,
                  borderColor: isSelected ? palette.accent : palette.overlay20,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                style={[
                  styles.resultChipText,
                  { color: isSelected ? palette.textOnAccent : palette.textMuted },
                ]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {result === 'won' && (
        <View style={styles.choiceRow}>
          <ThemedText style={[styles.choiceLabel, { color: palette.textMuted }]}>CHOSE</ThemedText>
          <View style={styles.choiceChips}>
            {CHOICE_OPTIONS.map((option) => {
              const isSelected = choice === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleChoicePress(option.value)}
                  style={({ pressed }) => [
                    styles.choiceChip,
                    {
                      backgroundColor: isSelected ? palette.accent : palette.overlay05,
                      borderColor: isSelected ? palette.accent : palette.overlay20,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    style={[
                      styles.choiceChipText,
                      { color: isSelected ? palette.textOnAccent : palette.textMuted },
                    ]}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    label: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(1, sizeClass, { rounding: 'none' }),
    },
    optionalText: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: scaleBySizeClass(0.5, sizeClass, { rounding: 'none' }),
    },
    selectionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    resultChip: {
      minWidth: scaleBySizeClass(76, sizeClass),
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 999,
      borderWidth: 1,
    },
    resultChipText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.bold,
    },
    choiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    choiceLabel: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(0.8, sizeClass, { rounding: 'none' }),
    },
    choiceChips: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
    },
    choiceChip: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 7,
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 1,
    },
    choiceChipText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    pressed: {
      opacity: 0.8,
    },
  });
}
