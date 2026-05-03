import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { TurnoverEventInfo } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface TurnoverHeaderProps {
  event: TurnoverEventInfo;
}

export const TurnoverHeader = ({ event }: TurnoverHeaderProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const color = event.isFocusTurnover ? palette.danger : palette.success;

  let responsibleContent: React.ReactNode = null;
  if (event.isDropWithSplitAttribution && event.throwerName && event.responsibleName) {
    responsibleContent = (
      <>
        <ThemedText numberOfLines={1} style={[styles.label, { color }]}>
          {event.throwerName}
        </ThemedText>
        <ThemedText style={[styles.sep, { color }]}>+</ThemedText>
        <ThemedText numberOfLines={1} style={[styles.bold, { color }]}>
          {event.responsibleName}
        </ThemedText>
        <ThemedText style={[styles.sep, { color }]}>·</ThemedText>
      </>
    );
  } else if (event.responsibleName) {
    responsibleContent = (
      <>
        <ThemedText numberOfLines={1} style={[styles.bold, { color }]}>
          {event.responsibleName}
        </ThemedText>
        <ThemedText style={[styles.sep, { color }]}>·</ThemedText>
      </>
    );
  }

  return (
    <View style={styles.row}>
      {responsibleContent}
      <ThemedText numberOfLines={1} style={[styles.label, { color }]}>
        {event.label}
      </ThemedText>
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 1,
    },
    bold: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(13, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    label: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(12, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    sep: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(12, sizeClass),
    },
  });
}
