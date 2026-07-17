import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface TutorialAdvancedCompleteInlineProps {
  buttonLabel: string;
  onFinish: () => void;
}

export default function TutorialAdvancedCompleteInline({
  buttonLabel,
  onFinish,
}: TutorialAdvancedCompleteInlineProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="check-circle-outline"
        size={scaleBySizeClass(56, sizeClass)}
        color={palette.success}
      />
      <ThemedText style={[styles.title, { color: palette.textInverse }]}>
        Advanced Tutorial Complete
      </ThemedText>
      <ThemedText style={[styles.body, { color: palette.textMuted }]}>
        Swipe up for goal, down for drops or throwaways
      </ThemedText>
      <Pressable
        onPress={onFinish}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: palette.accent },
          pressed && { opacity: 0.75 },
        ]}>
        <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
          {buttonLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function createStyles(sizeClass: 'small' | 'medium' | 'large') {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: scaleBySizeClass(12, sizeClass),
    },
    title: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(22, sizeClass),
      textAlign: 'center',
    },
    body: {
      fontFamily: Fonts.regular,
      fontSize: scaleBySizeClass(14, sizeClass),
      lineHeight: scaleBySizeClass(20, sizeClass),
      textAlign: 'center',
      maxWidth: 480,
    },
    button: {
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 24,
      marginTop: 4,
    },
    buttonText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(14, sizeClass),
    },
  });
}
