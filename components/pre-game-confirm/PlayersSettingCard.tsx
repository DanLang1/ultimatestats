import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EditableSettingCard } from '@/components/pre-game-confirm/EditableSettingCard';
import { ThemedText } from '@/components/ThemedText';
import { AlertModal } from '@/components/ui/AlertModal';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

const LINE_SIZE_OPTIONS = [2, 3, 4, 5, 6, 7];

interface PlayersSettingCardProps {
  lineSize: number;
  onChange: (lineSize: number) => void;
}

/** Pre-game Players tile; opens a picker limited to the line sizes a game can use. */
export function PlayersSettingCard({ lineSize, onChange }: PlayersSettingCardProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const [draftLineSize, setDraftLineSize] = useState<number | null>(null);

  const isPickerOpen = draftLineSize !== null;
  const shownLineSize = draftLineSize ?? lineSize;
  const shownFormat = `${shownLineSize}v${shownLineSize}`;

  const handleSave = () => {
    onChange(shownLineSize);
    setDraftLineSize(null);
  };

  return (
    <>
      <EditableSettingCard
        icon="account-multiple-outline"
        label="Players"
        onPress={() => setDraftLineSize(lineSize)}>
        <ThemedText style={[styles.value, { color: palette.textInverse }]}>
          {lineSize}v{lineSize}
        </ThemedText>
      </EditableSettingCard>

      <AlertModal visible={isPickerOpen} title="Players" onClose={() => setDraftLineSize(null)}>
        <View style={styles.content}>
          <ThemedText
            testID="line-size-summary"
            style={[styles.summary, { color: palette.textInverse }]}>
            {shownFormat}
          </ThemedText>

          <View style={[styles.optionRow, { backgroundColor: palette.overlay05 }]}>
            {LINE_SIZE_OPTIONS.map((option) => {
              const isSelected = option === shownLineSize;
              return (
                <Pressable
                  key={option}
                  testID={`line-size-option-${option}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${option} players per side`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setDraftLineSize(option)}
                  style={[styles.option, isSelected && { backgroundColor: palette.accent }]}>
                  <ThemedText
                    style={[
                      styles.optionText,
                      isSelected
                        ? { color: palette.textOnAccent, fontFamily: Fonts.bold }
                        : { color: palette.textInverse },
                    ]}>
                    {option}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            testID="line-size-save"
            accessibilityRole="button"
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: palette.accent },
              pressed && styles.saveButtonPressed,
            ]}>
            <ThemedText style={[styles.saveText, { color: palette.textOnAccent }]}>
              Use {shownFormat}
            </ThemedText>
          </Pressable>
        </View>
      </AlertModal>
    </>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    value: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
      marginTop: 1,
    },
    content: {
      gap: 16,
    },
    summary: {
      fontSize: scaleBySizeClass(34, sizeClass),
      lineHeight: scaleBySizeClass(40, sizeClass),
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
    },
    optionRow: {
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      borderRadius: 12,
    },
    option: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8,
    },
    optionText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontVariant: ['tabular-nums'],
    },
    saveButton: {
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    saveButtonPressed: {
      transform: [{ scale: 0.98 }],
    },
    saveText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.bold,
    },
  });
}
