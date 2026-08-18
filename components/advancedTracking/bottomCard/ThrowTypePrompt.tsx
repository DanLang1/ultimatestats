import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { ThrowType } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';

const OPTIONS: { type: ThrowType; label: string; testID: string }[] = [
  { type: 'huck', label: 'HUCK', testID: 'throw-type-huck' },
  {
    type: 'backfield_reset',
    label: 'BACKFIELD',
    testID: 'throw-type-backfield-reset',
  },
];

interface ThrowTypePromptProps {
  accentColor: string;
  value?: ThrowType;
  onChange: (value: ThrowType | undefined) => void;
}

export function ThrowTypePrompt({ accentColor, value, onChange }: ThrowTypePromptProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.container}>
      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const isSelected = value === option.type;
          return (
            <Pressable
              key={option.type}
              testID={option.testID}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(isSelected ? undefined : option.type)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: palette.overlay05,
                  borderColor: isSelected ? accentColor : palette.overlay12,
                },
                pressed && { opacity: 0.7 },
              ]}>
              <MaterialCommunityIcons
                name="tag-outline"
                size={scaleBySizeClass(12, sizeClass)}
                color={isSelected ? accentColor : palette.textMuted}
              />
              <ThemedText
                numberOfLines={1}
                style={[
                  styles.optionLabel,
                  { color: isSelected ? accentColor : palette.textMuted },
                ]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: scaleBySizeClass(4, sizeClass),
      flexWrap: 'wrap',
    },
    options: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(10, sizeClass),
      flexShrink: 1,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(4, sizeClass),
      minHeight: scaleBySizeClass(28, sizeClass),
      justifyContent: 'center',
      borderRadius: 9,
      borderWidth: 1,
      paddingHorizontal: scaleBySizeClass(7, sizeClass),
    },
    optionLabel: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(9, sizeClass),
      letterSpacing: 0.35,
    },
  });
}
