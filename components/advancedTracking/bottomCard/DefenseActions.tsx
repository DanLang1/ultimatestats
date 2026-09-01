import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface DefenseActionsProps {
  onOppScored: () => void;
  onOppTurnover: () => void;
}

export const DefenseActions = ({ onOppScored, onOppTurnover }: DefenseActionsProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.row}>
      <Pressable
        testID="defense-opp-goal"
        onPress={onOppScored}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: palette.dangerOverlay10,
            borderColor: palette.dangerOverlay15,
          },
          pressed && { opacity: 0.7 },
        ]}>
        <MaterialCommunityIcons
          name="cancel"
          size={scaleBySizeClass(24, sizeClass)}
          color={palette.danger}
          style={styles.icon}
        />
        <ThemedText numberOfLines={1} style={[styles.btnText, { color: palette.danger }]}>
          OPP GOAL
        </ThemedText>
      </Pressable>
      <Pressable
        testID="defense-opp-turn"
        onPress={onOppTurnover}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: palette.overlay08,
            borderColor: palette.overlay10,
          },
          pressed && { opacity: 0.7 },
        ]}>
        <MaterialCommunityIcons
          name="swap-horizontal"
          size={scaleBySizeClass(24, sizeClass)}
          color={palette.textInverse}
          style={styles.icon}
        />
        <ThemedText numberOfLines={1} style={[styles.btnText, { color: palette.textInverse }]}>
          OPP TURN
        </ThemedText>
      </Pressable>
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      flex: 1,
      flexDirection: 'row',
      gap: scaleBySizeClass(12, sizeClass),
    },
    btn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: scaleBySizeClass(62, sizeClass),
      borderRadius: 16,
      borderCurve: 'continuous',
      borderWidth: 1,
    },
    icon: {
      marginRight: 8,
    },
    btnText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(14, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  });
}
