import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';

interface GameSelectionCheckboxProps {
  isSelected: boolean;
  isSelectable: boolean;
}

/** The leading checkbox of a game row in selection mode. */
export default function GameSelectionCheckbox({
  isSelected,
  isSelectable,
}: GameSelectionCheckboxProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

  return (
    <View
      style={[
        styles.checkbox,
        { borderColor: isSelectable ? palette.overlay20 : palette.overlay10 },
        isSelected && { backgroundColor: palette.accent, borderColor: palette.accent },
      ]}>
      {isSelected && (
        <MaterialCommunityIcons
          name="check"
          size={scaleBySizeClass(14, sizeClass)}
          color={palette.textOnAccent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
