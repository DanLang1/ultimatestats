import { ThemedText } from '@/components/ThemedText';
import { TimeoutButton } from '@/components/advancedTracking/scoreBar/TimeoutButton';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { SideTimeoutState } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ScoreBarFooterProps {
  focusTimeouts: SideTimeoutState;
  oppTimeouts: SideTimeoutState;
  ratioLabel: string | null;
  currentPointNumber: number;
  onFocusTimeout: () => void;
  onOppTimeout: () => void;
}

export function ScoreBarFooter({
  focusTimeouts,
  oppTimeouts,
  ratioLabel,
  currentPointNumber,
  onFocusTimeout,
  onOppTimeout,
}: ScoreBarFooterProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View
      style={[styles.overlay, { backgroundColor: palette.primary, borderColor: palette.border }]}>
      <View style={{ height: 1, backgroundColor: palette.border }} />
      <View style={styles.row}>
        <TimeoutButton
          label="Home TO"
          state={focusTimeouts}
          color={palette.accent}
          onPress={onFocusTimeout}
        />

        <View
          style={[
            styles.action,
            { borderLeftWidth: 1, borderLeftColor: palette.border },
            { borderRightWidth: 1, borderRightColor: palette.border },
          ]}>
          <MaterialCommunityIcons
            name="flag-outline"
            size={scaleBySizeClass(22, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText style={[styles.centerLabel, { color: palette.textInverse }]}>
            {ratioLabel
              ? `${ratioLabel} · Point ${currentPointNumber}`
              : `Point ${currentPointNumber}`}
          </ThemedText>
        </View>

        <TimeoutButton
          label="Away TO"
          state={oppTimeouts}
          color={palette.success}
          onPress={onOppTimeout}
        />
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: '100%',
      left: 10,
      right: 10,
      marginTop: -1,
      borderWidth: 1,
      borderTopWidth: 0,
      borderBottomLeftRadius: 22,
      borderBottomRightRadius: 22,
      borderCurve: 'continuous',
      overflow: 'hidden',
      zIndex: 20,
    },
    row: {
      flexDirection: 'row',
      minHeight: 96,
    },
    action: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 14,
    },
    centerLabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.5,
    },
  });
}
