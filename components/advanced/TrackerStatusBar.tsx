import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface TrackerStatusBarProps {
  pointIsOver: boolean;
  oppHasDisc: boolean;
  passChainText: string;
}

export const TrackerStatusBar = ({
  pointIsOver,
  oppHasDisc,
  passChainText,
}: TrackerStatusBarProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.statusBar}>
      {pointIsOver ? (
        <ThemedText style={[styles.passChainText, { color: palette.success }]}>
          POINT OVER — START THE NEXT POINT
        </ThemedText>
      ) : oppHasDisc ? (
        <View
          style={[
            styles.oppDiscBanner,
            { backgroundColor: palette.danger + '20', borderColor: palette.danger + '40' },
          ]}>
          <MaterialCommunityIcons
            name="swap-horizontal"
            size={scaleBySizeClass(18, sizeClass)}
            color={palette.danger}
          />
          <ThemedText style={[styles.oppDiscText, { color: palette.danger }]}>
            Opp Has Disc — Tap A Player To Intercept
          </ThemedText>
        </View>
      ) : (
        <ThemedText style={[styles.passChainText, { color: palette.textMuted }]}>
          {passChainText || 'TAP A PLAYER TO PICK UP DISC'}
        </ThemedText>
      )}
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    statusBar: {
      minHeight: 64,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 8,
    },
    passChainText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    oppDiscBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 20,
      borderCurve: 'continuous',
      borderWidth: 1.5,
    },
    oppDiscText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.extraBold,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
  });
}
