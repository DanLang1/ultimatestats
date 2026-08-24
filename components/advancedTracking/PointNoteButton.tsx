import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';

interface PointNoteButtonProps {
  hasNote: boolean;
  onPress: () => void;
  buttonStyle: StyleProp<ViewStyle>;
  testID: string;
}

export function PointNoteButton({ hasNote, onPress, buttonStyle, testID }: PointNoteButtonProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={hasNote ? 'Edit point note' : 'Add point note'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonStyle,
        {
          borderColor: hasNote ? palette.accent : palette.overlay20,
          backgroundColor: hasNote ? palette.accentOverlay10 : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      <MaterialCommunityIcons
        name={hasNote ? 'note-edit-outline' : 'note-plus-outline'}
        size={scaleBySizeClass(22, sizeClass)}
        color={hasNote ? palette.accent : palette.textInverse}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
