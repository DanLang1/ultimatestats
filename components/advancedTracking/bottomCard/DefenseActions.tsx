import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

import { getFooterActionHeight } from './constants';

interface DefenseActionsProps {
  onOppScored: () => void;
  onOppTurnover: () => void;
}

export const DefenseActions = ({ onOppScored, onOppTurnover }: DefenseActionsProps) => {
  const { palette } = useTheme();
  const { sizeClass, isCompactHeight } = useLayout();
  const styles = createStyles(sizeClass, isCompactHeight);

  return (
    <View style={styles.row}>
      <Pressable
        testID="defense-opp-goal"
        onPress={onOppScored}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: palette.danger,
            borderColor: palette.danger,
          },
          pressed && { opacity: 0.7 },
        ]}>
        <MaterialCommunityIcons
          name="cancel"
          size={scaleBySizeClass(24, sizeClass)}
          color={palette.textOnAccent}
          style={styles.icon}
        />
        <ThemedText numberOfLines={1} style={[styles.btnText, { color: palette.textOnAccent }]}>
          OPP GOAL
        </ThemedText>
      </Pressable>
      <Pressable
        testID="defense-opp-turn"
        onPress={onOppTurnover}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: palette.success,
            borderColor: palette.success,
          },
          pressed && { opacity: 0.7 },
        ]}>
        <MaterialCommunityIcons
          name="swap-horizontal"
          size={scaleBySizeClass(24, sizeClass)}
          color={palette.textOnAccent}
          style={styles.icon}
        />
        <ThemedText numberOfLines={1} style={[styles.btnText, { color: palette.textOnAccent }]}>
          OPP TURN
        </ThemedText>
      </Pressable>
    </View>
  );
};

function createStyles(sizeClass: SizeClass, isCompactHeight: boolean) {
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
      minHeight: scaleBySizeClass(getFooterActionHeight(isCompactHeight), sizeClass),
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
